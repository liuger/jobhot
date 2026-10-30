// The backend of the site's modules, installed by the api and the worker when they start (site/modules/index.ts).
import type { ServerModule } from "@aihot/backend/modules";

import { FEEDBACK_NOTIFY_MODULE } from "../../modules/feedback-notify/server.ts";
import { DIGEST_SUBSCRIBE_MODULE } from "../../modules/digest-subscribe/server.ts";
import { JOB_DEADLINE_MODULE } from "../../modules/job-deadline/server.ts";
import { OPS_ALERT_MODULE } from "../../modules/ops-alert/server.ts";

export const SERVER_MODULES: readonly ServerModule[] = [FEEDBACK_NOTIFY_MODULE, DIGEST_SUBSCRIBE_MODULE, JOB_DEADLINE_MODULE, OPS_ALERT_MODULE];
