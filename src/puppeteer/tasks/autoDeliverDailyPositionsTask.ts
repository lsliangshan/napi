import { Page } from "puppeteer";
import { PuppeteerTaskData } from "../types";
import { isToday } from "../../utils/time";
import deliverPositionsTask from "./deliverPositionsTask";
import { positionTransform } from "../../utils/position";

export default async function autoDeliverDailyPositionsTask(
  page: Page,
  data: PuppeteerTaskData
) {
  if (data.type === "zhaopin") {
    return await handleAutoDeliverZhaopinDailyPositions(page, data);
  } else if (data.type === "boss") {
    return await handleAutoDeliverBossDailyPositions(page, data);
  } else {
    throw new Error("Invalid task type");
  }
}

function handleAutoDeliverZhaopinDailyPositions(
  page: Page,
  data: PuppeteerTaskData
) {
  return new Promise(async (resolve) => {
    try {
      await page.goto(`https://zhaopin.com/sou/`, {
        timeout: 0,
        waitUntil: "networkidle0",
      });

      await page.setRequestInterception(true);

      page.on("request", (req) => {
        const headers = {
          ...req.headers(),
        };
        req.continue({ headers });
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
        resolve({
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
        if (
          response.url().includes("fe-api.zhaopin.com/c/i/search/positions")
        ) {
          const postData = response.request().postData();

          const order = JSON.parse(postData || "{}")?.order;
          const sortType = JSON.parse(postData || "{}")?.sortType;
          // if (order == 4) {
          //   console.log(">>>>>. ", response.request().headers());
          // }
          return (
            response.status() === 200 &&
            (order == 4 || sortType == "JOB_PUBLISH_TIME")
          );
        }
        return false;
      });
      // 等待获取到响应
      const response = await responsePromise;

      // 从响应中获取JSON数据
      const jsonData = await response.json();
      console.log(
        ">>>> jsonData: ",
        jsonData.data.list.map((itm: any) => itm.publishTime)
      );
      if (
        jsonData.code !== 200 ||
        !jsonData.data ||
        !jsonData.data.list ||
        jsonData.data.list.length === 0
      ) {
        resolve({
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

      // resolve({ code: 200, list: jsonData.data.list });
      // return;

      // 自动投递职位
      const deliverResult = await deliverPositionsTask(page, {
        ...data,
        numbers: positions.slice(0, 1).map((item: any) => item.number),
      });

      if (deliverResult.code === 200) {
        deliverResult.data.success = deliverResult.data.success
          .map((number: string): any => {
            const index = positions.findIndex(
              (item: any) => item.number === number
            );
            if (index === -1) {
              return null;
            }
            return positions[index];
          })
          .filter((item: any) => !!item);

        deliverResult.data.repeated = deliverResult.data.repeated
          .map((number: string): any => {
            const index = positions.findIndex(
              (item: any) => item.number === number
            );
            if (index === -1) {
              return null;
            }
            return positions[index];
          })
          .filter((item: any) => !!item);
      }

      resolve({
        ...deliverResult,
        data: {
          ...deliverResult.data,
          options: {
            city: data.city,
            job: data.job,
          },
        },
      });
    } catch (error) {
      console.error(">>>>", error);
      resolve({
        code: 1008,
        message: "投递失败",
        data: {
          city: data.city,
          job: data.job,
        },
      });
    }
  });
}

function handleAutoDeliverBossDailyPositions(
  page: Page,
  data: PuppeteerTaskData
) {
  return new Promise(async (resolve, reject) => {
    try {
      await page.setRequestInterception(true);

      page.on("request", (req) => {
        const headers = {
          ...req.headers(),
        };
        req.continue({ headers });
      });

      await page.goto(`https://www.zhipin.com/web/geek/jobs`, {
        timeout: 0,
        waitUntil: "networkidle0",
      });

      // await page.waitForNavigation({ waitUntil: "domcontentloaded" });

      // 2. 点击城市选择
      await page.waitForSelector(".city-label");
      await page.click(".city-label");

      const citySelectResult = await page.$$eval(
        ".city-char-list li",
        (items: any, cityPinyin: string) => {
          const item = items.find(
            (item: any) =>
              item.textContent
                .trim()
                .toUpperCase()
                .indexOf(cityPinyin.trim().charAt(0).toUpperCase()) !== -1
          );

          if (item) {
            item.click();
            return true;
          }
          return false;
        },
        data.cityPinyin
      );
      if (!citySelectResult) {
        reject({
          code: 1004,
          message: "城市选择失败",
          data: {
            city: data.city,
            job: data.job,
          },
        });
      }

      // 4. 点击城市
      await page.waitForSelector(".city-list-select");
      const result = await page.$$eval(
        ".city-list-select a",
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

      // 1. 输入职位
      // case: boss直聘，先输入搜索职位，再选择城市，会清空搜索关键词。
      await page.waitForSelector(".search-input-box input");
      await page.type(".search-input-box input", data.job || "", {
        delay: 100,
      });

      // 点击搜索按钮
      await page.waitForSelector(".search-btn");
      await page.click(".search-btn");

      const responsePromise = page.waitForResponse((response: any) => {
        // const postData = response.request().postData();

        if (
          response
            .url()
            .includes("www.zhipin.com/wapi/zpgeek/search/joblist.json")
        ) {
          return response.status() === 200;
        }
        return false;
      });
      // 等待获取到响应
      const response = await responsePromise;

      // 从响应中获取JSON数据
      const jsonData = await response.json();

      if (
        (jsonData.code !== 200 && jsonData.code !== 0) ||
        !jsonData.zpData ||
        !jsonData.zpData.jobList ||
        jsonData.zpData.jobList.length === 0
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

      const positions = jsonData.zpData.jobList.slice(0, 1).map((item: any) =>
        positionTransform({
          detail: item,
          type: "boss",
        })
      );

      // 自动投递职位
      const deliverResult = await deliverPositionsTask(page, {
        ...data,
        numbers: positions.map((item: any) => item.number),
      });

      if (deliverResult.code === 200) {
        deliverResult.data.success = deliverResult.data.success
          .map((number: string): any => {
            const index = positions.findIndex(
              (item: any) => item.number === number
            );
            if (index === -1) {
              return null;
            }
            return positions[index];
          })
          .filter((item: any) => !!item);

        deliverResult.data.repeated = deliverResult.data.repeated
          .map((number: string): any => {
            const index = positions.findIndex(
              (item: any) => item.number === number
            );
            if (index === -1) {
              return null;
            }
            return positions[index];
          })
          .filter((item: any) => !!item);
      }

      resolve({
        ...deliverResult,
        data: {
          ...deliverResult.data,
          options: {
            city: data.city,
            job: data.job,
          },
        },
      });
    } catch (error) {
      resolve({
        code: 1008,
        message: "投递失败",
        data: {
          city: data.city,
          job: data.job,
        },
      });
    }
  });
}
