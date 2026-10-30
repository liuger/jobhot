// job-deadline 的抽取规则：报名截止日期与招聘单位。
// 重点是两类错：①把公告的发布日期当成报名截止日期（会让人以为还能投）；②把不存在的日历日
// （如 2 月 30 日）写进库（页面会显示「还有 N 天」的假倒计时）。
import assert from "node:assert/strict";
import { test } from "node:test";

import { extractCompany, extractDeadline, toIso } from "../extract.ts";

test("显式写明截止时间的句子", () => {
  assert.equal(extractDeadline("报名截止时间为2026年11月30日17:00。"), "2026-11-30");
  assert.equal(extractDeadline("报名截止日期：2026-11-03"), "2026-11-03");
  assert.equal(extractDeadline("报名截止至2026.11.30"), "2026-11-30");
  assert.equal(extractDeadline("请于2026年12月1日前提交材料"), "2026-12-01");
});

test("只给报名区间时取结束日，年份缺省沿用开始日", () => {
  assert.equal(extractDeadline("网上报名时间：2026年11月1日9:00至11月15日17:00"), "2026-11-15");
  assert.equal(extractDeadline("报名时间：2026年9月20日至2026年10月20日"), "2026-10-20");
  assert.equal(extractDeadline("应聘时间：2026年10月26日至10月31日"), "2026-10-31");
});

test("不把公告发布日期当成截止日期", () => {
  const text = "本公告发布于2026年10月20日。报名时间为2026年11月1日至11月30日。";
  assert.equal(extractDeadline(text), "2026-11-30");
});

test("没有日期或日期非法时返回 null，不猜", () => {
  assert.equal(extractDeadline("招聘多人，待遇面议，欢迎投递。"), null);
  assert.equal(extractDeadline("报名截止时间：2026年2月30日"), null);
  assert.equal(extractDeadline("报名截止时间：2025年13月1日"), null);
});

test("toIso 拒绝不存在的日历日", () => {
  assert.equal(toIso(2026, 2, 30), null);
  assert.equal(toIso(2026, 2, 28), "2026-02-28");
  assert.equal(toIso(2024, 2, 29), "2024-02-29");
  assert.equal(toIso(2019, 5, 1), null, "早于 2020 年的一律不要");
});

test("招聘单位从标题里取到公告主体", () => {
  const a = extractCompany("北京市顺义区卫生健康委员会2026年第三批公开招聘事业单位工作人员公告");
  assert.ok(a && a.includes("卫生健康委员会"), `实际得到：${a}`);
  const b = extractCompany("中国石油天然气集团有限公司2027届校园招聘");
  assert.ok(b && b.includes("中国石油"), `实际得到：${b}`);
  assert.equal(extractCompany("求职经验：我的秋招复盘"), null);
});

test("真实公告标题里的单位名不被批次、季节、届别污染", () => {
  // 这四条取自国聘与人社局的真实标题格式；线上跑出来的第一版把单位名削成了空值
  assert.equal(extractCompany("国家电网有限公司2027届高校毕业生第一批招聘公告"), "国家电网有限公司");
  assert.equal(extractCompany("中国移动通信集团2027年秋季校园招聘公告"), "中国移动通信集团");
  assert.equal(extractCompany("华润集团2027届暑期实习生招聘公告"), "华润集团");
  assert.equal(extractCompany("江苏省属事业单位2026年下半年统一公开招聘公告"), "江苏省属事业单位");
});
