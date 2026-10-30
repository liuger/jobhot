// JSON sources: plain JSON APIs, JSON embedded in HTML (script tags, window variables).
import { credential } from "../config.ts";
import { fetchListing } from "./listing-fetch.ts";
import { collapseWhitespace, stripTags } from "../lib/text.ts";
import { parseLooseDate } from "./dates.ts";
import { FetchError, type Candidate, type SourceRow } from "./types.ts";

export function getPath(obj: unknown, path: string): unknown {
  if (!path) return obj;
  let cur: unknown = obj;
  for (const seg of path.split(".")) {
    if (cur === null || cur === undefined) return undefined;
    if (Array.isArray(cur) && /^\d+$/.test(seg)) cur = cur[Number(seg)];
    else if (typeof cur === "object") cur = (cur as Record<string, unknown>)[seg];
    else return undefined;
  }
  return cur;
}

function firstString(obj: unknown, paths: string[] | undefined): string | null {
  for (const p of paths ?? []) {
    const v = getPath(obj, p);
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number") return String(v);
  }
  return null;
}

/** "{path}" → encoded value, "{raw:path}" → raw value. Returns null when a referenced value is missing. */
export function renderTemplate(template: string, item: unknown): string | null {
  let missing = false;
  const out = template.replace(/\{(raw:)?([^}]+)\}/g, (_m, raw: string | undefined, path: string) => {
    const v = getPath(item, path);
    if (v === undefined || v === null || v === "") {
      missing = true;
      return "";
    }
    return raw ? String(v) : encodeURIComponent(String(v)).replace(/%2F/g, "/");
  });
  return missing ? null : out;
}

/** "2026-09-30 17:43:58": a date and time without a zone, which Date.parse would read in the server's zone. */
const ZONELESS_TIME = /^\d{4}-\d{1,2}-\d{1,2}[ T]\d{1,2}:\d{2}(?::\d{2}(?:\.\d+)?)?$/;

