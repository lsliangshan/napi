import Koa from 'koa';

export const healthHandler = (ctx: Koa.Context) => {
  ctx.body = {
    code: 200,
    message: 'Ok'
  };
}