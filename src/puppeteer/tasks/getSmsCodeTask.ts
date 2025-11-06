import { Page } from "puppeteer";
import { PuppeteerTaskData } from "../types";
import { nanoid } from "nanoid";
import clusterManager from "../cluster/index";
import { sleep } from "../../utils";

export default async function getSmsCodeTask(_: Page, data: PuppeteerTaskData) {
  const sessionId = nanoid(10);

  await clusterManager.createSession(sessionId, data.cookies || []);
  const page = clusterManager.getSessionPage(sessionId);

  if (data.type === "zhaopin") {
    await handleZhaopinSmsCode(page, data);
    return {
      code: 200,
      data: { sessionId },
    };
  } else if (data.type === "boss") {
    const result = await handleBossSmsCode(page);
    return {
      code: 200,
      data: { sessionId, result },
    };
  } else {
    throw new Error("Invalid task type");
  }
}

function handleZhaopinSmsCode(page: Page, data: PuppeteerTaskData) {
  return new Promise(async (resolve, reject) => {
    try {
      await page.goto("https://passport.zhaopin.com/login", {
        timeout: 0,
        waitUntil: "networkidle0",
      });
      // await page.waitForNavigation({ waitUntil: "domcontentloaded" });
      // 1. 输入手机号
      await page.waitForSelector("#register-sms-1_input_1_phone");
      await page.type("#register-sms-1_input_1_phone", data.phonenum, {
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

function handleBossSmsCode(page: Page): Promise<string> {
  return new Promise(async (resolve) => {
    try {
      await page.goto("https://www.zhipin.com/web/user", {
        timeout: 0,
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
