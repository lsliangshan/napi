import Koa from "koa";
import { createContext } from "../services/puppeteer";
import { PuppeteerTaskType } from "../puppeteer/types";
import clusterManager from "../puppeteer/cluster/index";

// import { v4 as uuidv4 } from 'uuid';
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
export interface CrawlerjetThirdLoginHandlerOptions {
  type: "zhaopin" | "boss" | string;
  sessionId: string;
  // 验证码
  code: string;
}

export interface CrawlerjetThirdGetSmsCodeHandlerOptions {
  type: "zhaopin" | "boss" | string;
  phonenum?: string;
}

export interface CrawlerjetThirdQrcodeLoginHandlerOptions {
  type: "zhaopin" | "boss" | string;
}

export interface CrawlerjetGetDailyPositionsHandlerOptions {
  type: "zhaopin" | "boss" | string;
  cookies: any;
  city?: string;
  job?: string;
}

export interface CrawlerjetDeliverHandlerOptions {
  type: "zhaopin" | "boss" | string;
  cookies: any;
  // 职位编号
  numbers: string[];
}

export interface CrawlerjetAutoDeliverDailyPositionsHandlerOptions {
  type: "zhaopin" | "boss" | string;
  cookies: any;
  city: string;
  job: string;
}

export interface CrawlerjetValidateLoginStatusHandlerOptions {
  type: "zhaopin" | "boss" | string;
  cookies: any;
}

/**
 * 获取验证码
 */
export const crawlerjetThirdGetSmsCodeHandler = async (ctx: Koa.Context) => {
  const params = ctx.request.body as CrawlerjetThirdGetSmsCodeHandlerOptions;

  try {
    const result = await clusterManager.executeTask(
      PuppeteerTaskType.getSmsCode,
      {
        type: params.type,
        phonenum: params.phonenum,
      }
    );

    ctx.body = { ...result };
  } catch (_) {
    ctx.body = { code: 1003, message: "获取验证码失败" };
  }
};

/**
 * 登录第三方平台
 */
export const crawlerjetThirdLoginHandler = async (ctx: Koa.Context) => {
  const params = ctx.request.body as CrawlerjetThirdLoginHandlerOptions;

  try {
    const result = await clusterManager.executeTask(
      PuppeteerTaskType.loginThirdPlatform,
      {
        type: params.type,
        sessionId: params.sessionId,
        code: params.code,
      }
    );

    ctx.body = { ...result };
  } catch (_) {
    ctx.body = { code: 1003, message: "登录失败" };
  }
};

function handleBossQrcodeLogin(
  page: any,
  params: CrawlerjetThirdQrcodeLoginHandlerOptions
): Promise<string> {
  return new Promise(async (resolve) => {
    try {
      await page.goto("https://www.zhipin.com/web/user", {
        timeout: 0,
        waitUntil: ["load", "domcontentloaded", "networkidle0", "networkidle2"],
      });

      // 1. 选择我要找工作
      await page.waitForSelector("[ka='signup_geek_tab_click']");
      await page.click("[ka='signup_geek_tab_click']");

      // 2. 选择微信扫码登录
      await page.waitForSelector(".wx-login-area .wx-login-btn");
      await page.click(".wx-login-area .wx-login-btn");

      await sleep(1000);

      // 3. 获取微信小程序码
      await page.waitForSelector(".mini-qrcode");
      const miniQrcode = await page.$eval(".mini-qrcode", (el: any) => el.src);

      resolve(miniQrcode);
    } catch (error) {
      resolve("");
    }
  });
}

