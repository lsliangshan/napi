import { Browser, Page } from "puppeteer";
import { Cluster } from "puppeteer-cluster";
import { createPage } from "../helpers/page";

export default class SessionManager {
  sessions: Map<any, any>;
  sessionTimeout: number;
  cleanupInterval: number;
  constructor() {
    this.sessions = new Map(); // sessionId -> { page, context, lastActive, data }
    this.sessionTimeout = 30 * 60 * 1000; // 30分钟超时
    this.cleanupInterval = 5 * 60 * 1000; // 5分钟清理一次

    // 启动定时清理过期会话
    this.startCleanupTimer();
  }

  async getBrowserFromCluster(cluster: Cluster) {
    return new Promise<Browser>((resolve, reject) => {
      // 创建一个虚拟任务来获取浏览器实例
      cluster
        .execute({ dummy: true })
        .then((worker) => {
          // 通过工作器获取浏览器
          const browser = worker.browser;
          resolve(browser);
        })
        .catch(reject);
    });
  }

  // 创建新会话
  async createSession(
    cluster: Cluster,
    sessionId: string,
    initialCookies: any[] = []
  ) {
    if (this.sessions.has(sessionId)) {
      await this.destroySession(sessionId);
    }

    // 创建隔离的浏览器上下文
    // const browser = await this.getBrowserFromCluster(cluster);
    const browser = await cluster.execute(async ({ page }: { page: Page }) => {
      return page.browser();
    });
    const context = await browser.createBrowserContext();
    // const page = await context.newPage();
    const page = await createPage(context, initialCookies);

    // // 设置初始 Cookie
    // if (initialCookies.length > 0) {
    //   await page.setCookie(...initialCookies);
    // }

    const session = {
      page,
      context,
      lastActive: Date.now(),
      data: {}, // 可以存储任意会话数据
      createdAt: Date.now(),
    };

    this.sessions.set(sessionId, session);
    console.log(`Session created: ${sessionId}`);

    return session;
  }

  // 获取会话
  getSession(sessionId: any) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActive = Date.now(); // 更新最后活跃时间
    }
    return session;
  }

  // 检查会话是否存在
  hasSession(sessionId: any) {
    return this.sessions.has(sessionId);
  }

  // 销毁会话
  async destroySession(sessionId: any) {
    const session = this.sessions.get(sessionId);
    if (session) {
      try {
        await session.context.close();
        console.log(`Session destroyed: ${sessionId}`);
      } catch (error) {
        console.error(`Error destroying session ${sessionId}:`, error);
      }
      this.sessions.delete(sessionId);
    }
  }

  // 获取会话数据
  getSessionData(sessionId: any) {
    const session = this.getSession(sessionId);
    return session ? session.data : null;
  }

  // 设置会话数据
  setSessionData(sessionId: any, data: any) {
    const session = this.getSession(sessionId);
    if (session) {
      session.data = { ...session.data, ...data };
    }
  }

  // 清理过期会话
  cleanupExpiredSessions() {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [sessionId, session] of this.sessions.entries()) {
      if (now - session.lastActive > this.sessionTimeout) {
        this.destroySession(sessionId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`Cleaned ${cleanedCount} expired sessions`);
    }
  }

  // 启动清理定时器
  startCleanupTimer() {
    setInterval(() => {
      this.cleanupExpiredSessions();
    }, this.cleanupInterval);
  }

  // 获取所有会话统计信息
  getStats() {
    return {
      totalSessions: this.sessions.size,
      activeSessions: Array.from(this.sessions.values()).filter(
        (session) => Date.now() - session.lastActive < 5 * 60 * 1000 // 5分钟内活跃
      ).length,
    };
  }
}
