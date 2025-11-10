import Koa from "koa";
import bodyParser from "koa-bodyparser";
import routes from "./routes/routes";
import cookiesMiddleware from "./middleware/cookies";
import dotenv from "dotenv";
import cors from "koa2-cors";
import koaBody from "koa-body";
import { join } from "path";
import { createServer } from "https";
import { Server } from "socket.io";
import SocketIO from "./services/socketio";
import session from "koa-session";
import clusterManager from "./puppeteer/cluster/index";
import { initTask } from "./puppeteer/tasks/index";
import fs from "fs";

const app = new Koa();

app.use(
  cors({
    origin: "*",
    maxAge: 3600,
    credentials: true,
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: [
      "Content-Type",
      "Authorization",
      "Accept",
      "X-Custom-Header",
      "anonymous",
    ],
    // origin: function (ctx: Koa.Context) {
    //   const o = ctx.request.header.origin
    //   if (o && o.includes('.zhaopin.')) {
    //     return o;
    //   }
    //   return false;
    // },
  })
);

// 设置签名密钥，用于加密 Cookie
app.keys = ["your-secret-key"]; // :cite[5]:cite[6]

// 会话配置
const CONFIG = {
  key: "koa:sess", // Cookie 中会话 ID 的键名，默认 'koa:sess':cite[5]:cite[6]
  maxAge: 86400000, // 会话过期时间（毫秒），默认一天:cite[5]:cite[6]
  httpOnly: true, // 仅服务器可访问，有助于防止 XSS 攻击:cite[5]:cite[6]
  signed: true, // 对 Cookie 进行签名，防止篡改:cite[5]
  rolling: false, // 是否在每次响应时重置 maxAge:cite[5]:cite[6]
  renew: false, // 会话快过期时是否自动续期:cite[5]:cite[6]
};

// 注册 session 中间件
app.use(session(CONFIG, app)); // :cite[5]:cite[6]

app.use(
  koaBody({
    multipart: true,
    formidable: {
      maxFileSize: 200 * 1024 * 1024,
      keepExtensions: true,
      uploadDir: join(__dirname, "uploads"),
    },
  })
);

app.use(async (ctx: Koa.Context, next: Koa.Next) => {
  console.log(`[${new Date().toISOString()}] ${ctx.method} ${ctx.url}`);
  await next();
});

app.use(bodyParser());
app.use(cookiesMiddleware);
// app.use(authMiddleware);

dotenv.config();

// 注册路由
app.use(routes.routes());

clusterManager.initialize().then(async (cluster) => {
  if (cluster) {
    await initTask(cluster);
  }
});

// 优雅关闭
process.on("SIGINT", async () => {
  console.log("正在关闭服务器...");
  await clusterManager.close();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("正在关闭服务器...");
  await clusterManager.close();
  process.exit(0);
});

// Socket.io 设置
const httpServer = createServer(
  {
    key: fs.readFileSync(join(__dirname, "key.pem")),
    cert: fs.readFileSync(join(__dirname, "cert.pem")),
  },
  app.callback()
);
const io = new Server(httpServer, {
  path: "/ws",
  cors: {
    origin: "*", // 或指定某个域名 如 'http://localhost:8080'
    methods: ["GET", "POST"],
  },
});

const socketio = SocketIO.getInstance(io);

io.on("connection", (socket: any) => {
  console.log(">>>>>. socket.id: ", socket.id);
  socketio.connectionHandler(socket);
});

const adminNamespace = io.of("/admin");
adminNamespace.on("connection", (socket) => {
  console.log("有人连接到了 /admin 命名空间");
  socket.emit("message", "欢迎来到管理后台");
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
