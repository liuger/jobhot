// job-deadline 的网页插口：侧栏「求职」分组里的「报名截止」入口。
import type { ReactNode } from "react";
import { defineWebModule } from "@aihot/web/modules";

const IconTimer = ({ size = 18 }: { size?: number }): ReactNode => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M10 2h4" />
    <path d="M12 14v-4" />
    <circle cx="12" cy="14" r="8" />
  </svg>
);

export default defineWebModule({
  name: "job-deadline",
  sidebar: {
    section: "求职",
    items: [{ to: "/deadline", label: "报名截止", icon: IconTimer }],
  },
});
