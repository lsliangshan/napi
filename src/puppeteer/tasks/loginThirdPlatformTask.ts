import { Page } from "puppeteer";
import { PuppeteerTaskData } from "../types";
import clusterManager from "../cluster/index";
import { sleep } from "../../utils";

export default async function loginThirdPlatformTask(
  _: Page,
  data: PuppeteerTaskData
) {
  const { sessionId } = data;
  if (!sessionId) {
    // 会话不存在
    throw new Error("会话已失效，请重新进入页面");
  }

  const page = clusterManager.getSessionPage(sessionId);

  let cookies = [];
  if (data.type === "zhaopin") {
    const result1 = await handleZhaopinLogin(page, data);
    cookies = result1.cookies;
    return {
      code: 200,
      data: { sessionId, ...result1 },
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

function handleZhaopinLogin(
  page: Page,
  data: PuppeteerTaskData
): Promise<any> {
  return new Promise(async (resolve) => {
    try {
      // 1. 输入验证码
      await page.waitForSelector("#register-sms-1_input_2_validate_code");
      await page.type("#register-sms-1_input_2_validate_code", data.code, {
        delay: 100,
      });

      // 2. 点击登录
      await page.waitForSelector(".zppp-submit");
      await page.click(".zppp-submit");

      await page.waitForNavigation({ waitUntil: "domcontentloaded" });

      // 3. 获取登录后的 cookie
      const cookies = await page.cookies();

      const responsePromise = page.waitForResponse(
        (response: any) =>
          response
            .url()
            .includes("fe-api.zhaopin.com/c/i/user/detail") &&
          response.status() === 200,
          {
            timeout: 10000,
          }
      );
      // 等待获取到响应
      const response = await responsePromise;
  
      // 从响应中获取JSON数据
      const jsonData = await response.json();

      resolve({
        cookies: cookies,
        data: {
          username: encodeURIComponent(jsonData.data.Name || jsonData.data.name || ''),
          userId: jsonData.data.userId || '',
          avatar: encodeURIComponent(jsonData.data.PhotoUrl ? `https://mypics.zhaopin.com${jsonData.data.PhotoUrl}` : ''),
        }
      });
    } catch (error) {
      resolve({
        cookies: [],
        data: {
          username: '',
          userId: '',
          avatar: '',
        }
      });
    } finally {
      await page.close();
    }
  });
}

function handleBossSmsCode(page: Page): Promise<string> {
  return new Promise(async (resolve) => {
    try {
      await page.goto("https://www.zhipin.com/web/user", {
        timeout: 0,
        waitUntil: "networkidle0",
      });
      // await page.waitForNavigation({ waitUntil: "domcontentloaded" });

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
