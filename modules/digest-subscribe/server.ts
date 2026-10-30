// digest-subscribe 后端：订阅/确认/退订接口 + 每天 08:10 把最新日报发给已确认的订户。
import { randomBytes } from "node:crypto";
import nodemailer from "nodemailer";
import type { FastifyInstance } from "fastify";
import { credential } from "@aihot/backend/config";
import { sql } from "@aihot/backend/db";
import { defineServerModule } from "@aihot/backend/modules";
import { SITE } from "@aihot/site";

interface DigestItem {
  itemId?: string;
  title: string;
  summary?: string;
  sourceName?: string;
}
interface DailyContent {
  date: string;
  lead?: { title: string; leadParagraph?: string } | null;
  sections?: Array<{ label: string; summary?: string | null; items?: DigestItem[] }>;
  flashes?: DigestItem[];
}

const base = () => (process.env.SITE_URL ?? SITE.defaultUrl).replace(/\/$/, "");

function smtp() {
  const user = credential("integrations", "NOTIFY_SMTP_USER") ?? "";
  const pass = credential("integrations", "NOTIFY_SMTP_PASS") ?? "";
  const host = credential("integrations", "NOTIFY_SMTP_HOST") ?? "smtp.qq.com";
  const port = Number(credential("integrations", "NOTIFY_SMTP_PORT") ?? 465);
  return { user, pass, host, port, to: user, configured: Boolean(user && pass) };
}

async function sendMail(to: string, subject: string, text: string, html: string): Promise<void> {
  const cfg = smtp();
  if (!cfg.configured) {
    console.log(`[digest-subscribe] dry-run（未配 SMTP）：-> ${to} | ${subject}\n${text.slice(0, 300)}`);
    return;
  }
  const mailer = nodemailer.createTransport({ host: cfg.host, port: cfg.port, secure: cfg.port === 465, auth: { user: cfg.user, pass: cfg.pass } });
  await mailer.sendMail({ from: `${SITE.name} <${cfg.user}>`, to, subject, text, html });
}

const page = (title: string, body: string) => `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} · ${SITE.name}</title><style>body{font-family:system-ui,"Microsoft YaHei",sans-serif;background:#f2f3f5;color:#1c2333;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0}main{background:#fff;border:1px solid #e3e6ec;border-radius:12px;padding:36px 40px;max-width:420px;text-align:center}h1{font-size:20px;margin:0 0 10px}p{font-size:14px;color:#5a6272;line-height:1.8}a{color:#1d2c4e}</style></head><body><main>${body}</main></body></html>`;

