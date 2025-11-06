import Koa from 'koa';

const cookiesMiddleware: Koa.Middleware = async (ctx, next) => {
  const cookies = ctx.header.cookie;
  let cookieObj = {};

  if (cookies) {
    cookieObj = cookies.split(';').reduce((acc: { [key: string]: any }, cookie) => {
      const [key, value] = cookie.trim().split('=');
      acc[key] = decodeURIComponent(value);
      return acc;
    }, {});
  }

  ctx.state.cookies = cookieObj; // 将 cookies 附加到 ctx.state 上
  await next();
};

export default cookiesMiddleware;
