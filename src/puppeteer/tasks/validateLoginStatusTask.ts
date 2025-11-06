import { Page } from "puppeteer";
import { PuppeteerTaskData } from "../types";

export default async function validateLoginStatusTask(
  page: Page,
  data: PuppeteerTaskData
) {
  if (data.type === "zhaopin") {
    return await handleValidateZhaopinLoginStatus(page, data);
  } else if (data.type === "boss") {
    // return await handleBossDailyPositions(page, data);
  } else {
    throw new Error("Invalid task type");
  }
}

function handleValidateZhaopinLoginStatus(page: Page, data: PuppeteerTaskData) {
  return new Promise(async (resolve) => {
    try {
      await page.goto("https://www.zhaopin.com/", {
        timeout: 0,
        waitUntil: "networkidle0",
      });
      // await page.waitForNavigation({ waitUntil: "domcontentloaded" });

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
    }
  });
}
