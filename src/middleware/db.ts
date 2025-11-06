import Koa from "koa";

import { DB } from "../services/db";
import { Category } from "../models/category.model";
import { App } from "../models/app.model";
import { Genre } from "../models/genre.model";
import { Plugin } from "../models/plugin.model";

const dbMiddleware: Koa.Middleware = async (ctx, next) => {
  const sequelize = DB.getInstance();

  ctx.state.db = sequelize;
  await sequelize.sync({ force: false });
  Category.hasMany(App);
  App.belongsTo(Category, {
    foreignKey: "categoryId",
    targetKey: "id",
  });

  Genre.hasMany(Plugin);
  Plugin.belongsTo(Genre, {
    foreignKey: "genreId",
    targetKey: "id",
  });

  // Role.hasMany(User)
  // User.belongsTo(Role, {
  //   foreignKey: 'roleId',
  //   targetKey: 'id'
  // })

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

export default dbMiddleware;
