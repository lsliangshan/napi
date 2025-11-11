import Uri from "urijs";
import { sleep } from "../utils";
import { createContext } from "./puppeteer";
export function websocketHandler(ws: any, req: any) {
  console.log(">>>> New Connector ", req.url);
  ws.on("close", () => {
    console.log(">>>>>>> disconnect");
    ws.close();
  });

  const urijs = new Uri(req.url);

  const pathname = urijs.pathname();
  const query = urijs.search(true);
  if (pathname === "/crawlerjet-third-qrcode-login") {
    crawlerjetThirdQrcodeLoginHandler(ws, query);
  } else {
    ws.send(JSON.stringify({ code: 404, eventName: "not-found" }));
    ws.close();
  }
}

function handleBossQrcodeLogin(page: any, ws: any): Promise<string> {
  return new Promise(async (resolve) => {
    try {
      await page.goto("https://www.zhipin.com/web/user", {
        timeout: 0,
        waitUntil: ["load", "domcontentloaded", "networkidle0", "networkidle2"],
      });

      // await page.setRequestInterception(true);

      // page.on("request", (req: any) => {
      //   if (
      //     req.url().includes("www.zhipin.com/wapi/zppassport/qrcode/scanByMp")
      //   ) {
      //     ws.send(
      //       JSON.stringify({
      //         code: 200,
      //         eventName: "qrcode-scan",
      //         data: {},
      //       })
      //     );
      //   }
      //   req.continue();
      // });

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

async function crawlerjetThirdQrcodeLoginHandler(ws: any, query: any) {
  const TIMEOUT = 30 * 60 * 1000;

  const { context, page } = await createContext();

  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
  );

  async function closePage() {
    ws.close();
    if (page && !page.isClosed) {
      await page.close();
    }
  }

  try {
    let miniQrcode = "";

    if (query.type === "boss") {
      miniQrcode = await handleBossQrcodeLogin(page, ws);
    }
    if (miniQrcode) {
      // 获取到小程序码
      ws.send(
        JSON.stringify({
          code: 200,
          eventName: "init-qrcode",
          data: { miniQrcode },
        })
      );
    }

    const responsePromise = page.waitForResponse(
      (response: any) =>
        response
          .url()
          .includes("www.zhipin.com/wapi/zppassport/qrcode/scanByMp"),
      {
        timeout: TIMEOUT,
      }
    );
    // 等待获取到响应
    const response = await responsePromise;

    // 从响应中获取JSON数据
    const jsonData = await response.json();

    if (jsonData.scaned) {
      ws.send(
        JSON.stringify({
          code: 200,
          eventName: "qrcode-scaned",
          data: {},
        })
      );
    }

    // const responsePromise = page.waitForResponse(
    //   (response: any) =>
    //     response
    //       .url()
    //       .includes("www.zhipin.com/wapi/zppassport/qrcode/loginConfirm") &&
    //     response.status() === 200,
    //   {
    //     timeout: TIMEOUT,
    //   }
    // );
    // // 等待获取到响应
    // const response = await responsePromise;

    // // 从响应中获取JSON数据
    // const jsonData = await response.json();

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
    ws.send(
      JSON.stringify({
        code: 200,
        eventName: "login-result",
        data: {
          username: encodeURIComponent(userInfoJsonData.zpData.name || ""),
          avatar: encodeURIComponent(userInfoJsonData.zpData.largeAvatar || ""),
          userId: userInfoJsonData.zpData.userId || "",
        },
        cookies,
      })
    );

    await closePage();
  } catch (e) {
    ws.send(
      JSON.stringify({
        code: 1003,
        eventName: "login-result",
        message: "登录失败",
      })
    );
    await closePage();
  }
  // // 返回永不 resolve 的 promise，保持连接
  // return new Promise(() => {});
}
