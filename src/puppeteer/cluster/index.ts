import { Cluster } from "puppeteer-cluster";
import SessionManager from "../session/index";
import { PuppeteerTaskData, PuppeteerTaskType } from "../types";
import { Page } from "puppeteer";

class EnhancedClusterManager {
  public cluster: Cluster | null = null;
  private isInitialized = false;
  private sessionManager: SessionManager;

  constructor() {
    this.cluster = null;
    this.isInitialized = false;
    this.sessionManager = new SessionManager();
  }

  async initialize() {
    if (this.isInitialized) return;

    this.cluster = await Cluster.launch({
      concurrency: Cluster.CONCURRENCY_CONTEXT, // 使用上下文并发模式
      maxConcurrency: 6,
      puppeteerOptions: {
        headless: true,
        timeout: 0,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-accelerated-2d-canvas",
          "--no-first-run",
          "--no-zygote",
          "--disable-gpu",
        ],
        defaultViewport: { width: 1280, height: 720 },
      },
      timeout: 60000,
      retryLimit: 2,
    });

    this.isInitialized = true;
    console.log("Enhanced Puppeteer Cluster 初始化完成");
    return this.cluster;
  }

  // 执行独立任务（无会话）
  async executeTask(taskType: PuppeteerTaskType, taskData: PuppeteerTaskData) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    return await this.cluster?.execute({
      taskType: taskType,
      ...taskData,
    });
  }

  async getBrowserContext() {
    const browser = await this.cluster?.execute(
      async ({ page }: { page: Page }) => {
        return page.browser();
      }
    );
    const context = await browser.createBrowserContext();
    return context;
  }

  // 创建新会话
  async createSession(sessionId: string, initialCookies = []) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    return await this.sessionManager.createSession(
      this.cluster!,
      sessionId,
      initialCookies
    );
  }

  // 获取会话页面
  getSessionPage(sessionId: any) {
    const session = this.sessionManager.getSession(sessionId);
    return session ? session.page : null;
  }

  // 检查会话是否存在
  hasSession(sessionId: any) {
    return this.sessionManager.hasSession(sessionId);
  }

  // 销毁会话
  async destroySession(sessionId: any) {
    return await this.sessionManager.destroySession(sessionId);
  }

  // 获取会话数据
  getSessionData(sessionId: any) {
    return this.sessionManager.getSessionData(sessionId);
  }

  // 设置会话数据
  setSessionData(sessionId: any, data: any) {
    return this.sessionManager.setSessionData(sessionId, data);
  }

  // 获取会话统计
  getSessionStats() {
    return this.sessionManager.getStats();
  }

  async close() {
    if (this.cluster) {
      // 先关闭所有会话
      for (const sessionId of this.sessionManager.sessions.keys()) {
        await this.sessionManager.destroySession(sessionId);
      }

      await this.cluster.idle();
      await this.cluster.close();
      this.isInitialized = false;
      console.log("Enhanced Puppeteer Cluster 已关闭");
    }
  }
}

export default new EnhancedClusterManager();
