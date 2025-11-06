import Router from "koa-router";

import {
  crawlerjetAutoDeliverDailyPositionsHandler,
  crawlerjetDeliverHandler,
  crawlerjetGetDailyPositionsHandler,
  crawlerjetThirdGetSmsCodeHandler,
  crawlerjetThirdLoginHandler,
  crawlerjetThirdQrcodeLoginHandler,
  crawlerjetValidateLoginStatusHandler,
} from "../controllers/crawlerjet";
import { healthHandler } from "../controllers";
// import { delegateHandler } from "../controllers/delegate";

const router = new Router();

router.get("/health", healthHandler);

router.post("/crawlerjet/third/get-sms-code", crawlerjetThirdGetSmsCodeHandler);
router.post("/crawlerjet/third/login", crawlerjetThirdLoginHandler);
router.get("/crawlerjet/third/qrcode/login", crawlerjetThirdQrcodeLoginHandler);
router.post(
  "/crawlerjet/get/daily/positions",
  crawlerjetGetDailyPositionsHandler
);
router.post("/crawlerjet/deliver", crawlerjetDeliverHandler);
router.post(
  "/crawlerjet/validate/login/status",
  crawlerjetValidateLoginStatusHandler
);
router.post(
  "/crawlerjet/auto/deliver/daily/positions",
  crawlerjetAutoDeliverDailyPositionsHandler
);

export default router;

// 不需要权限验证的路由
export const whitelistRoutes = ["/health"];
