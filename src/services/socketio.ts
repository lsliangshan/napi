import { SocketEvent } from "./types";

export default class SocketIO {
  private static instance: SocketIO | null = null;

  private static io: any;

  private static clients = new Map();

  private constructor(io?: any) {
    if (io) {
      SocketIO.io = io;
    }
  }

  public static getInstance(io?: any): SocketIO {
    if (!SocketIO.instance) {
      SocketIO.instance = new SocketIO(io);
    }
    return SocketIO.instance;
  }

  public connectionHandler(socket: any) {
    const query = socket.handshake.query || {};
    console.log(">>>>> user connect: ", query);
    SocketIO.clients.set(query.uid, {
      id: socket.id,
      uid: query.uid,
      uname: query.uname,
      socket,
    });

    socket.on("disconnect", () => {
      console.log("user disconnected");
      if (SocketIO.clients.has(query.uid)) {
        SocketIO.clients.delete(query.uid);
      }
    });

    socket.emit("message", {
      form: "server",
      data: "Hello",
    });

    // setTimeout(() => {
    //   socket.emit("message", {
    //     form: "server",
    //     data: "Hello 22222",
    //   });
    // }, 4000);

    socket.on("message", (msg: any) => {
      console.log("message:", msg);
      // 可以选择广播消息或其他逻辑
    });
  }

  public sendMessage(id: string, event: SocketEvent) {
    const _socket = SocketIO.clients.get(`${id}`);
    if (_socket) {
      _socket.socket.emit("message", {
        ...event,
        form: {
          uid: SocketIO.clients.get(`${id}`).uid,
          uname: SocketIO.clients.get(`${id}`).uname,
        },
      });
    }
  }

  public broadcastMessage(event: SocketEvent) {
    SocketIO.clients.forEach((client) => {
      client.socket.emit(event.eventName, event.data);
    });
  }

  public getAllClients() {
    return SocketIO.clients;
  }
}