function toDate(v: unknown, unit: string | undefined, utcOffset: string | undefined): Date | null {
  if (v === null || v === undefined || v === "") return null;
  // JSON can hold a value nothing converts ({"toString": null}, or a list of one): it is no date, and the
  // items after it are still read.
  let text: string;
  try {
    text = String(v).trim();
  } catch {
    return null;
  }
  if (unit === "epoch_ms" || unit === "epoch_s") {
    const date = new Date(Number(text) * (unit === "epoch_s" ? 1000 : 1));
    return Number.isFinite(date.getTime()) ? date : null;
  }
  // 20260922: a calendar day at UTC midnight (some list APIs give dates as yyyymmdd).
  if (unit === "yyyymmdd") {
    const m = /^(\d{4})(\d{2})(\d{2})$/.exec(text);
    const d = m ? new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00Z`) : null;
    return d && Number.isFinite(d.getTime()) && d.toISOString().startsWith(`${m![1]}-${m![2]}-${m![3]}`) ? d : null;
  }
  // A time without a zone is in the source's offset, as list pages read it; any other text as Date.parse reads it.
  if (ZONELESS_TIME.test(text)) return parseLooseDate(text, utcOffset);
  const t = Date.parse(text);
  if (Number.isFinite(t)) return new Date(t);
  // Dates a source prints with units — "2026年10月29日", "2026/10/29" — which Date.parse leaves unread.
  return parseLooseDate(text, utcOffset);
}

function findKey(obj: unknown, key: string, depth = 0): unknown {
  if (depth > 12 || obj === null || typeof obj !== "object") return undefined;
  if (!Array.isArray(obj) && key in (obj as Record<string, unknown>)) {
    const v = (obj as Record<string, unknown>)[key];
    if (Array.isArray(v)) return v;
  }
  for (const v of Object.values(obj as Record<string, unknown>)) {
    const found = findKey(v, key, depth + 1);
    if (found !== undefined) return found;
  }
  return undefined;
}

function embeddedJson(html: string, source: SourceRow): unknown {
  const mode = source.config.mode;
  if (mode === "html_window_var") {
    const name = String(source.config.windowVar);
    const re = new RegExp(`(?:window\\.)?${name.replace(/[$]/g, "\\$")}\\s*=\\s*`);
    const m = re.exec(html);
    if (!m) throw new FetchError(`window.${name} not found`);
    const start = m.index + m[0].length;
    // Balanced-brace scan to find the object literal's end.
    let depth = 0, inStr: string | null = null, esc = false;
    for (let i = start; i < html.length; i++) {
      const ch = html[i]!;
      if (inStr) {
        if (esc) esc = false;
        else if (ch === "\\") esc = true;
        else if (ch === inStr) inStr = null;
        continue;
      }
      if (ch === '"' || ch === "'") inStr = ch;
      else if (ch === "{" || ch === "[") depth++;
      else if (ch === "}" || ch === "]") {
        depth--;
        if (depth === 0) return JSON.parse(html.slice(start, i + 1));
      }
    }
    throw new FetchError(`window.${name} not terminated`);
  }
  // html_json_key: scan JSON script blocks (e.g. __NEXT_DATA__) for the key.
  const key = String(source.config.jsonKey);
  for (const m of html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)) {
    const body = m[1]!.trim();
    // Flight payloads carry the key escaped inside a string (\"items\").
    if (!body.includes(`"${key}"`) && !body.includes(`\\"${key}\\"`)) continue;
    const candidates = [body, body.replace(/^[^{[]*/, "").replace(/;?\s*$/, "")];
    for (const c of candidates) {
      try {
        const parsed = JSON.parse(c);
        const found = findKey(parsed, key);
        if (found) return { [key]: found };
      } catch {
        // Next.js flight payloads: self.__next_f.push([1,"..."])
      }
    }
    const flight = /"((?:[^"\\]|\\.)*)"\]\)\s*$/.exec(body);
    if (flight) {
      try {
        const decoded = JSON.parse(`"${flight[1]}"`) as string;
        const idx = decoded.indexOf(`"${key}"`);
        if (idx >= 0) {
          const objStart = decoded.lastIndexOf("{", idx);
          const parsed = JSON.parse(decoded.slice(objStart, decoded.indexOf("]", idx) + 1) + "}");
          const found = findKey(parsed, key);
          if (found) return { [key]: found };
        }
      } catch {
        // keep scanning
      }
    }
  }
  throw new FetchError(`embedded key ${key} not found`);
}

/** The request body for one page: the base body with the page number written at pageBodyPath. */
function pageBodyOf(base: Record<string, unknown>, path: string, page: number): Record<string, unknown> {
  const body = JSON.parse(JSON.stringify(base)) as Record<string, unknown>;
  if (path) setPath(body, path, page);
  return body;
}

/** A listing that carries only titles and links (a job board's list endpoint), whose duties live behind one
 *  request per item. `detailBody` describes that request; the fields it names are the article's body. */
interface DetailBodyRule {
  urlTemplate?: string;
  method?: string;
  bodyForm?: Record<string, string>;
  /** A JSON request body: every string is a template, built per item. */
  bodyJson?: Record<string, unknown>;
  dataPath?: string;
  bodyPaths?: string[];
  maxFetches?: number;
}

/** Copies a JSON template with every string rendered against the item ("{raw:id}" keeps the value as is). */
function renderJsonTemplate(template: unknown, item: unknown): unknown {
  if (typeof template === "string") return renderTemplate(template, item) ?? "";
  if (Array.isArray(template)) return template.map((v) => renderJsonTemplate(v, item));
  if (template && typeof template === "object") {
    return Object.fromEntries(Object.entries(template as Record<string, unknown>).map(([k, v]) => [k, renderJsonTemplate(v, item)]));
  }
  return template;
}

/** Writes a value at a dot path of a JSON object, creating the objects it needs. */
function setPath(target: Record<string, unknown>, path: string, value: unknown): void {
  const segs = path.split(".").filter(Boolean);
  let cur: Record<string, unknown> = target;
  for (const seg of segs.slice(0, -1)) {
    const next = cur[seg];
    if (!next || typeof next !== "object" || Array.isArray(next)) cur[seg] = {};
    cur = cur[seg] as Record<string, unknown>;
  }
  if (segs.length) cur[segs.at(-1)!] = value;
}

/** A source's own headers may name Content-Type in another case; two spellings of one header both survive
 * an object spread, and the server reads whichever came first. Set the type by replacing all spellings. */
function withContentType(headers: Record<string, string>, type: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [name, value] of Object.entries(headers)) if (name.toLowerCase() !== "content-type") out[name] = value;
  out["content-type"] = type;
  return out;
}

async function fillDetailBodies(source: SourceRow, out: Candidate[], items: unknown[], rule: DetailBodyRule): Promise<void> {
  const template = String(rule.urlTemplate ?? "");
  const bodyPaths = (rule.bodyPaths ?? []).map(String);
  if (!template || !bodyPaths.length) return;
  const max = Number.isFinite(Number(rule.maxFetches)) ? Math.max(1, Number(rule.maxFetches)) : 20;
  const method = String(rule.method ?? "GET").toUpperCase();
  const jsonTemplate = rule.bodyJson && typeof rule.bodyJson === "object" ? rule.bodyJson : null;
  const headers: Record<string, string> = { accept: "application/json", ...(source.config.headers ?? {}) };
  const jobs = out.slice(0, max).map((_, i) => i);
  let next = 0;
  const work = async () => {
    while (next < jobs.length) {
      const index = jobs[next++]!;
      const item = items[index];
      const url = renderTemplate(template, item);
      if (!url) continue;
      const body = method === "GET" ? undefined
        : jsonTemplate ? JSON.stringify(renderJsonTemplate(jsonTemplate, item))
        : new URLSearchParams(
          Object.entries(rule.bodyForm ?? {}).map(([k, t]) => [k, renderTemplate(t, item) ?? ""] as [string, string]),
        ).toString();
      const contentType = jsonTemplate ? "application/json" : "application/x-www-form-urlencoded";
      try {
        const res = await fetchListing(url, {
          redirectPolicy: "same-origin",
          method,
          headers: body ? withContentType(headers, contentType) : headers,
          body,
          timeoutMs: 20_000,
        });
        if (res.status !== 200) continue;
        const root = rule.dataPath ? getPath(JSON.parse(res.text()), String(rule.dataPath)) : JSON.parse(res.text());
        const parts = bodyPaths.map((p) => firstString(root, [p])).filter((v): v is string => !!v);
        if (!parts.length) continue;
        const text = stripTags(parts.join("\n\n"));
        const cand = out[index]!;
        cand.bodyText = text;
        cand.bodyStatus = "ok";
        cand.excerpt = collapseWhitespace(text).slice(0, 2000);
      } catch {
        // The listing's own fields still make a usable candidate; the body is fetched again next cycle.
      }
    }
  };
  await Promise.all([work(), work(), work(), work()]);
}

export async function fetchJsonList(source: SourceRow): Promise<Candidate[]> {
  const c = source.config;
  const url = String(c.url ?? "");
  const headers: Record<string, string> = { accept: "application/json, text/html;q=0.9", ...(c.headers ?? {}) };
  if (/^https:\/\/api\.github\.com\//.test(url)) {
    const token = credential("collectors", "GITHUB_TOKEN");
    if (token) headers.authorization = `Bearer ${token}`;
  }
  const readPage = async (target: string, page: number) => {
    const pageBody = c.bodyJson ? JSON.stringify(pageBodyOf(c.bodyJson as Record<string, unknown>, c.pageBodyPath, page)) : undefined;
    const res = await fetchListing(target, {
      redirectPolicy: "same-origin",
      method: c.method ?? "GET",
      headers: c.bodyJson ? withContentType(headers, "application/json") : headers,
      body: pageBody,
      timeoutMs: 25_000,
    });
    if (res.status !== 200) throw new FetchError(`HTTP ${res.status}`, res.status);
    return res.text();
  };
  const resolveItems = (data: unknown): unknown[] => {
    let list = c.itemsPath ? getPath(data, c.itemsPath) : c.jsonKey ? getPath(data, c.jsonKey) : data;
    if (c.itemsObjectValues && list && typeof list === "object" && !Array.isArray(list)) list = Object.values(list);
    if (!Array.isArray(list)) throw new FetchError("items path did not resolve to an array");
    return list;
  };

  // pages: a listing that pages by a query parameter and caps a page's size (a job board's fixed 15) is read
  // one page at a time; the URL's own currentPage is what moves, or — for a POST listing — the JSON body
  // field named by pageBodyPath. pageQueryParam names the URL parameter when the site does not spell it
  // currentPage (a servlet backend reading pageNo from the query string).
  const pageBodyPath = typeof c.pageBodyPath === "string" ? c.pageBodyPath : "";
  const bodyPaged = pageBodyPath !== "" && !!c.bodyJson;
  const pageParam = typeof c.pageQueryParam === "string" && c.pageQueryParam ? c.pageQueryParam : "currentPage";
  const pagePattern = new RegExp(`([?&]${pageParam.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}=)\\d+`);
  const pageCount = /^html_/.test(String(c.mode ?? "")) ? 1 : Math.max(1, Math.min(10, Number(c.pages) || 1));
  const items: unknown[] = [];
  for (let p = 1; p <= pageCount; p++) {
    const pageUrl = p === 1 ? url : url.replace(pagePattern, `$1${p}`);
    if (p > 1 && !bodyPaged && pageUrl === url) break;
    const text = await readPage(pageUrl, p);
    let data: unknown;
    if (c.mode === "html_json_key" || c.mode === "html_window_var") data = embeddedJson(text, source);
    else {
      try {
        data = JSON.parse(text);
      } catch {
        throw new FetchError("response is not JSON");
      }
    }
    const pageItems = resolveItems(data);
    items.push(...pageItems);
    if (!pageItems.length) break;
  }

  const out: Candidate[] = [];
  const used: unknown[] = [];
  for (const item of items) {
    if (c.requireBoolean && getPath(item, c.requireBoolean.path) !== c.requireBoolean.equals) continue;
    if (c.minNumeric && !(Number(getPath(item, c.minNumeric.path)) >= Number(c.minNumeric.min))) continue;
    const title = firstString(item, c.titlePaths);
    const url = (c.urlTemplate && renderTemplate(c.urlTemplate, item)) || (c.urlTemplateFallback && renderTemplate(c.urlTemplateFallback, item));
    if (!title || !url) continue;
    const externalId = c.externalIdPath ? getPath(item, c.externalIdPath) : null;
    // bodyParts: several fields that together are the body (a job's duties plus its requirements),
    // joined in the order given. They take precedence over summaryPaths when any of them has text.
    const parts = Array.isArray(c.bodyParts)
      ? (c.bodyParts as unknown[]).map((p) => firstString(item, [String(p)])).filter((v): v is string => !!v)
      : [];
    const summary = parts.length ? parts.join("\n\n") : firstString(item, c.summaryPaths);
    const summaryIsBody = (c.summaryIsBody === true || parts.length > 0) && !!summary;
    out.push({
      url,
      title: collapseWhitespace(stripTags(title)),
      author: firstString(item, c.authorPaths),
      publishedAt: toDate(getPath(item, c.publishedAtPath), c.publishedAtUnit, c.publishedAtUtcOffset),
      excerpt: summary ? collapseWhitespace(stripTags(summary)).slice(0, 2000) : null,
      bodyText: summaryIsBody ? stripTags(summary!) : null,
      bodyStatus: summaryIsBody ? "ok" : "pending",
      raw: { externalId: externalId ?? null },
    });
    used.push(item);
  }
  if (c.detailBody) await fillDetailBodies(source, out, used, c.detailBody as DetailBodyRule);
  if (items.length > 0 && out.length === 0 && !c.requireBoolean && !c.minNumeric) throw new FetchError("no items mapped (check title/url paths)");
  return out;
}
