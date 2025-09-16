const db = require("../config/db");
const UploadToS3 = require("../util/UploadToS3");

exports.Posts = async (req, res) => {
  console.log("BODY:", req.body);
  console.log("FILES:", req.files);
  console.log("USER:", req.user);
  const userId = req.user.id;
  const { context } = req.body;
  try {
    const postResult = await db.query(
      `INSERT INTO posts (user_id, context)
            VALUES ($1, $2) RETURNING id`,
      [userId, context]
    );
    const postId = postResult.rows[0].id;
    if (req.files && req.files.length > 0) {
      const valuesArray = await Promise.all(
        req.files.map(async (m, i) => {
            const mediaurl = await UploadToS3(
              m.buffer,
              m.originalname || `file_${i}`,
              userId
            );
            const mediatype = m.mimetype.startsWith("video")
              ? "video"
              : "image";
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
    res.status(500).json({ error: "serrver error post" });
  }
};

exports.getPosts = async (req, res) => {
  const postId = req.params.postId;
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
                    ) AS media
                FROM posts p 
                JOIN users u ON p.user_id = u.id
                LEFT JOIN post_media m ON p.id = m.post_id
                WHERE p.id = $1
                GROUP BY p.id, u.id, u.uid, u.firstname`,
      [postId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Post Not Fount" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Loi server" });
  }
};
