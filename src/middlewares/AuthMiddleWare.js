const db = require("../config/db");
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET;

const AuthMiddleWare = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    if (!authHeader) {
      return res.status(401).json({ message: "Thieu Token" });
    }
    const token = authHeader.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "Token khong hop le" });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    const result = await db.query(
      `SELECT id, uid, firstname, lastname, email FROM users WHERE id = $1`,
      [decoded.id]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ message: "User No Exist" });
    }

    req.user = result.rows[0];
    next();
  } catch (err) {
    console.error("Loi xac thuc Token:", err);
    res.status(403).json({ message: "Token không hợp lệ hoặc đã hết hạn" });
  }
};
module.exports = AuthMiddleWare;
