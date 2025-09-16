const jwt = require("jsonwebtoken");
const db = require("../config/db");
const jwtSecret = process.env.JWT_SECRET;

exports.refreshToken = (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).json({ message: "Thiếu refresh token" });
  }

  // Kiểm tra refresh token hợp lệ
  jwt.verify(refreshToken, jwtSecret, (err, decoded) => {
    if (err)
      return res.status(403).json({ message: "Refresh token không hợp lệ" });

    const userId = decoded.userId;

    // Kiểm tra refresh token có trùng với token trong DB không
    const sql = "SELECT * FROM users WHERE id = $1 AND refresh_token = $2";
    db.query(sql, [userId, refreshToken], (err, results) => {
      if (err) return res.status(500).json({ message: "Lỗi server" });
      if (results.rows.length === 0) {
        return res.status(403).json({ message: "Refresh token không hợp lệ" });
      }

      // Tạo access token mới
      const newAccessToken = jwt.sign(
        { id: userId, email: results.rows[0].email },
        jwtSecret,
        { expiresIn: "7d" }
      );

      res.json({ accessToken: newAccessToken });
    });
  });
};
