const WebSocket = require("ws");
const dotenv = require("dotenv");
const fs = require("fs").promises; // ✅ Sửa để dùng await
const path = require("path");
const s3 = require("./src/config/S3"); 
const UploadToS3 = require("./src/util/UploadToS3");
const { Pool } = require("pg");


dotenv.config();

// Kết nối PostgreSQL
const db = require("./src/config/db");

db.connect((err) => {
  if (err) {
    console.error("Lỗi kết nối PostgreSQL:", err);
    process.exit(1);
  }
  console.log("✅ Kết nối PostgreSQL thành công tại WS");
});

db.query("SELECT current_database()", (err, results) => {
  if (err) {
    console.error("Lỗi kiểm tra database:", err);
  } else {
    console.log("📂 Đang kết nối database:", results.rows[0].current_database);
  }
});

const wss = new WebSocket.Server(
  { port: 8090, maxPayload: 10 * 1024 * 1024 },
  () => {
    console.log("🌐 WebSocket server đang chạy trên cổng 8090");
  }
);

// Map lưu uid => ws
const clients = new Map();
const clientDataMap = new Map(); // Lưu trữ dữ liệu ảnh tạm thời


wss.on("connection", (ws) => {
  console.log("🔌 Client WebSocket kết nối");


  let userUid = null;

  async function  handleBinaryImage(ws, message) {
        try {
          clientDataMap.set(ws, {imageBuffer: message });
          console.log("📷 Ảnh buffer đã nhận, chờ metadata...");
        } catch (err){
          console.error("Lỗi xử lí ảnh nhị phân", err);
          ws.send(
            JSON.stringify({type: "error", message: "Lỗi xử lí ảnh nhị phân"})
          )
        }

      }

  

  ws.on("message", async (message, isBinary ) => {
    if( isBinary ) {
      await handleBinaryImage(ws, message);
      return;
    }
      
    
    try {
      const data = JSON.parse(message);

      if (data.type === "register") {
        userUid = data.uid;
        clients.set(userUid, ws);
        console.log(`🆔 User ${userUid} đã đăng ký WebSocket`);
        return;
      }

      // Lấy lịch sử tin nhắn giữa hai người dùng
      if (data.type === "get_messages") {
        const { fromUserId, toUserId } = data;
        const sql = `
    SELECT id, fromUserId, toUserId, content, createdAt FROM messages
    WHERE (fromUserId = $1 AND toUserId = $2) OR (fromUserId = $2 AND toUserId = $1)
    ORDER BY createdAt ASC
  `;
        db.query(
          sql,
          [fromUserId, toUserId, toUserId, fromUserId],
          (err, results) => {
            if (err) {
              console.error("❌ Lỗi lấy danh sách tin nhắn:", err);
              ws.send(
                JSON.stringify({ type: "error", message: "Lỗi lấy tin nhắn" })
              );
              return;
            }

            const messages = results.map((msg) => ({
              id: msg.id,
              fromUserId: msg.fromUserId,
              toUserId: msg.toUserId,
              content: msg.content,
              timestamp: msg.createdAt,
            }));

            ws.send(
              JSON.stringify({
                type: "messages_list",
                messages,
              })
            );
          }
        );
      }


      // Xử lý ảnh live
      if (data.type === "live_image") {
        try {
          const { uid, filename, description, camera_type, timestamp, mediaType } = data;
            
          const imageBuffer = clientDataMap.get(ws)?.imageBuffer;
          console.log("📦 Buffer tồn tại không?", !!imageBuffer);
          if(!imageBuffer) {
            ws.send(
              JSON.stringify({type: "live_image_ack", status: "error", message: "Không có ảnh để lưu"})
            )
            return
          }

          const imageUrl = await UploadToS3(imageBuffer, filename, uid  );
          console.log("📝 Gửi lên S3:",imageUrl);

          const createdAt = timestamp ? new Date(Number(timestamp)) : new Date();
          console.log("🕒 createdAt:", createdAt.toISOString());
          const sql =
            "INSERT INTO live_images (uid, imageUrl, description, createdAt, camera_type, mediaType) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id";
          console.log("➡️ Dữ liệu lưu ảnh:", {
            uid: uid,
            imageUrl,
            description,
            createdAt,
            camera_type,
          });
          db.query(
            sql,
            [uid, imageUrl, description, createdAt, camera_type, mediaType || "image"],
            (err, result) => {
              if (err) {
                console.error("❌ Lỗi lưu ảnh live vào DB:", err);
                return;
              }
              console.log("✅ Ảnh đã lưu vào DB, ID:", result.rows[0].id);


              const insertedId = result.rows[0].id;
              console.log("🆔 ID ảnh mới:", insertedId);
              ws.send(
                JSON.stringify({
                  type: "live_image_ack",
                  status: "ok",
                  message: "Ảnh đã được lưu",
                  imageId: result.rows[0].id,
                })
              );
              clientDataMap.delete(ws);

              wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                  client.send(
                    JSON.stringify({
                      type: "new_image",
                      id: result.rows[0].id, // gửi id mới đây
                      uid,
                      imageUrl: imageUrl,
                      description,
                      mediaType: mediaType || "image", 
                      timestamp: createdAt.toISOString(),
                    })
                  );
                }
              });
            }
          );
        } catch (err) {
          console.error("❌ Lỗi xử lý ảnh live:", err);
        }
      }

      //lấy ảnh từ API
      if (data.type === "get_images_list") {
        const { uid } = data;

        const sql =
          "SELECT id,uid, imageUrl, description,createdAt, camera_type, mediaType  FROM live_images WHERE uid = $1 ORDER BY createdAt DESC";
        db.query(sql, [uid], (err, results) => {
          if (err) {
            console.error("Lỗi lấy danh sách ảnh:", err);
            ws.send(
              JSON.stringify({
                type: "error",
                message: "Lỗi lấy danh sách ảnh",
              })
            );
            return;
          }
          // Chuyển đổi imageUrl nếu cần (nếu chỉ lưu đường dẫn tương đối)
          const images = results.map((row) => ({
            id: row.id,
            uid: row.uid,
            imageUrl: row.imageUrl, // sửa IP_SERVER thành IP thật
            description: row.description,
            createdAt: row.createdAt
              ? row.createdAt.toISOString()
              : new Date().toISOString(),
            camera_type: row.camera_type,
            mediaType: row.mediaType || "image", 
          }));

          ws.send(
            JSON.stringify({
              type: "images_list",
              images,
            })
          );
        });
      }

      // Xử lý tin nhắn
      if (data.type === "message") {
        const { fromUserId, toUserId, content } = data;
        console.log(`💬 Tin nhắn từ ${fromUserId} tới ${toUserId}: ${content}`);

        const sql =
          "INSERT INTO messages (fromUserId, toUserId, content, createdAt) VALUES ($1, $2, $3, NOW())";
        db.query(sql, [fromUserId, toUserId, content], (err, result) => {
          if (err) {
            console.error("❌ Lỗi lưu tin nhắn vào DB:", err);
          } else {
            console.log("✅ Tin nhắn đã lưu, ID:", result.rows[0].id);
          }
        });

        const receiverWs = clients.get(toUserId);
        if (receiverWs && receiverWs.readyState === WebSocket.OPEN) {
          receiverWs.send(
            JSON.stringify({
              type: "message",
              fromUserId,
              toUserId,
              content,
              timestamp: new Date().toISOString(),
            })
          );
        }
      }

      //gửi lời mời kết bạn
      if (data.type === "friend_request") {
        const {fromUserId, toUserId } = data;

        if (fromUserId === toUserId) {
          ws.send(
            JSON.stringify({
              type: "Lỗiii",
              message: "khong thể gửi ",
            })
          );
          return;
        }

        const checkFriendSql = `SELECT * FROM friends WHERE (userId = $1 AND friendId = $2) OR (userId = $2 AND friendId = $1)`;
        db.query(
          checkFriendSql,
          [fromUserId, toUserId, toUserId, fromUserId],
          (err, friendResults) => {
            if (err) {
              console.error("❌ Lỗi gửi lời mời kết bạn:", err);
              ws.send(
                JSON.stringify({
                  type: "error",
                  message: "Lỗi server khi kiểm tra bạn bè",
                })
              );
              return;
            }
            if (friendResults.length > 0) {
              ws.send(
                JSON.stringify({
                  type: "error",
                  message: "Hai bạn đã là bạn bè",
                })
              );
              return;
            }

            const checkRequestSql = `SELECT * FROM friend_requests WHERE ((fromUserId= $1 AND toUserId = $2) 
            OR (fromUserId = $2 AND toUserId = $1)) AND status = 'pending'`;
            db.query(
              checkRequestSql,
              [fromUserId, toUserId, toUserId, fromUserId],
              (err, requestResults) => {
                if (err) {
                  console.error("Lỗi lời mời");
                  ws.send(
                    JSON.stringify({ type: "error", message: "lỗi lời mời" })
                  );
                  return;
                }
                if (requestResults.length > 0) {
                  ws.send(
                    JSON.stringify({
                      type: "error",
                      message: "Đã gửi lời mời",
                    })
                  );
                  return;
                }
                const insertSql = `INSERT INTO friend_requests (fromUserId, toUserId, status) VALUES ($1, $2, 'pending')`;

                db.query(insertSql, [fromUserId, toUserId], (err, result) => {
                  if (err) {
                    console.error("❌ Lỗi gửi lời mời kết bạn:", err);
                    ws.send(
                      JSON.stringify({
                        type: "error",
                        message: "Gửi lời mời thất bại",
                      })
                    );
                    return;
                  }
                  const requestID = result.rows[0].id
                  console.log(
                    `📨 ${fromUserId} đã gửi lời mời kết bạn tới ${toUserId} (ID: ${requestID})`
                  );

                  const receiverWs = clients.get(toUserId);
                  if (receiverWs && receiverWs.readyState === WebSocket.OPEN) {
                    receiverWs.send(
                      JSON.stringify({
                        type: "friend_request_received",
                        fromUserId,
                        requestId:requestID 
                      })
                    );
                  }
                  ws.send(
                    JSON.stringify({ type: "friend_request_sent",requestID, toUserId,status: "success" })
                  );
                });
              }
            );
          }
        );
      }

      //Đồng ý bạn bè
      if (data.type === "accept_friend") {
        const { fromUserId, toUserId } = data;

        const updateSql =
          'UPDATE friend_requests SET status = "accepted" WHERE fromUserId = $1 AND toUserId = $2';
        db.query(updateSql, [fromUserId, toUserId], (err, result) => {
          if (err) {
            console.error("❌ Lỗi cập nhật lời mời kết bạn:", err);
            return;
          }

          const insertFriendSql =
            "INSERT INTO friends (userId, friendId) VALUES ($1, $2), ($3, $4)";
          db.query(
            insertFriendSql,
            [fromUserId, toUserId, toUserId, fromUserId],
            (err) => {
              if (err) {
                console.error("❌ Lỗi lưu bạn bè:", err);
                return;
              }

              console.log(
                `🤝 ${fromUserId} và ${toUserId} đã trở thành bạn bè`
              );

              const senderWs = clients.get(fromUserId);
              if (senderWs && senderWs.readyState === WebSocket.OPEN) {
                senderWs.send(
                  JSON.stringify({
                    type: "friend_accepted",
                    byUserId: toUserId,
                  })
                );
              }

              ws.send(
                JSON.stringify({
                  type: "friend_accepted",
                  byUserId: fromUserId,
                })
              );
            }
          );
        });
      }

      //Danh sách bạn bè
      if (data.type === "get_friends") {
        const { uid } = data;

        const sql = `
    SELECT friendId FROM friends WHERE userId = $1
  `;
        db.query(sql, [uid], (err, results) => {
          if (err) {
            console.error("❌ Lỗi lấy danh sách bạn bè:", err);
            ws.send(
              JSON.stringify({ type: "error", message: "Lỗi lấy bạn bè" })
            );
            return;
          }

          const friends = results.map((row) => row.friendId);

          ws.send(
            JSON.stringify({
              type: "friends_list",
              friends,
            })
          );
        });
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
    clientDataMap.delete(ws);
  });
});
