import { Page } from "puppeteer";
import { Cluster } from "puppeteer-cluster";
import { PuppeteerTaskType } from "../types";
import getDailyPositionTask from "./getDailyPositionTask";
import getSmsCodeTask from "./getSmsCodeTask";
import loginThirdPlatformTask from "./loginThirdPlatformTask";
import deliverPositionsTask from "./deliverPositionsTask";
import validateLoginStatusTask from "./validateLoginStatusTask";
import autoDeliverDailyPositionsTask from "./autoDeliverDailyPositionsTask";

// 初始化任务函数
export async function initTask(cluster: Cluster) {
  await cluster.task(
    async ({
      page,
      data,
    }: {
      page: Page;
      data: {
        taskType: PuppeteerTaskType;
        [key: string]: any;
      };
    }) => {
      const { taskType, cookies, ...taskData } = data;

      await page.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      );

      // 在执行具体任务前，先重置 Cookie
      if (cookies && cookies.length > 0) {
        // 1. 清理当前页面的所有 Cookie
        const existingCookies = await page.cookies();
        if (existingCookies.length > 0) {
          await page.deleteCookie(...existingCookies);
        }
        // 2. 设置新的 Cookie
        // 注意：确保每个 Cookie 对象包含 domain 属性
        await page.setCookie(...cookies);
      }

      if (taskType) {
        try {
          switch (taskType) {
            case PuppeteerTaskType.getDailyPosition:
              return await getDailyPositionTask(page, taskData);
            case PuppeteerTaskType.getSmsCode:
              return await getSmsCodeTask(page, taskData);
            case PuppeteerTaskType.loginThirdPlatform:
              return await loginThirdPlatformTask(page, taskData);
            case PuppeteerTaskType.deliver:
              return await deliverPositionsTask(page, data);
            case PuppeteerTaskType.validateLoginStatus:
              return await validateLoginStatusTask(page, data);
            case PuppeteerTaskType.autoDeliverDailyPositions:
              return await autoDeliverDailyPositionsTask(page, data);
            default:
              throw new Error(`未知的任务类型: ${taskType}`);
          }
        } catch (error) {
          console.error(`任务执行失败 (${taskType}):`, error);
          throw error; // 重新抛出错误，让调用方处理
        }
      }
    }
  );
}
