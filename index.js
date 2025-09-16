const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const { Pool } = require("pg");
const dotenv = require("dotenv");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const path = require("path");
require("./ws-server")

const authRouter = require("./src/routes/authRoutes")
const userRouter = require("./src/routes/userRoutes")
const imageRouter = require("./src/routes/imageRoutes")
const feedRouter = require("./src/routes/feedRoutes")

dotenv.config();
const jwtSecret = process.env.JWT_SECRET;
const app = express();
app.use(cors());
app.use(bodyParser.json());




// Kết nối cơ sở dữ liệu
const db = require("./src/config/db");

// API người dùng
app.use("/api-user", userRouter)

//API lấy access token mới từ refresh token
app.use("/api-auth", authRouter ) 

// Trả về danh sách ảnh (mới nhất trước)
app.use("/api-image",imageRouter )

app.use("/api-feed", feedRouter)

// API tìm bạn bè qua uid
app.get("/search-friend", (req, res) => {
  const { uid } = req.query; // hoặc dùng req.body nếu bạn muốn POST

  if (!uid) {
    return res.status(400).json({ message: "Thiếu uid để tìm kiếm" });
  }

  const sql =
    "SELECT id, email, firstName, lastName, uid FROM users WHERE uid LIKE $1 LIMIT 20";
  db.query(sql, [`${uid}%`], (err, results) => {
    if (err) return res.status(500).json({ message: "Lỗi server" });

    if (results.rows.length === 0) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy bạn bè với uid này" });
    }

    // Trả về thông tin bạn bè
    res.json({ friend: results.rows });
  });
});



app.use("/uploads", express.static(path.join(__dirname, "uploads")));


const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server đang chạy tại http://localhost:${PORT}`);
});
