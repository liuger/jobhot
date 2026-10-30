<div align="center">

# jobhot

**央国企校招、事业单位、留学生与 ESG 岗位 · 基于 [AIHOT](https://github.com/KKKKhazix/AIHOT) 开源引擎的求职信息站**

*把还能投的岗位，摆在你还来得及的时候*

[License: MIT](LICENSE) · [上游引擎 AIHOT](https://github.com/KKKKhazix/AIHOT)

</div>

---

## 这是什么

jobhot 是一个求职信息站：从已接入的招聘信源采集公告，用大模型两次独立评分做精选，抽出公司、岗位、届别、学历和报名截止日期，每天 08:00（北京时间）出一份求职日报。周一 10:00 出周报，每月 1 日 10:30 出月报。

站名在 [`site/site.ts`](site/site.ts) 里，注释标明 **jobhot 是占位名**。正式上线前改这一处即可，公开接口前缀 `jobhot_` 和分类 key 上线后不要再改。

它跑在 [AIHOT](https://github.com/KKKKhazix/AIHOT) 引擎上。换行业主要改 [`industry/`](industry/) 和 [`site/`](site/)，步骤见 [docs/customize.md](docs/customize.md)。

## 覆盖什么

六个分类（key 在 [`industry/taxonomy.ts`](industry/taxonomy.ts)，上线后不可改）：

| key | 名称 |
|---|---|
| `soe` | 央国企校招 |
| `public` | 事业单位 |
| `returnee` | 留学生专场 |
| `esg` | ESG 双碳 |
| `intern` | 日常实习 |
| `guide` | 求职攻略 |

标签另有季节（秋招 / 春招 / 暑期实习）、届别、岗位性质、学历门槛和省份。报头不按单一类别计数（`RELEASE` 为 `null`）。

## 信源

[`industry/sources.json`](industry/sources.json) 首批只导入两条已实测可用的信源：

- 国聘·招聘公告（`iguopin-notice`，JSON 接口）
- 北京市人社局事业单位公开招聘栏目（`bj-rsj-sydw`）

其余省厅、集团招聘子站和公众号，要在后台 `/admin/sources/new` 逐条验证选择器后再加。选择器错误的信源会持续报错并刷满告警。BOSS 直聘、猎聘、智联、实习僧明确禁止抓取，不要接入。

## 相比上游的本站改动

| | 内容 |
|---|---|
| 行业包 | 求职分类、标签、提示词、精选门槛；首批 2 条信源 |
| 报名截止 | `modules/job-deadline`：抽取截止日期，`/deadline` 按剩余天数排列，三天内标红 |
| 邮件订阅 | `modules/digest-subscribe`：读者订阅日报 |
| 反馈与告警 | `modules/feedback-notify`、`modules/ops-alert`（仓库内有实现；当前 [`site/modules/index.ts`](site/modules/index.ts) 启用的是截止倒计时和邮件订阅） |

上游文档里的环保站截图（`docs/assets/`）不是本站界面，不要当成 jobhot 的效果图。

## 快速开始

> 需要：Docker、Node.js 24.11+、一个 OpenAI 兼容的大模型 API Key

```bash
git clone <本仓库地址>
cd jobhot
node scripts/init-env.ts --llm-key <你的模型APIKey>
docker compose up -d --build
```

打开 http://localhost:3000（管理后台 `/admin`，密码在 `.env` 的 `ADMIN_PASSWORD`）。

邮件订阅在 `.env` 里配置 `NOTIFY_SMTP_USER` / `NOTIFY_SMTP_PASS` 后生效。微信公众号若要接入，见 [integrations/wemprss-bridge](integrations/wemprss-bridge/README.md)；默认信源清单里还没有公众号。

本地开发：

```bash
npm run db:migrate
npm run dev:api
npm run dev:worker
npm run dev:web
```

## 它是怎么工作的

```
已接入信源（当前：国聘公告接口 + 北京事业单位栏目）
    ↓ 定时采集
判重 → AI 预筛 → 两次独立评分 → 结构化（分类 / 标签 / 截止日期）
    ↓
聚簇成事件 → 按信源分级门槛精选
    ↓
每天 08:00 日报 · 周一 10:00 周报 · 每月 1 日 10:30 月报
    ↓
网站 / RSS / 公开 API / MCP / 邮件订阅 /deadline
```

提示词在 [`industry/prompts/`](industry/prompts/)。

## 目录

```
industry/            求职分类、信源、提示词、精选门槛
modules/             本站模块（job-deadline、digest-subscribe、feedback-notify、ops-alert）
site/                站名、文案、品牌、启用哪些模块
integrations/        we-mp-rss 公众号采集桥（可选，默认未导入信源）
apps/ packages/      AIHOT 引擎
docs/                引擎文档（部署 / 信源 / 精选 / 架构）；截图来自上游示例，不是本站
```

## 致谢与许可

- 引擎：[AIHOT](https://github.com/KKKKhazix/AIHOT)（MIT）。AIHOT 的名称与 Logo 不在授权范围内，访客可见界面不要使用。
- 公众号采集（可选）：[we-mp-rss](https://github.com/rachelos/we-mp-rss)
- 本仓库代码以 MIT 许可发布

