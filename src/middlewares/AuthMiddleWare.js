const db = require("../config/db");
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET;

const AuthMiddleWare = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    if (!authHeader) {
      return res.status(401).json({ message: "Thiếu Token" });
    }
    const token = authHeader.split(" ")[1];
    console.log("Received Token:", token);
    if (!token) {
      console.log("Token không được cung cấp trong header");
      return res.status(401).json({ message: "Token không hợp lệ" });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    console.log("Decoded Token:", decoded);

    const userId = parseInt(decoded.userId, 10);


    const result = await db.query(
      `SELECT id, uid, firstname, lastname, email FROM users WHERE id = $1`,
      [userId]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ message: "Người dùng Không Tồn Tại" });
    }

    req.user = result.rows[0];
    next();
  } catch (err) {
    console.error("Lỗi xác thực Token:", err.message);
    console.log("Header nhận được", authHeader);
    res.status(403).json({ message: "Token không hợp lệ hoặc đã hết hạn" });
  }
};
module.exports = AuthMiddleWare;
