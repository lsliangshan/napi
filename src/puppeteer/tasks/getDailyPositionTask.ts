import { Page } from "puppeteer";
import { PuppeteerTaskData } from "../types";
import { isToday } from "../../utils/time";
import { sleep } from "../../utils";

export default async function getDailyPositionTask(
  page: Page,
  data: PuppeteerTaskData
) {
  if (data.type === "zhaopin") {
    return await handleZhaopinDailyPositions(page, data);
  } else if (data.type === "boss") {
    // return await handleBossDailyPositions(page, data);
  } else {
    throw new Error("Invalid task type");
  }
}

function handleZhaopinDailyPositions(page: Page, data: PuppeteerTaskData) {
  return new Promise(async (resolve, reject) => {
    try {
      page.setDefaultNavigationTimeout(0);

      await page.setRequestInterception(true);

      page.on("request", (req) => {
        const headers = {
          ...req.headers(),
        };
        req.continue({ headers });
      });

      await page.goto("https://zhaopin.com/sou/", {
        timeout: 0,
        waitUntil: "networkidle0",
      });
      // await page.waitForNavigation({ waitUntil: "domcontentloaded" });

      // 1. 输入职位
      await page.waitForSelector(".query-search__content-input");
      await page.type(".query-search__content-input", data.job || "", {
        delay: 100,
      });

      // 2. 点击城市选择
      await page.waitForSelector(".content-s__item__text");
      await page.click(".content-s__item__text");

      // 3. 输入城市
      await page.waitForSelector(".query-other-city__input");
      await page.type(".query-other-city__input", data.city || "", {
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

          if (item) {
            item.click();
            return true;
          }
          return false;
        },
        data.city
      );
      if (!result) {
        reject({
          code: 1004,
          message: "城市选择失败",
          data: {
            city: data.city,
            job: data.job,
          },
        });
      }
      // 点击最新发布
      await page.waitForSelector(".listsort__item__a");
      await page.$$eval(".listsort__item__a", (items: any) => {
        const item = items.find(
          (item: any) => item.textContent.trim() === "最新发布"
        );

        if (item) {
          item.click();
          return true;
        }
        return false;
      });

      const responsePromise = page.waitForResponse((response: any) => {
        const postData = response.request().postData();

        if (
          response.url().includes("fe-api.zhaopin.com/c/i/search/positions")
        ) {
          const order = JSON.parse(postData || "{}")?.order;
          return response.status() === 200 && order == 4;
        }
        return false;
      });
      // 等待获取到响应
      const response = await responsePromise;

      // 从响应中获取JSON数据
      const jsonData = await response.json();
      console.log(
        ">>>> jsonData 222: ",
        jsonData.data.list.map((itm: any) => itm.publishTime)
      );

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
            city: data.city,
            job: data.job,
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
          city: data.city,
          job: data.job,
        },
      });
    }
  });
}
