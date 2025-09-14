const db = require("../config/db");
const { post } = require("../routes/authRoutes");


exports.Posts = async ( req, res) => {
    const {userId, context, media} = req.body;
    try {
        const postResult = await db.query(
            `INSERT INTO posts (user_id, context)
            VALUES ($1, $2) RETURNING id`,
            [userId, context]
        );
        const postId = postResult.rows[0].id;
        if(media && media.length > 0) {
            const values = media.map(
                (m, i) => `(${postId}, '${m.mediaurl}', '${m.mediatype}', ${i})`
            ).join(", ");
            await db.query(
                `INSERT INTO post_media (post_id, media_url, media_type, position)
                VALUES ${values}`
            );
        }
        res.json({ success: true, postId })
    } catch ( err) {
        console.error("Lỗi bài viết",  err);
        res.status(500).json({ error: "serrver error post"})
    }
};

exports.getPosts = async(req, res) => {
    const postId = req.params.postId;
    try{
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
        if(result.rows.length === 0) {
            return res.status(404).json({ error: "Post Not Fount"});
        }
        res.json(result.rows[0])
    } catch( err) {
        console.error(err)
        res.status(500).json({ error: "Loi server"})
    }
}