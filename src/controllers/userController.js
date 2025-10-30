const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../config/db");
const multer = require("multer");
const uploadToS3 = require("../util/UploadToS3");
const upload = multer({ storage: multer.memoryStorage() });

const jwtSecret = process.env.JWT_SECRET;

// API đăng ký


//Lấy uid
exports.getUID = (req, res) => {
  const authHeader = req.headers["authorization"];
  if (!authHeader) {
    return res.status(401).json({ message: "Chưa có token" });
  }

  const token = authHeader.split(" ")[1];
  jwt.verify(token, jwtSecret, (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: "Token không hợp lệ" });
    }
    const userId = decoded.userId; // lấy userId từ token đã giải mã

    // Truy vấn database để lấy uid dựa trên userId
    const sql = "SELECT uid FROM users WHERE id = $1";
    db.query(sql, [userId], (err, results) => {
      if (err) return res.status(500).json({ message: "Lỗi server" });
      if (results.rows.length === 0) {
        return res.status(404).json({ message: "Không tìm thấy uid" });
      }
      res.json({ uid: results.rows[0].uid });
    });
  });
};

//API profileImage
exports.uploadProfile = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const uid = req.user.uid;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: "Thiếu file profileImage" });
    }

    const imageProfile = await uploadToS3(file.buffer, file.originalname, uid);

    const sql = `
    UPDATE users 
    SET profileimage = $1 
    WHERE id = $2
    RETURNING profileimage`;

    const result = await db.query(sql, [imageProfile, currentUserId]);
    
    
    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }

    res.json({ profileImage: result.rows[0].profileimage });
  } catch (err) {
    console.error("Lỗi upload ảnh:", err);
    res.status(500).json({ message: "Lỗi server" });
  }
};

exports.getUsers = async (req, res) => {
  const uid = req.params.uid;
  const currentUserId = req.user.id;
  console.log("📥 Vào getUsers với uid:", req.params.uid, "| currentUserId:", req.user.id);
  const sql = `SELECT 
      u.id, 
      u.email, 
      u.firstname, 
      u.lastname, 
      u.uid,  
      u.profileimage,
      p.bio,
      (SELECT COUNT(*) FROM follows f1 WHERE f1.following_id = u.id) AS followers_count,
      (SELECT COUNT(*) FROM follows f2 WHERE f2.follower_id = u.id) AS following_count,
      CASE
        WHEN u.id = $2 THEN NULL
        ELSE EXISTS (
          SELECT 1 FROM follows
          WHERE follower_id = $2 AND following_id = u.id
          )
      END AS is_following
      FROM users u 
      LEFT JOIN profile p ON p.user_id = u.id
      WHERE u.uid = $1`;
  try {
    const result = await db.query(sql, [uid, currentUserId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "user không tồn tại" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Lỗi lấy thông tin user:", err);
    res.status(500).json({ message: "Lỗi server" });
  }
};

exports.updateUserProfile = async (req, res) => {
  const currentUserId = req.user.id;
  const { firstname, uid, bio, profileimage } = req.body;

  try {
    await db.query(
      `UPDATE users
      SET firstname = COALESCE($1, firstname), 
          uid = COALESCE($2, uid),
          profileimage = COALESCE($3, profileimage),
          created_at = NOW()
    WHERE id = $4`,
      [firstname, uid, profileimage, currentUserId]
    );
    await db.query(
      `INSERT INTO profile (user_id, bio, updated_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (user_id)
        DO UPDATE SET bio = EXCLUDED.bio, updated_at = NOW()`,
        [currentUserId, bio]
    );

    const sql = `
      SELECT 
        u.id,
        u.uid,
        u.firstname,
        u.email,
        u.profileimage,
        p.bio
      FROM users u
      LEFT JOIN profile p ON p.user_id = u.id
      WHERE u.id = $1
    `;
    
    const result = await db.query(sql, [currentUserId])
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Loi cap nhat ho so", err.message)
    res.status(500).json({message: "Loi server"})
  }
};