function emailDigest(content: DailyContent): { subject: string; text: string; html: string } {
  const base = (process.env.SITE_URL ?? SITE.defaultUrl).replace(/\/$/, "");
  const lines: string[] = [];
  if (content.lead?.title) lines.push(`【头条】${content.lead.title}`, content.lead.leadParagraph ?? "", "");
  for (const s of content.sections ?? []) {
    lines.push(`◇ ${s.label}`);
    for (const it of s.items ?? []) lines.push(`· ${it.title}${it.summary ? `
  ${it.summary}` : ""}${it.itemId ? `
  ${base}/items/${it.itemId}` : ""}`);
    lines.push("");
  }
  if (content.flashes?.length) {
    lines.push("◇ 快讯");
    for (const f of content.flashes) lines.push(`· ${f.title}`);
  }
  const subject = `${SITE.name}${SITE.subject}日报 · ${content.date}`;
  const sectionHtml = (content.sections ?? []).map((s, si) => `
    <tr><td colspan="2" style="padding:18px 0 6px;font-size:14px;font-weight:700;color:#1d2c4e;letter-spacing:1px;">${si + 1}. ${s.label}</td></tr>
    ${(s.items ?? []).map((it) => `
    <tr>
      <td width="10" valign="top" style="padding:7px 0 2px;"><span style="display:inline-block;width:5px;height:5px;border-radius:50%;background:#1d2c4e;"></span></td>
      <td valign="top" style="padding:4px 0;">
        <div style="font-size:15px;font-weight:600;color:#1c2333;line-height:1.55;">${it.itemId ? `<a href="${base}/items/${it.itemId}" style="color:#1c2333;text-decoration:none;">${it.title}</a>` : it.title}</div>
        ${it.summary ? `<div style="font-size:13px;color:#5a6272;line-height:1.7;padding-top:3px;">${it.summary}</div>` : ""}
      </td>
    </tr>
    <tr><td colspan="2" style="border-bottom:1px solid #eef0f3;"></td></tr>`).join("")}`).join("");
  const flashHtml = (content.flashes ?? []).length ? `
    <tr><td colspan="2" style="padding:18px 0 6px;font-size:14px;font-weight:700;color:#1d2c4e;letter-spacing:1px;">快讯</td></tr>
    <tr><td colspan="2" style="font-size:13px;color:#5a6272;line-height:1.9;">${(content.flashes ?? []).map((f) => f.title).join("；")}</td></tr>` : "";
  const html = `<div style="background:#f2f3f5;padding:20px 10px;font-family:system-ui,-apple-system,'Segoe UI','PingFang SC','Microsoft YaHei',sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;margin:0 auto;">
    <tr><td>
      <div style="background:#16203c;border-radius:6px 6px 0 0;padding:16px 24px;">
        <span style="font-size:20px;font-weight:700;color:#fbf8f1;letter-spacing:2px;">${SITE.subject}日报</span>
        <span style="float:right;color:rgba(251,248,241,0.7);font-size:13px;padding-top:7px;">${SITE.name} · ${content.date}</span>
      </div>
      <div style="background:#ffffff;border:1px solid #e3e6ec;border-top:none;padding:22px 24px;">
        ${content.lead?.title ? `<p style="margin:0 0 4px;font-size:12px;font-weight:700;color:#d63022;letter-spacing:2px;">头条</p>
        <p style="margin:0;font-size:17px;font-weight:700;color:#1c2333;line-height:1.5;">${content.lead.title}</p>
        ${content.lead.leadParagraph ? `<p style="margin:8px 0 0;font-size:13.5px;color:#5a6272;line-height:1.8;">${content.lead.leadParagraph}</p>` : ""}` : `<p style="margin:0;font-size:14px;color:#5a6272;">${content.date}：今天没有新的日报内容。</p>`}
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${sectionHtml}${flashHtml}</table>
      </div>
      <div style="padding:14px 4px;font-size:11.5px;color:#8a92a3;">
        由 <a href="${base}" style="color:#1d2c4e;">${SITE.name}</a> 发出 · ${SITE.tagline}<br/>
        不想再收到？<a href="${base}/digest/unsubscribe?token=%%UNSUB%%" style="color:#8a92a3;">退订</a>
      </div>
    </td></tr>
  </table>
</div>`;
  return { subject, text: lines.join("\n"), html };
}

async function sendDaily(): Promise<{ sent: number; key: string }> {
  const [report] = await sql<{ key: string; content: DailyContent }[]>`SELECT key, content FROM reports WHERE kind = 'daily' ORDER BY key DESC LIMIT 1`;
  if (!report) return { sent: 0, key: "" };
  const [state] = await sql<{ last_key: string }[]>`SELECT last_key FROM digest_send_state WHERE singleton`;
  await sql`INSERT INTO digest_send_state (singleton) VALUES (true) ON CONFLICT DO NOTHING`;
  if (state?.last_key === report.key) return { sent: 0, key: report.key }; // 这一期已发过
  const subs = await sql<{ email: string }[]>`SELECT email FROM digest_subscribers WHERE confirmed_at IS NOT NULL AND unsubscribed_at IS NULL`;
  if (subs.length === 0) return { sent: 0, key: report.key };
  const { subject, text, html } = emailDigest(report.content);
  const cfg = smtp();
  const footer = `\n\n——\n不想再收到？退订：`;
  let sent = 0;
  for (const s of subs) {
    try {
      // 逐个发送（订户量小），每封带独立退订链接
      const [row] = await sql<{ token: string }[]>`SELECT token FROM digest_subscribers WHERE email = ${s.email}`;
      const unsub = `退订请访问：${base()}/digest/unsubscribe?token=${row?.token ?? ""}`;
      await sendMail(s.email, subject, text + footer + "\n" + unsub, html);
      sent += 1;
    } catch (e) {
      console.log(`[digest-subscribe] 发送失败 ${s.email}: ${String(e).slice(0, 80)}`);
    }
  }
  await sql`UPDATE digest_send_state SET last_key = ${report.key}, sent_count = ${sent}, updated_at = now() WHERE singleton`;
  return { sent, key: report.key };
}

