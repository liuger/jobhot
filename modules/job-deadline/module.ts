// job-deadline：报名截止倒计时。扫招聘类公告，抽出报名截止日期，/deadline 页按剩余天数排列。
import { defineModule } from "@aihot/contracts/modules";

export default defineModule({
  name: "job-deadline",
  pages: [{ path: "deadline", file: "page.tsx" }],
  apiPaths: [/^\/api\/jobs\//],
});
