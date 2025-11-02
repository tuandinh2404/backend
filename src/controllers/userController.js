const db = require("../config/db");
const multer = require("multer");
const uploadToS3 = require("../util/UploadToS3");
const upload = multer({ storage: multer.memoryStorage() });
const userModels = require("../models/userModels");



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

    const result = await userModels.updateProfileQuery(imageProfile, currentUserId);
    
    
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
  

  try {
    const result = await userModels.getUserById(uid, currentUserId);

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
