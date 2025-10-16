const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../config/db");
const multer = require("multer");
const uploadToS3 = require("../util/UploadToS3");
const upload = multer({ storage: multer.memoryStorage() });

const jwtSecret = process.env.JWT_SECRET;

// API đăng ký
exports.register = async (req, res) => {
  const { email, password, firstName, uid } = req.body;
  const lastName = req.body.lastName || ""; // Nếu lastName không bắt buộc, có thể để trống
  if (!email || !password || !firstName || !uid) {
    return res.status(400).json({ message: "Vui lòng nhập đầy đủ thông tin" });
  }
  try {
    // Hash mật khẩu trước khi lưu
    const hashedPassword = await bcrypt.hash(password, 10);

    const sql =
      "INSERT INTO users (email, password, firstName, lastName, uid) VALUES ($1, $2, $3, $4, $5) RETURNING id";
    db.query(
      sql,
      [email, hashedPassword, firstName, lastName, uid],
      (err, result) => {
        if (err) {
          if (err.code === "23505") {
            return res
              .status(409)
              .json({ message: "Email hoặc UID đã tồn tại" });
          }
          return res.status(500).json({ message: "Lỗi server", error: err });
        }
        res.json({ message: "Đăng ký thành công", userId: result.rows[0].id });
      }
    );
  } catch (error) {
    res.status(500).json({ message: "Lỗi hash mật khẩu", error });
  }
};

// API đăng nhập
exports.login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Vui lòng nhập email và mật khẩu" });
  }

  const sql = "SELECT * FROM users WHERE email = $1";
  db.query(sql, [email], async (err, results) => {
    if (err) {
      console.log("Lỗi khi lưu refresh token:", err);
      return res.status(500).json({ message: "Lỗi server" });
    }
    if (results.rows.length === 0) {
      return res.status(404).json({ message: "Email không tồn tại" });
    }

    const user = results.rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Mật khẩu không đúng" });
    }

    // Tạo access token (7 ngày)
    const accessToken = jwt.sign(
      { userId: user.id, email: user.email },
      jwtSecret,
      { expiresIn: "7d" }
    );

    const refreshToken = jwt.sign({ userId: user.id }, jwtSecret, {
      expiresIn: "30d",
    });

    const sqlUpdate = "UPDATE users SET refresh_token = $1 WHERE id = $2";
    db.query(sqlUpdate, [refreshToken, user.id], (err2) => {
      if (err2) {
        return res.status(500).json({ message: "Lỗi lưu refresh token" });
      }
      res.json({
        message: "Đăng nhập thành công",
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          uid: user.uid,
        },
      });
    });
  });
};

// API đăng kí check email tồn tại
exports.checkEmail = (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Thiếu email" });
  }

  const sql = "SELECT * FROM users WHERE email = $1";
  db.query(sql, [email], (err, results) => {
    if (err) return res.status(500).json({ message: "Lỗi server" });
    if (results.rows.length > 0) {
      return res.status(409).json({ message: "Email đã tồn tại" });
    } else {
      return res.json({ message: "Email hợp lệ" });
    }
  });
};

//API UID check tồn tại
exports.checkUid = (req, res) => {
  const { uid } = req.body;

  if (!uid) {
    return res.status(400).json({ message: "Thiếu uid" });
  }

  const sql = "SELECT * FROM users WHERE uid = $1";
  db.query(sql, [uid], (err, results) => {
    if (err) return res.status(500).json({ message: "Lỗi server" });
    if (results.rows.length > 0) {
      return res.status(409).json({ message: "uid đã tồn tại" });
    }
    res.status(200).json({ message: "uid hợp lệ" });
  });
};

//check API email đăng nhập
exports.checkEmailLogin = (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Thiếu email" });
  }

  const sql = "SELECT * FROM users WHERE email = $1";
  db.query(sql, [email], (err, results) => {
    if (err) return res.status(500).json({ message: "Lỗi server" });
    if (results.rows.length > 0) {
      // Email đã tồn tại, cho phép tiếp tục đăng nhập
      return res.status(200).json({ message: "Email tồn tại" });
    } else {
      // Email chưa đăng ký
      return res.status(404).json({ message: "Email chưa đăng ký" });
    }
  });
};

//Api đăng xuất
exports.LogOut = (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken)
    return res.status(400).json({ message: "Thiếu refteshtoken" });
  const sql = "UPDATE users SET refresh_token = NULL WHERE refresh_token = $1";

  db.query(sql, [refreshToken], (err, result) => {
    if (err) return res.status(500).json({ message: "Lỗi server khi logout" });
    if (result.rowCount === 0)
      return res.status(400).json({ message: "token không hợp lệ" });

    res.json({ message: "Đăng xuất thành công" });
  });
};

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
    const { id, uid } = req.user;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: "Thiếu file profileImage" });
    }

    const imageProfile = await uploadToS3(file.buffer, file.originalname, uid);

    const sql = `
    UPDATE users 
    SET profileimage = $1 
    WHERE id = $2
    REUTURNING profileimage`;

    const result = await db.query(sql, [imageProfile, id]);

    res.json({ profileImage: result.rows[0].profileimage });
  } catch (err) {
    console.error("Lỗi upload ảnh:", err);
    res.status(500).json({ message: "Lỗi server" });
  }
};

exports.getUsers = async (req, res) => {
  const uid = req.params.uid;
  const currentUserId = req.user.id;
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
      SET firstname = $1, 
          uid = COALESCE($2, uid),
          profileimage = $3,
          createat = NOW()
    WHERE id = $5`,
      [firstname, uid, profileimage, currentUserId]
    );
    await db.query(
      `INSERT INTO profile (user_id, bio, updated_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (user_id)
        DO UPDATE SET bio = EXCLUDED.bio, uidated_at = NOW()`
    );

    const sql = `
      SELECT 
        u.id,
        u.uid,
        u.firstname,
        u.email,
        u.profileimage,
        u.bio
      FROM users u
      LEFT JOIN profile p ON p.user_id = u.id
      WHERE u.id = $1
    `;
    
    const result = await db.query(sql, [currentUserId])
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Loi cap nhat ho so")
    res.status(500).json({message: "Loi server"})
  }
};
