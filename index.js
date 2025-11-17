const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
require("./ws-server")

const authRouter = require("./src/routes/authRoutes")
const userRouter = require("./src/routes/userRoutes")
const feedRouter = require("./src/routes/feedRoutes")
const followRouter = require("./src/routes/followRoutes")

dotenv.config();
const app = express();
app.use(cors());
app.use(bodyParser.json());


// API người dùng
app.use("/api-user", userRouter)

//API lấy access token mới từ refresh token
app.use("/api-auth", authRouter ) 

//Lấy post
app.use("/api-feed", feedRouter)

//DANH SÁCH THEO DÕI, BẠN BÈ
app.use("/api-follow", followRouter)



app.use("/uploads", express.static(path.join(__dirname, "uploads")));
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server đang chạy tại http://localhost:${PORT}`);
});
