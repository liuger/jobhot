// job-deadline 的抽取逻辑：从公告文本里找报名截止日期、从标题里粗略取招聘单位。
// 单独放在这里而不是 server.ts，是为了能脱离数据库直接测（见 tests/extract.test.ts）。
//
// 为什么用正则而不是大模型：截止日期是强格式字段，公告里的写法高度固定（「报名截止时间：X年X月X日」
// 「报名时间 A 至 B」），正则比模型更稳、零成本，并且抽错了能人工复核。模型只负责分类和写标题摘要。

/** 只扫这五类；攻略稿没有截止日期，不参与。 */
export const CATEGORIES = ["soe", "public", "returnee", "esg", "intern"] as const;

/** 显式写「截止」的句子优先级最高。 */
const EXPLICIT: readonly RegExp[] = [
  // 报名截止时间：2026年11月30日 / 截止日期 2026-11-30 / 报名截止至2026.11.30
  /截止(?:时间|日期|日|报名|接收|受理)?[^0-9]{0,8}(\d{4})\s*[-年/.]\s*(\d{1,2})\s*[-月/.]\s*(\d{1,2})/,
  // 2026年11月30日17:00前 / 2026-11-30 截止
  /(\d{4})\s*[-年/.]\s*(\d{1,2})\s*[-月/.]\s*(\d{1,2})\s*日?\s*(?:\d{1,2}\s*[:：]\s*\d{2})?\s*(?:前|截止|止)/,
];

/**
 * 没写「截止」，但写了报名区间时，取区间的结束日。
 * 开始日和「至」之间常夹着具体时刻（「11月1日9:00至11月15日17:00」），所以中间允许一段短文本。
 */
const RANGE =
  /(?:报名|应聘|投递|申请|网申|网上报名)(?:时间|期限|日期)?[^0-9]{0,16}(\d{4})\s*[-年/.]\s*(\d{1,2})\s*[-月/.]\s*(\d{1,2})\s*日?[\s\S]{0,12}?(?:至|—|–|-|~|到|起至|截至)[\s\S]{0,6}?(?:(\d{4})\s*[-年/.]\s*)?(\d{1,2})\s*[-月/.]\s*(\d{1,2})/;

/**
 * 把年月日变成 ISO 日期字符串，顺带校验日期真实存在（2 月 30 日这类抽错不写库）。
 * 校验方式是把日期交给 Date 再读回来，不一致就说明日期非法。
 */
export function toIso(y: number, m: number, d: number): string | null {
  if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) return null;
  if (y < 2020 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return null;
  const iso = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const back = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(back.getTime()) || back.toISOString().slice(0, 10) !== iso) return null;
  return iso;
}

/** 从公告文本里抽报名截止日期；抽不到返回 null（宁可不显示，也不猜）。 */
export function extractDeadline(text: string): string | null {
  for (const re of EXPLICIT) {
    const m = re.exec(text);
    if (m) {
      const iso = toIso(Number(m[1]), Number(m[2]), Number(m[3]));
      if (iso) return iso;
    }
  }
  const r = RANGE.exec(text);
  if (r) {
    // 结束日没写年份时，沿用开始日的年份
    const iso = toIso(Number(r[4] ?? r[1]), Number(r[5]), Number(r[6]));
    if (iso) return iso;
  }
  return null;
}

/** 标题里截出招聘单位之后，尾巴上这些批次、年份、季节与身份修饰要去掉。 */
const TITLE_TAIL = /(?:20\d{2}\s*年?|20\d{2}\s*届|\d{2}\s*届|第[一二三四五六七八九十]+批|上半年|下半年|年度?|[春秋]\s*季|暑期|寒假|高校?毕业生|毕业生|实习生|校园|社会|公开|统一)\s*$/;

/** 从标题里取招聘单位：截在「招聘/招考/选聘/引进」之前，去掉「关于」开头和年份、批次尾巴。 */
export function extractCompany(title: string): string | null {
  const kw = /公开招聘|校园招聘|社会招聘|招聘|招考|选聘|人才引进|引才/.exec(title);
  if (!kw) return null;
  // 按关键词位置切片，而不是用懒惰量词一路回溯——后者会把单位名截短
  let head = title.slice(0, kw.index).replace(/^关于/, "").trim();
  while (TITLE_TAIL.test(head)) head = head.replace(TITLE_TAIL, "").trim();
  head = head.replace(/^20\d{2}\s*年?\s*/, "").trim();
  return head.length >= 2 ? head.slice(0, 40) : null;
}
