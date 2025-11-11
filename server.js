import { createServer } from "https";
import { Server } from "socket.io";
import fs from "fs";
import { join } from "path";
import WebSocket from "ws";

// const httpServer = createServer();
const server = createServer({
  key: fs.readFileSync("./localhost+3-key.pem"),
  cert: fs.readFileSync("./localhost+3.pem"),
});

// 创建 WebSocket 服务器，并将其挂载到同一个 HTTP 服务器上
const wss = new WebSocket.Server({ server });

// 处理 WebSocket 连接
wss.on("connection", function connection(ws, request) {
  // request 可用于获取连接请求信息
  console.log("新的 WebSocket 连接已建立");

  // 监听客户端发送的消息
  ws.on("message", function incoming(message) {
    console.log("收到消息: %s", message);
    // 这里可以解析 message 并做相应处理

    // 示例：回复客户端
    // ws.send(`服务器收到：${message}`);
  });

  // 监听连接关闭
  ws.on("close", function close() {
    console.log("WebSocket 连接已关闭");
  });

  // 可选：监听错误
  ws.on("error", console.error);

  // 连接建立后，立即向客户端发送一条欢迎消息
  ws.send("欢迎连接 WebSocket 服务器！");
});

server.listen(4000);
