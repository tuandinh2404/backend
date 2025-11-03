const db = require("../config/db");

const queryGetPostById = async (postId, currentUserId) => {
    return await db.query(
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
        WHERE p.id = $1
        GROUP BY p.id, u.id, u.uid, u.firstname`,
        [postId, currentUserId]
  );
};

const queryGetAllPosts = async(currentUserId, limit, offset) => {
    return await db.query(
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
                WHERE post_id = p.id AND user_id = $1
            ) AS is_liked
        FROM posts p 
        JOIN users u ON p.user_id = u.id
        LEFT JOIN post_media m ON p.id = m.post_id
        GROUP BY p.id, u.id, u.uid, u.firstname
        ORDER BY p.createat DESC
        LIMIT $2 OFFSET $3`,
        [ currentUserId, limit, offset ]
    )
}

const queryTongleLikePost = async(postId, userId) => {
    return await db.query(`
        WITH like_action AS (
        INSERT INTO post_like (post_id, user_id)
        VALUES ($1, $2)
        ON CONFLICT (post_id, user_id) DO NOTHING
        RETURNING 1
      ),
      unlike_action AS (
        DELETE FROM post_like
        WHERE post_id = $1 AND user_id = $2
        AND NOT EXISTS (SELECT 1 FROM like_action)
        RETURNING -1
      )
      SELECT COALESCE(
        (SELECT 1 FROM like_action),
        (SELECT -1 FROM unlike_action)
      ) as action`, 
    [postId, userId]
    )
}

module.exports = {
  queryGetPostById,
  queryGetAllPosts,
  queryTongleLikePost
};
