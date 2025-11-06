import { Cluster } from "puppeteer-cluster";
import { PuppeteerTaskData, PuppeteerTaskType } from "../types";

export const pageStores = new Map<string, any>();

class ClusterManager {
  public cluster: Cluster | null = null;
  private isInitialized = false;

  async initialize() {
    if (this.isInitialized) return;

    this.cluster = await Cluster.launch({
      concurrency: Cluster.CONCURRENCY_PAGE,
      maxConcurrency: 10, // 根据你的服务器配置调整
      puppeteerOptions: {
        headless: false,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-accelerated-2d-canvas",
          "--no-first-run",
          "--no-zygote",
          "--disable-gpu",
        ],
      },
      timeout: 100000, // 任务超时时间（毫秒）
      retryLimit: 2, // 失败重试次数
    });

    this.isInitialized = true;
    console.log("Puppeteer Cluster 初始化完成");
    return this.cluster;
  }

  async executeTask(taskType: PuppeteerTaskType, taskData: PuppeteerTaskData) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    return await this.cluster?.execute({
      taskType: taskType,
      ...taskData,
    });
  }

  async close() {
    if (this.cluster) {
      await this.cluster.idle();
      await this.cluster.close();
      this.isInitialized = false;
      console.log("Puppeteer Cluster 已关闭");
    }
  }
}

export default new ClusterManager();
