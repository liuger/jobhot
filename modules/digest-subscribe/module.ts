// digest-subscribe：读者邮件订阅每日求职日报。页面 /digest 留邮箱，确认后每天早上随日报收到邮件。
import { defineModule } from "@aihot/contracts/modules";

export default defineModule({
  name: "digest-subscribe",
  pages: [{ path: "digest", file: "page.tsx" }],
  apiPaths: [/^\/api\/digest\//, /^\/digest\/(confirm|unsubscribe)$/],
});
