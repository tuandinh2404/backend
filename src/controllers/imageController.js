const db = require("../config/db")


//lấy tất cả ảnh 
exports.Images = (req, res) => {
    const sql = "SELECT * FROM live_images ORDER BY createdAt DESC";
  db.query(sql, (err, results) => {
    if (err) {
      console.error("DB query error:", err);
      return res.status(500).json({ message: "Lỗi server" });
    }
    res.json(results);
  });
}

//lấy ảnh của người dùng 
exports.ImagesUid = (req, res) => {
  const {uid} = req.params;
  console.log("Request ImagesUid với uid:", uid);
  const sql = "SELECT * FROM live_images WHERE uid = ? ORDER BY createdAt DESC";
  db.query(sql, [uid], (err, results) => {
    if(err) return res.status(500).json({message:"lỗi server"});
    res.json(results)
  });
};