export const crawlerjetThirdQrcodeLoginHandler = async (ctx: Koa.Context) => {
  const TIMEOUT = 30 * 60 * 1000;
  ctx.request.socket.setTimeout(TIMEOUT);
  ctx.set({
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  ctx.respond = false; // ⚠️ 阻止 Koa 自动处理响应
  ctx.status = 200;

  const stream = ctx.res;

  const params =
    ctx.query as unknown as CrawlerjetThirdQrcodeLoginHandlerOptions;

  const { context, page } = await createContext();

  async function closePage() {
    if (page && !page.isClosed) {
      await page.close();
    }
  }

  const ping = setInterval(() => ctx.res.write(":ping\n\n"), 15000);
  
  try {
    let miniQrcode = "";
    
    if (params.type === "boss") {
      miniQrcode = await handleBossQrcodeLogin(page, params);
    }
    if (miniQrcode) {
      // 获取到小程序码
      stream.write(
        `data: ${JSON.stringify({ code: 200, eventName: 'init-qrcode', data: { miniQrcode } })}\n\n`
      );
    }

    const responsePromise = page.waitForResponse(
      (response: any) =>
        response
          .url()
          .includes("www.zhipin.com/wapi/zppassport/qrcode/loginConfirm") &&
        response.status() === 200,
        {
          timeout: TIMEOUT,
        }
    );
    // 等待获取到响应
    const response = await responsePromise;

    // 从响应中获取JSON数据
    const jsonData = await response.json();

    const userInfoResponsePromise = page.waitForResponse(
      (response: any) =>
        response
          .url()
          .includes("www.zhipin.com/wapi/zpuser/wap/getUserInfo.json") &&
        response.status() === 200,
        {
          timeout: TIMEOUT,
        }
    );
    // 等待获取到响应
    const userInfoResponse = await userInfoResponsePromise;

    // 从响应中获取JSON数据
    const userInfoJsonData = await userInfoResponse.json();
    
    const cookies = await page.cookies();

    stream.write(
      `data: ${JSON.stringify({ code: 200, eventName: 'login-result', data: { username: encodeURIComponent(userInfoJsonData.zpData.name || ''), avatar: encodeURIComponent(userInfoJsonData.zpData.largeAvatar || ''), userId: userInfoJsonData.zpData.userId || '' }, cookies })}\n\n`
    );
    await closePage();
    stream.end();
    ctx.req.on("close", async () => {
      clearInterval(ping);
      await closePage();
      stream.end();
    });

    ctx.req.on("error", async () => {
      clearInterval(ping);
      await closePage();
      stream.end();
    });
  } catch (e) {
    stream.write(
      `data: ${JSON.stringify({ code: 1003, eventName: 'login-result', message: "登录失败" })}\n\n`
    );
    await closePage();
    stream.end();
  }
  // // 返回永不 resolve 的 promise，保持连接
  // return new Promise(() => {});
};

/**
 * 投递职位
 */
export const crawlerjetDeliverHandler = async (ctx: Koa.Context) => {
  const params = ctx.request.body as CrawlerjetDeliverHandlerOptions;

  try {
    const result = await clusterManager.executeTask(PuppeteerTaskType.deliver, {
      type: params.type,
      cookies: params.cookies,
      numbers: params.numbers,
    });

    ctx.body = { ...result };
  } catch (_) {
    ctx.body = { code: 1003, message: "获取验证码失败" };
  }
};

/**
 * 自动投递每日职位
 */
export const crawlerjetAutoDeliverDailyPositionsHandler = async (
  ctx: Koa.Context
) => {
  const params = ctx.request
    .body as CrawlerjetAutoDeliverDailyPositionsHandlerOptions;

  try {
    const result = await clusterManager.executeTask(
      PuppeteerTaskType.autoDeliverDailyPositions,
      {
        type: params.type,
        cookies: params.cookies,
        city: params.city,
        job: params.job,
      }
    );

    ctx.body = { ...result };
  } catch (_) {
    ctx.body = { code: 1003, message: "自动投递每日职位失败" };
  }
};

/**
 * 验证登录态
 */
export const crawlerjetValidateLoginStatusHandler = async (
  ctx: Koa.Context
) => {
  const params = ctx.request
    .body as CrawlerjetValidateLoginStatusHandlerOptions;

  try {
    const result = await clusterManager.executeTask(
      PuppeteerTaskType.validateLoginStatus,
      {
        type: params.type,
        cookies: params.cookies || [],
      }
    );

    ctx.body = { ...result };
  } catch (_) {
    ctx.body = { code: 1003, message: "验证登录态失败" };
  }
};

/**
 * 获取每日职位
 */
export const crawlerjetGetDailyPositionsHandler = async (ctx: Koa.Context) => {
  const params = ctx.request.body as CrawlerjetGetDailyPositionsHandlerOptions;

  try {
    const result = await clusterManager.executeTask(
      PuppeteerTaskType.getDailyPosition,
      {
        type: params.type,
        city: params.city,
        job: params.job,
        cookies: params.cookies || [],
      }
    );

    ctx.body = { ...result };
  } catch (_) {
    ctx.body = { code: 1003, message: "获取职位列表失败" };
  }
};
