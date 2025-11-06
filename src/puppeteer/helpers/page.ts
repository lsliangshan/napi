import { BrowserContext } from "puppeteer";

export async function createPage(context: BrowserContext, cookies: any[] = []) {
  const page = await context.newPage();
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
  return page;
}
