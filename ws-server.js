const WebSocket = require("ws");
const dotenv = require("dotenv");


dotenv.config();

// Kết nối PostgreSQL
const db = require("./src/config/db");


const wss = new WebSocket.Server(
  { port: 8090, maxPayload:1024 * 1024 },
  () => {
    console.log("🌐 WebSocket server đang chạy trên cổng 8090");
  }
);

// Map lưu uid => ws
const clients = new Map();


wss.on("connection", (ws) => {
  console.log("🔌 Client WebSocket kết nối");


  let userUid = null;
  ws.isAlive = true;

  ws.on("pong", () => {
    ws.isAlive = true;
  })


  ws.on("message", async (message ) => {
    try {
      const data = JSON.parse(message)

      switch (data.type) {
        case "AUTH":
          userUid = data.uid;
          clients.set(userUid, ws);
          console.log(`✅ User ${userUid} authenticated`);

          ws.send(JSON.stringify({ 
            type: "AUTH_SUCCESS",
            uid: userUid
          }));
          break;
        case "PING":
          ws.send(JSON.stringify({ type: "PONG" }));
          break;

        default:
          console.log("❓ Tin nhắn không xác định:", data.type);
          break;
      }



    } catch (e) {
      console.error("❌ Lỗi parse JSON:", e);
    }
  });

  ws.on("close", () => {
    console.log("🔌 Client ngắt kết nối");
    if (userUid) {
      clients.delete(userUid);
      console.log(`🗑️ User ${userUid} đã bị xóa khỏi danh sách clients`);
    }
  });
});

ws.on("error", (error) => {
  console.error("❌ Lỗi WebSocket:", error);
})

const heartbeat = setInterval(() => {
  wss.clients.forEach((ws) => {
    if(ws.isAlive === false) {
      console.log("❌ Kết nối chết, đóng kết nối");
      return ws.terminate();
    }
    ws.isAlive = false;
    ws.ping();
  })
}, 30000)

wss.on("close", () => {
  clearInterval(heartbeat)
});

function broadcast(data, excludeUid = null) {
  const message = JSON.stringify(data);
  let sentCount = 0;

  clients.forEach((ws, uid) => {
    if(uid !== excludeUid && ws.readyState === WebSocket.OPEN) {
      ws.send(message);
      sentCount++;
    }
  });
  console.log(`📢 Broadcast message to ${sentCount} clients`);
}

function sendToUser(uid, data) {
  const ws = clients.get(uid);
  if(ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
    console.log(`✉️ Gửi tới người dùng ${uid}`);
  } else {
    console.log(`❌ Không thể gửi tới người dùng ${uid}, kết nối không mở`);
  }
}

function getStats() {
  return {
    totalClients: clients.size,
    clients: Array.from(clients.keys())
  };
}

module.exports = {
  broadcast,
  sendToUser,
  getStats
}


