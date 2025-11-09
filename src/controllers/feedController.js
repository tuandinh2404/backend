const db = require("../config/db");
const UploadToS3 = require("../util/UploadToS3");
const s3 = require("../config/S3");
const { broadcast } = require("../../ws-server");
const feedModels = require("../models/feedModels")


//Thêm bài viết
exports.Posts = async (req, res) => {
  console.log("BODY:", req.body);
  console.log("FILES:", req.files);
  console.log("USER:", req.user);
  const userId = req.user.id;
  const { context } = req.body;
  try {
    const postResult = await feedModels.queryInsertPostId(userId, context);
    const postId = postResult.rows[0].id;
    if (req.files && req.files.length > 0) {
      const valuesArray = await Promise.all(
        req.files.map(async (m, i) => {
          const mediaurl = await UploadToS3(
            m.buffer,
            m.originalname || `file_${i}`,
            userId
          );
          const mediatype = m.mimetype.startsWith("video") ? "video" : "image";
          return `(${postId}, '${mediaurl}', '${mediatype}', ${i})`;
        })
      );
      const values = valuesArray.join(", ");
      await db.query(
        `INSERT INTO post_media (post_id, media_url, media_type, position)
        VALUES ${values}`
      );
    }
    res.json({ success: true, postId });
  } catch (err) {
    console.error("Lỗi bài viết", err);
    res.status(500).json({ error: "Bài đăng lỗi Server" });
  }
};

exports.getPosts = async (req, res) => {
  const currentUserId = req.user.id;
  console.log("Người dùng chính ID là:", currentUserId);
  const postId = req.params.postId;
  try {
    const result = await feedModels.queryGetPostById(postId, currentUserId);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Bài đăng không tồn tại" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Lỗi server" });
  }
};

exports.getAllPosts = async (req, res) => {
  const currentUserId = parseInt(req.user.id);
  const page = parseInt(req.query.page) || 0;
  const limit = parseInt(req.query.limit) || 20;
  const offset = page * limit;
  

  try {
    const result = await feedModels.queryGetAllPosts(currentUserId, limit, offset);

     if (result.rows.length > 0) {
      result.rows.slice(0, 3).forEach((post, i) => {
      
      });
    }

    const likesCheck = await db.query(
      `SELECT post_id FROM post_like WHERE user_id = $1 ORDER BY post_id`,
      [currentUserId]
    );
    
  
    if (likesCheck.rows.length > 0) {
      console.log('\nID bài viết đã thích:', likesCheck.rows.map(r => r.post_id).join(', '));
    } else {
      console.log('⚠️ Lượt thích không có!');
    }

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Lỗi server" });
  }
};


exports.toggleLike = async (req, res) => {
  const postId = parseInt(req.params.postId)
  const userId = parseInt(req.user.id);

  try {
    await db.query("BEGIN");

    const result = await feedModels.queryTongleLikePost(postId, userId);
      const action = result.rows[0]?.action || 0;

      const updateResult = await db.query(`
        UPDATE posts
        SET like_count = GREATEST(like_count + $1, 0)
        WHERE id = $2
        RETURNING like_count
        `, [action, postId]);
        await db.query("COMMIT");

        const likeCount = updateResult.rows[0].like_count;
        const isLiked = action === 1;

        broadcast({
          type: "LIKE_UPDATE",
          postId: postId.toString(),
          likeCount: likeCount,
          userId: userId.toString(),
          isLiked,
        }, userId.toString());
        res.json({ success: true, likeCount, isLiked });
  } catch( err) {
    await db.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Lỗi server" });
  }
};

exports.getPostsUser = async (req, res) => {
  const currentUserId = req.user.id;
  const userId = parseInt(req.params.userId);
  const page = parseInt(req.query.page) || 0;
  const limit = parseInt(req.query.limit) || 20;
  const offset = page * limit;
  try {
    const result = await db.query(
      `SELECT 
            p.id AS post_id,
            p.context,
            p.like_count,
            p.comment_count,
            p.createat,
            u.id AS user_id,
            u.uid,
            u.profileimage,
            u.firstname,
                COALESCE(
                    json_agg(
                            json_build_object(
                                'id', m.id,
                                'url', m.media_url,
                                'type', m.media_type,
                                'position', m.position
                            )
                        ) FILTER (WHERE m.id IS NOT NULL),
                         '[]'
                    ) AS media,
                    EXISTS (
                      SELECT 1 FROM post_like
                      WHERE post_id = p.id AND user_id = $2
                    ) AS is_liked
                FROM posts p
                JOIN users u ON p.user_id = u.id
                LEFT JOIN post_media m ON p.id = m.post_id
                WHERE p.user_id = $1
                GROUP BY p.id, u.id, u.uid, u.firstname
                ORDER BY p.createat DESC
                LIMIT $3 OFFSET $4`,
      [userId, currentUserId, limit, offset]
    );
    console.log("📦 Kết quả query:", result.rows.length);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Lỗi server" });
  }
};


// exports.DeletePost = async (req, res) => {
//   try {
//     const userId = req.user.id;
//     const postId = req.params.postId;

//     const check = await db.query("SELECT * FROM posts WHERE id = $1", [postId]);
//     if (check.rows.length === 0) {
//       return res.status(404).json({ error: "Post No Exist" });
//     }

//     if (check.rows[0].user_id !== userId) {
//       return res.status(403).json({ error: "Khong co quyen xoa bai viet nay" });
//     }

//     const mediaRes = await client.query("SELECT * FROM post_media WHERE post_id = $1", [postId]);

//     await db.query("BEGIN");
//     await db.query("DELETE FROM post_media WHERE post_id = $1", [postId]);
//     await db.query("DELETE FROM post_like WHERE post_id = $1", [postId]);
//     await db.query("DELETE FROM post_comments WHERE post_id = $1", [postId]);
//     await db.query("DELETE FROM posts WHERE id = $1", [postId]);
//     await db.query("COMMIT");

//     for(let row of mediaRes.rows) {
//       const key = row.url.split('/').pop();
//       await s3.deleteObject
//     }

//     res.json({ success: true, message: "Da xoa bai viet" });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Loi server" })
//   }
// };