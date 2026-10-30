// What the site's modules add to the web pages (site/modules/index.ts).
import type { WebModule } from "@aihot/web/modules";
import digestSubscribe from "../../modules/digest-subscribe/web.tsx";
import jobDeadline from "../../modules/job-deadline/web.tsx";

export const WEB_MODULES: readonly WebModule[] = [jobDeadline, digestSubscribe];
