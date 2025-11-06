import Koa from "koa";
import { createContext } from "../services/puppeteer";
import { nanoid } from "nanoid";
import { isToday } from "../utils/time";
import { PuppeteerTaskType } from "../puppeteer/types";
import clusterManager from "../puppeteer/cluster/index";
// import { v4 as uuidv4 } from 'uuid';

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

export interface CrawlerjetValidateLoginStatusHandlerOptions {
  type: "zhaopin" | "boss" | string;
  cookies: any;
}

const pageStores = new Map<string, any>();

function handleZhaopinSmsCode(
  context: any,
  page: any,
  params: CrawlerjetThirdGetSmsCodeHandlerOptions
) {
  return new Promise(async (resolve, reject) => {
    try {
      await page.goto("https://passport.zhaopin.com/login", {
        timeout: 0,
      });
      await page.waitForNavigation({ waitUntil: "domcontentloaded" });

      // 1. 输入手机号
      await page.waitForSelector("#register-sms-1_input_1_phone");
      await page.type("#register-sms-1_input_1_phone", params.phonenum, {
        delay: 100,
      });

      // 2. 同意隐私政策
      await page.waitForSelector("#accept");
      await page.click("#accept");

      // 3. 点击获取验证码
      await page.waitForSelector(".zppp-sms__send");
      await page.click(".zppp-sms__send");
      resolve(true);
    } catch (error) {
      reject(error);
    }
  });
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function handleBossSmsCode(
  context: any,
  page: any,
  params: CrawlerjetThirdGetSmsCodeHandlerOptions
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

export const crawlerjetThirdGetSmsCodeHandler = async (ctx: Koa.Context) => {
  const params = ctx.request.body as CrawlerjetThirdGetSmsCodeHandlerOptions;

  const sessionId = nanoid(10);
  const { context, page } = await createContext();

  let result = "";
  if (params.type === "zhaopin") {
    await handleZhaopinSmsCode(context, page, params);
  } else {
    result = await handleBossSmsCode(context, page, params);
  }

  // 存储 context  page 和 type
  pageStores.set(sessionId, { context, page, type: params.type });

  ctx.body = {
    code: 200,
    data: { sessionId, result },
  };
};

function handleZhaopinLogin(
  context: any,
  page: any,
  params: CrawlerjetThirdLoginHandlerOptions
): Promise<string> {
  return new Promise(async (resolve) => {
    try {
      // 1. 输入验证码
      await page.waitForSelector("#register-sms-1_input_2_validate_code");
      await page.type("#register-sms-1_input_2_validate_code", params.code, {
        delay: 100,
      });

      // 2. 点击登录
      await page.waitForSelector(".zppp-submit");
      await page.click(".zppp-submit");

      await page.waitForNavigation({ waitUntil: "domcontentloaded" });

      // 3. 获取登录后的 cookie
      const cookies = await context.cookies();

      resolve(cookies);
    } catch (error) {
      resolve("");
    }
  });
}

function handleBossLogin(
  context: any,
  page: any,
  params: CrawlerjetThirdLoginHandlerOptions
) {
  return new Promise(async (resolve, reject) => {
    try {
      // 1. 输入验证码
      await page.waitForSelector(".sms-input-wrapper input");
      await page.type(".sms-input-wrapper input", params.code, {
        delay: 100,
      });

      // 2. 点击登录
      await page.waitForSelector(".sms-form-btn button.sure-btn");
      await page.click(".sms-form-btn button.sure-btn");

      await page.waitForNavigation({ waitUntil: "domcontentloaded" });

      // 3. 获取登录后的 cookie
      const cookies = await context.cookies();

      resolve(cookies);
    } catch (error) {
      resolve("");
    }
  });
}

export const crawlerjetThirdLoginHandler = async (ctx: Koa.Context) => {
  const params = ctx.request.body as CrawlerjetThirdLoginHandlerOptions;

  if (!params.sessionId) {
    ctx.body = { code: 1001, message: "会话已失效，请重新进入页面" };
    return;
  }

  if (!params.code) {
    ctx.body = { code: 1002, message: "验证码不能为空" };
    return;
  }

  try {
    const { context, page, type } = pageStores.get(params.sessionId);
    if (!context || !page || !type) {
      ctx.body = { code: 1003, message: "会话已失效，请重新进入页面" };
      return;
    }
    let cookies = "";
    if (type === "zhaopin") {
      cookies = await handleZhaopinLogin(context, page, params);
    } else {
      await handleBossLogin(context, page, params);
    }

    page.close();
    context.close();

    if (pageStores.has(params.sessionId)) {
      pageStores.delete(params.sessionId);
    }

    ctx.body = {
      code: 200,
      data: { ...params, cookies: cookies },
    };
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
  ctx.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "Access-Control-Allow-Origin": "*", // 根据需要设置CORS
  });

  const params =
    ctx.query as unknown as CrawlerjetThirdQrcodeLoginHandlerOptions;

  const { context, page } = await createContext();

  try {
    let miniQrcode = "";
    if (params.type === "boss") {
      miniQrcode = await handleBossQrcodeLogin(page, params);
    }
    if (miniQrcode) {
      // 获取到小程序码
      ctx.res.write(`event: init-qrcode\n`);
      ctx.res.write(
        `data: ${JSON.stringify({ code: 200, data: { miniQrcode } })}\n\n`
      );
    }

    const responsePromise = page.waitForResponse(
      (response: any) =>
        response
          .url()
          .includes("www.zhipin.com/wapi/zppassport/qrcode/loginConfirm") &&
        response.status() === 200
    );
    // 等待获取到响应
    const response = await responsePromise;

    // 从响应中获取JSON数据
    const jsonData = await response.json();

    console.log(">>>>>>>>> jsonData 222: ", jsonData);

    ctx.req.on("close", () => {
      console.log(">>>>>>> close");
      ctx.res.end();
    });

    ctx.req.on("error", () => {
      console.log(">>>>>>> error");
      ctx.res.end();
    });
  } catch (_) {
    ctx.body = { code: 1003, message: "登录失败" };
  }
};

function handleZhaopinDailyPositions(
  context: any,
  page: any,
  params: CrawlerjetGetDailyPositionsHandlerOptions
) {
  return new Promise(async (resolve, reject) => {
    try {
      page.setDefaultNavigationTimeout(0);

      await page.goto("https://zhaopin.com/sou/", {
        timeout: 0,
      });
      await page.waitForNavigation({ waitUntil: "domcontentloaded" });

      // 1. 输入职位
      await page.waitForSelector(".query-search__content-input");
      await page.type(".query-search__content-input", params.job || "", {
        delay: 100,
      });

      // 2. 点击城市选择
      await page.waitForSelector(".content-s__item__text");
      await page.click(".content-s__item__text");

      // 3. 输入城市
      await page.waitForSelector(".query-other-city__input");
      await page.type(".query-other-city__input", params.city || "", {
        delay: 100,
      });

      // 4. 点击城市
      await page.waitForSelector(".query-other-city .query-other-city__list");
      const result = await page.$$eval(
        ".query-other-city .query-other-city__list__item__a",
        (items: any, city: string) => {
          const item = items.find(
            (item: any) => item.textContent.trim() === city.trim()
          );
          console.log(">>>> 2", item);
          if (item) {
            item.click();
            return true;
          }
          return false;
        },
        params.city
      );
      if (!result) {
        reject({
          code: 1004,
          message: "城市选择失败",
          data: {
            city: params.city,
            job: params.job,
          },
        });
      }
      const responsePromise = page.waitForResponse(
        (response: any) =>
          response.url().includes("fe-api.zhaopin.com/c/i/search/positions") &&
          response.status() === 200
      );
      // 等待获取到响应
      const response = await responsePromise;

      // 从响应中获取JSON数据
      const jsonData = await response.json();

      if (
        jsonData.code !== 200 ||
        !jsonData.data ||
        !jsonData.data.list ||
        jsonData.data.list.length === 0
      ) {
        reject({
          code: 1006,
          message: "获取职位列表失败",
          data: {
            city: params.city,
            job: params.job,
          },
        });
        return;
      }

      const positions = jsonData.data.list.filter((item: any) =>
        isToday(item.publishTime)
      );

      jsonData.data.list = [...positions];

      resolve({
        ...jsonData,
      });
    } catch (error) {
      reject({
        code: 1005,
        message: "获取职位列表失败",
        data: {
          city: params.city,
          job: params.job,
        },
      });
    }
  });
}

function handleBossDailyPositions(
  context: any,
  page: any,
  params: CrawlerjetGetDailyPositionsHandlerOptions
) {
  return new Promise(async (resolve, reject) => {
    try {
      await page.goto("https://www.zhaopin.com/");
    } catch (error) {
      reject(error);
    }
  });
}

export const crawlerjetGetDailyPositionsHandler = async (ctx: Koa.Context) => {
  const params = ctx.request.body as CrawlerjetGetDailyPositionsHandlerOptions;

  try {
    const { context, page } = await createContext();
    let result: any = {};
    if (params.type === "boss") {
      result = await handleBossDailyPositions(context, page, params);
    } else {
      result = await handleZhaopinDailyPositions(context, page, params);
    }

    page.close();
    context.close();

    if (result.code !== 200) {
      ctx.body = result;
      return;
    }

    ctx.body = {
      code: 200,
      data: { ...params, ...result.data },
    };
  } catch (_) {
    ctx.body = { code: 1003, message: "登录失败" };
  }
};

function handleBossDeliver(params: CrawlerjetDeliverHandlerOptions) {
  return new Promise(async (resolve, reject) => {
    const { context, page } = await createContext();
    try {
      await page.goto("https://www.zhaopin.com/");
    } catch (error) {
      reject(error);
    } finally {
      page.close();
      context.close();
    }
  });
}

function handleZhaopinDeliver(params: { cookies: any; number: string }) {
  return new Promise(async (resolve, reject) => {
    const { context, page } = await createContext(params.cookies);
    try {
      await page.goto(
        `https://www.zhaopin.com/jobdetail/${params.number}.htm?refcode=4019&srccode=401903`,
        {
          timeout: 0,
        }
      );

      await page.waitForNavigation({ waitUntil: "domcontentloaded" });

      // 1. 点击投递按钮
      await page.waitForSelector(".summary-plane__action button");
      const button = await page.$eval(
        ".summary-plane__action button",
        (el: any) => el.getAttribute("disabled")
      );
      if (button) {
        resolve({
          code: 1010,
          message: "请勿重复投递",
          data: {
            number: params.number,
          },
        });
        return;
      }
      await page.click(".summary-plane__action button");

      const responsePromise = page.waitForResponse(
        (response: any) =>
          response
            .url()
            .includes("fe-api.zhaopin.com/c/pc/alan/jobs/application") &&
          response.status() === 200
      );
      // 等待获取到响应
      const response = await responsePromise;

      // 从响应中获取JSON数据
      const jsonData = await response.json();
      console.log(">>>>.....jsonData: ", jsonData);
      if (jsonData.error) {
        resolve({
          code: 1007,
          message: "投递失败",
          data: {
            number: params.number,
          },
        });
        return;
      }
      resolve({
        code: 200,
        message: "投递成功",
        data: {
          number: params.number,
        },
      });
    } catch (error) {
      console.log(">>>>.....error: ", error);
      resolve({
        code: 1008,
        message: "投递失败",
        data: {
          number: params.number,
        },
      });
    } finally {
      page.close();
      context.close();
    }
  });
}

export const crawlerjetDeliverHandler = async (ctx: Koa.Context) => {
  const params = ctx.request.body as CrawlerjetDeliverHandlerOptions;

  if (!params.numbers || params.numbers.length === 0) {
    ctx.body = { code: 1001, message: "职位编号不能为空" };
    return;
  }

  if (!params.cookies) {
    ctx.body = { code: 1002, message: "登录态不能为空" };
    return;
  }

  try {
    let result: any = {};
    let ps = [];
    if (params.type === "boss") {
      result = await handleBossDeliver(params);
    } else {
      ps = params.numbers.map((number: string) =>
        handleZhaopinDeliver({
          cookies: params.cookies,
          number: number,
        })
      );

      result = await Promise.all(ps);
    }

    const failed = (
      result.filter((item: any) => item.code !== 200 && item.code !== 1010) ||
      []
    ).map((item: any) => item.data.number);
    const success = (result.filter((item: any) => item.code === 200) || []).map(
      (item: any) => item.data.number
    );
    const repeated = (
      result.filter((item: any) => item.code === 1010) || []
    ).map((item: any) => item.data.number);

    if (success.length === 0) {
      // 无成功
      ctx.body = {
        code: 1001,
        message: "投递失败",
        data: {
          failed: failed,
          success: success,
          repeated: repeated,
        },
      };
      return;
    }
    ctx.body = {
      code: 200,
      message: "投递成功",
      data: {
        failed: failed,
        success: success,
        repeated: repeated,
      },
    };
  } catch (_) {
    ctx.body = {
      code: 1003,
      message: "登录失败",
      data: {
        failed: params.numbers,
        success: [],
        repeated: [],
      },
    };
  }
};

function handleBossValidateLoginStatus(
  params: CrawlerjetValidateLoginStatusHandlerOptions
) {
  // TODO: 实现 boss 验证登录态
}

function handleZhaopinValidateLoginStatus(
  params: CrawlerjetValidateLoginStatusHandlerOptions
) {
  return new Promise(async (resolve, reject) => {
    const { context, page } = await createContext(params.cookies);
    try {
      await page.goto("https://www.zhaopin.com/");
      await page.waitForNavigation({ waitUntil: "domcontentloaded" });

      await page.waitForSelector(".c-login__top", {
        timeout: 2000,
      });

      resolve({
        code: 200,
        message: "验证登录态成功",
        data: {},
      });
    } catch (error) {
      resolve({
        code: 1001,
        message: "登录态已过期",
        data: {},
      });
    } finally {
      page.close();
      context.close();
    }
  });
}

export const crawlerjetValidateLoginStatusHandler = async (
  ctx: Koa.Context
) => {
  const params = ctx.request
    .body as CrawlerjetValidateLoginStatusHandlerOptions;

  try {
    let result: any = {};
    if (params.type === "boss") {
      result = await handleBossValidateLoginStatus(params);
    } else {
      result = await handleZhaopinValidateLoginStatus(params);
    }

    ctx.body = result;
  } catch (_) {
    ctx.body = { code: 1003, message: "验证登录态失败" };
  }
};

export const crawlerjetTestHandler = async (ctx: Koa.Context) => {
  const result = await clusterManager.executeTask(
    PuppeteerTaskType.getDailyPosition,
    {
      type: "zhaopin",
      city: "日喀则",
      job: "园艺师",
    }
  );
  console.log(">>>>>>>>>>> result: ", result);

  ctx.body = { code: 200, message: "测试成功", data: result };
};
