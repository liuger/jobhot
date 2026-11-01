import { tag } from './setup.ts';
import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { closeDb, sql } from '@aihot/backend/db';
import { loadCompanyStrip, loadHotCompanies } from '@aihot/backend/publication/companies';

// Failure cases: a second channel's positions don't count toward the company; the best tier doesn't win
// the tie; an out-of-window position inflates the count; the strip keeps ranks.

const t = `companies-${tag()}`;
after(closeDb);

let n = 0;
/** One listed position from `source` (tier may be null), published `ageHours` ago. */
async function seed(source: string, tier: string | null, ageHours: number) {
  const id = `${t}-${++n}`;
  await sql`INSERT INTO sources (id,name,kind,tier,participation_mode,next_fetch_at)
    VALUES (${id},${source},'json_list',${tier},'editorial','2100-01-01')`;
  await sql`INSERT INTO articles (id,source_id,identity_key,url,title,discovered_at,timeline_at)
    VALUES (${id},${id},${id},${'https://example.org/' + id},${source},now(),now())`;
  await sql`INSERT INTO publications (article_id,source_id,title,url,timeline_at,discovered_at,published_at,sort_at,body_mode,eligible,channel)
    VALUES (${id},${id},${source + ' 的岗位'},${'https://example.org/' + id},
      now() - make_interval(hours => ${ageHours}),now(),now() - make_interval(hours => ${ageHours}),
      now() - make_interval(hours => ${ageHours}),'summary',true,'news')`;
  return id;
}

test('companies aggregate their channels, tie-break by tier, and drop out-of-window positions', async () => {
  // 甲：两个渠道（社招 T2 + 校招 T1），窗口内 3 个岗位。
  await seed(`${t}-甲·社会招聘`, 'T2', 2);
  await seed(`${t}-甲·校园招聘`, 'T1', 3);
  await seed(`${t}-甲·社会招聘`, 'T2', 1);
  // 乙：同样 3 个岗位，但只有一个 T2 渠道——排在甲后面。
  await seed(`${t}-乙·社会招聘`, 'T2', 1);
  await seed(`${t}-乙·社会招聘`, 'T2', 2);
  await seed(`${t}-乙·社会招聘`, 'T2', 3);
  // 丙：窗口内 1 个，另一个 70 小时前的不计。
  await seed(`${t}-丙·社会招聘`, 'T1', 5);
  await seed(`${t}-丙·社会招聘`, 'T1', 70);
  // 丁：ARCHIVE 归档源（无日期、批量回填），岗位再多也不上榜。
  await seed(`${t}-丁·社会招聘`, 'ARCHIVE', 1);
  await seed(`${t}-丁·社会招聘`, 'ARCHIVE', 2);
  await seed(`${t}-丁·社会招聘`, 'ARCHIVE', 3);
  await seed(`${t}-丁·社会招聘`, 'ARCHIVE', 4);

  const board = await loadHotCompanies();
  const names = board.entries.map((e) => e.company);
  assert.deepEqual(names, [`${t}-甲`, `${t}-乙`, `${t}-丙`]);
  assert.ok(!names.includes(`${t}-丁`), 'ARCHIVE 归档源不该上热招榜');
  assert.deepEqual(board.entries.map((e) => e.positions), [3, 3, 1]);
  assert.deepEqual(board.entries.map((e) => e.tier), ['T1', 'T2', 'T1']);
  // 甲的最新岗位是 1 小时前那个（社招渠道）。
  assert.equal(board.entries[0]!.latest.title, `${t}-甲·社会招聘 的岗位`);
  assert.ok(board.windowHours === 48 && board.computedAt);

  const strip = await loadCompanyStrip();
  assert.deepEqual(strip?.map((e) => e.rank), [1, 2, 3]);
  assert.equal(strip![0]!.sourceNames.length, 2);
});
