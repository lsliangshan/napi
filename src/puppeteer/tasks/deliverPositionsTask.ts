import { BrowserContext, Page } from "puppeteer";
import { PuppeteerTaskData } from "../types";
import clusterManager from "../cluster/index";
import { createPage } from "../helpers/page";

export default async function deliverPositionsTask(
  page: Page,
  data: PuppeteerTaskData
) {
  let result: any = {};
  let ps = [];
  const context = await clusterManager.getBrowserContext();
  if (data.type === "zhaopin") {
    ps = data.numbers.map((number: string) =>
      handleDeliverZhaopinPositions(context, {
        cookies: data.cookies,
        number: number,
      })
    );

    result = await Promise.all(ps);
  } else if (data.type === "boss") {
    // return await handleBossDailyPositions(page, data);
    ps = data.numbers.map((number: string) =>
      handleDeliverBossPositions(context, {
        cookies: data.cookies,
        number: number,
      })
    );

    result = await Promise.all(ps);
  } else {
    throw new Error("Invalid task type");
  }
  await context.close();

  const failed = (
    result.filter((item: any) => item.code !== 200 && item.code !== 1010) || []
  ).map((item: any) => item.data.number);
  const success = (result.filter((item: any) => item.code === 200) || []).map(
    (item: any) => item.data.number
  );
  const repeated = (result.filter((item: any) => item.code === 1010) || []).map(
    (item: any) => item.data.number
  );

  if (success.length === 0) {
    // 无成功
    return {
      code: 1001,
      message: "投递失败",
      data: {
        failed: failed,
        success: success,
        repeated: repeated,
      },
    };
  }
  if (page) {
    await page.close();
  }
  return {
    code: 200,
    message: "投递成功",
    data: {
      failed: failed,
      success: success,
      repeated: repeated,
    },
  };
}

function handleDeliverZhaopinPositions(
  context: BrowserContext,
  data: PuppeteerTaskData
) {
  return new Promise(async (resolve) => {
    const page = await createPage(context, data.cookies);
    try {
      await page.goto(
        `https://www.zhaopin.com/jobdetail/${data.number}.htm?refcode=4019&srccode=401903`,
        {
          timeout: 0,
          waitUntil: "networkidle0",
        }
      );

      // await page.waitForNavigation({ waitUntil: "domcontentloaded" });

      // 1. 点击投递按钮
      await page.waitForSelector(".summary-plane__action button", {
        // timeout: 2000,
        visible: true,
      });
      const button = await page.$eval(
        ".summary-plane__action button",
        (el: any) => el.getAttribute("disabled")
      );
      if (button) {
        resolve({
          code: 1010,
          message: "请勿重复投递",
          data: {
            number: data.number,
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

      if (jsonData.error) {
        resolve({
          code: 1007,
          message: "投递失败",
          data: {
            number: data.number,
          },
        });
        return;
      }
      resolve({
        code: 200,
        message: "投递成功",
        data: {
          number: data.number,
        },
      });
    } catch (error) {
      resolve({
        code: 1008,
        message: "投递失败",
        data: {
          number: data.number,
        },
      });
    } finally {
      await page.close();
    }
  });
}

function handleDeliverBossPositions(
  context: BrowserContext,
  data: PuppeteerTaskData
) {
  return new Promise(async (resolve) => {
    const page = await createPage(context, data.cookies);
    try {
      await page.goto(`https://www.zhipin.com/job_detail/${data.number}.html`, {
        timeout: 0,
        waitUntil: "networkidle0",
      });

      // await page.waitForNavigation({ waitUntil: "domcontentloaded" });

      // 1. 点击立即沟通按钮
      await page.waitForSelector(".btn-startchat", {
        // timeout: 2000,
        visible: true,
      });
      const button = await page.$eval(
        ".btn-startchat",
        (el: any) => el.getAttribute("data-isfriend") == "true"
      );
      if (button) {
        resolve({
          code: 1010,
          message: "已与该HR沟通过",
          data: {
            number: data.number,
          },
        });
        return;
      }
      await page.click(".btn-startchat");

      const responsePromise = page.waitForResponse(
        (response: any) =>
          response
            .url()
            .includes("www.zhipin.com/wapi/zpgeek/friend/add.json") &&
          response.status() === 200
      );
      // 等待获取到响应
      const response = await responsePromise;

      // 从响应中获取JSON数据
      const jsonData = await response.json();

      if (jsonData.code != 200 && jsonData.code != 0) {
        resolve({
          code: 1007,
          message: "沟通失败",
          data: {
            number: data.number,
          },
        });
        return;
      }
      resolve({
        code: 200,
        message: "沟通成功",
        data: {
          number: data.number,
        },
      });
    } catch (error) {
      resolve({
        code: 1008,
        message: "沟通失败",
        data: {
          number: data.number,
        },
      });
    } finally {
      await page.close();
    }
  });
}
