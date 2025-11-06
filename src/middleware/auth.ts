import Koa from 'koa';

// import { whitelistRoutes } from '../routes/routes'

const authMiddleware: Koa.Middleware = async (ctx, next) => {
  await next();
  // if (whitelistRoutes.includes(ctx.request.url)) {
  //   await next();
  //   return;
  // }
  // if (ctx.request.header.origin?.includes('img09.zhaopin.cn')) {
  //   await next();
  //   return;
  // }
  // const requestBody: { [key: string]: any } = ctx.request.body || {};
  // const auth = ctx.cookies.get('INNER_AUTHENTICATION') || requestBody?.cookies?.INNER_AUTHENTICATION;
  // const at = ctx.cookies.get('at') || requestBody?.cookies?.at;
  // const rt = ctx.cookies.get('rt') || requestBody?.cookies?.rt;

  // if (!auth && !at && !rt) {
  //   ctx.status = 401;
  //   ctx.body = {
  //     code: 401,
  //     message: 'Access Denied',
  //   };
  // } else {
  //   await next();
  // }
};

export default authMiddleware;
