import puppeteer, { Browser } from "puppeteer";

let browser: any;

// 启动单例浏览器
export async function getBrowser() {
  if (!browser) {
    browser = await puppeteer.launch({
      headless: true,
      timeout: 0,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage", // 避免 /dev/shm 使用问题
        "--disable-gpu", // 服务器通常不需要 GPU 加速
        "--disable-software-rasterizer", // 禁用软件光栅化器
        "--no-first-run",
        "--no-zygote",
        "--disable-web-security", // 如果需要跨域
        "--disable-features=VizDisplayCompositor", // 禁用特定功能
        "--disable-background-timer-throttling",
        "--disable-backgrounding-occluded-windows",
        "--disable-renderer-backgrounding",
      ],
      dumpio: true, // 启用详细日志
      defaultViewport: { width: 1280, height: 720 },
    });

    // browser.on('disconnected', () => {
    //   browser = null;
    // });
  }
  return browser;
}

// 创建新的上下文（隔离 session）
export async function createContext(cookies: any[] = []) {
  const browser = await getBrowser();
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
  );
  if (cookies && cookies.length > 0) {
    await page.deleteCookie(...(await page.cookies()));
    await page.setCookie(...cookies);
  }
  page.setDefaultNavigationTimeout(6000000);
  return { context, page };
}

// 清理上下文
export async function closeContext(context: any) {
  try {
    await context.close();
  } catch (err) {
    console.error("closeContext error:", err);
  }
}