export const DIGEST_SUBSCRIBE_MODULE = defineServerModule({
  name: "digest-subscribe",
  http: (app: FastifyInstance) => {
    app.post("/api/digest/subscribe", async (req, reply) => {
      const body = (req.body ?? {}) as { email?: unknown };
      const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) {
        return reply.code(400).header("content-type", "application/json").send({ ok: false, error: "邮箱格式不正确" });
      }
      const token = randomBytes(16).toString("hex");
      await sql`INSERT INTO digest_subscribers (email, token) VALUES (${email}, ${token})
        ON CONFLICT (email) DO UPDATE SET token = ${token}, unsubscribed_at = NULL`;
      const link = `${base()}/digest/confirm?token=${token}`;
      try {
        await sendMail(
          email,
          `确认订阅 ${SITE.name}${SITE.subject}日报`,
          `你好！\n\n点击下面的链接确认订阅${SITE.name}每日${SITE.subject}日报（每天早上随日报发出）：\n${link}\n\n如果这不是你本人的操作，忽略本邮件即可。`,
          `<div style="background:#f2f3f5;padding:24px 10px;font-family:system-ui,'Microsoft YaHei',sans-serif;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;"><tr><td style="background:#ffffff;border:1px solid #e3e6ec;padding:26px 28px;"><p style="font-size:20px;font-weight:700;color:#16203c;letter-spacing:1px;margin:0 0 12px;">订阅确认 · ${SITE.name}</p><p style="font-size:14px;color:#1c2333;line-height:1.8;margin:0 0 18px;">点击下面的按钮，确认订阅<strong>每日${SITE.subject}日报</strong>（每天早上随日报发出，一封读得完）。</p><p style="margin:0 0 16px;"><a href="${link}" style="display:inline-block;background:#16203c;color:#fbf8f1;padding:11px 30px;border-radius:4px;text-decoration:none;font-size:15px;font-weight:700;">确认订阅</a></p><p style="margin:0;font-size:12px;color:#8a92a3;">不是你本人的操作？忽略本邮件即可。</p></td></tr></table></div>`,
        );
      } catch (e) {
        return reply.code(500).header("content-type", "application/json").send({ ok: false, error: "确认邮件发送失败，请稍后再试" });
      }
      return reply.header("content-type", "application/json").send({ ok: true });
    });
    app.get("/digest/confirm", async (req, reply) => {
      const token = String((req.query as { token?: string }).token ?? "");
      const [row] = await sql<{ email: string }[]>`UPDATE digest_subscribers SET confirmed_at = now(), unsubscribed_at = NULL WHERE token = ${token} RETURNING email`;
      return reply.type("text/html; charset=utf-8").send(page("订阅成功", row
        ? `<h1>订阅成功 ✓</h1><p>${row.email} 将在每天早上收到${SITE.name}${SITE.subject}日报。</p>`
        : `<h1>链接无效</h1><p>这个确认链接不存在或已过期，请重新订阅。</p>`));
    });
    app.get("/digest/unsubscribe", async (req, reply) => {
      const token = String((req.query as { token?: string }).token ?? "");
      const [row] = await sql<{ email: string }[]>`UPDATE digest_subscribers SET unsubscribed_at = now() WHERE token = ${token} RETURNING email`;
      return reply.type("text/html; charset=utf-8").send(page("已退订", row
        ? `<h1>已退订</h1><p>${row.email} 不会再收到日报邮件。欢迎随时回来重新订阅。</p>`
        : `<h1>链接无效</h1><p>没有找到对应的订阅。</p>`));
    });
  },
  schedules: [
    { name: "digest-subscribe.send", cron: "10 8 * * *", run: sendDaily },
  ],
});
