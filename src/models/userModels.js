const db = require("../config/db");


//Lấy thông tin cập nhật ảnh đại diện
const updateProfileQueryById = async(imageProfile, currentUserId) => {
    return await db.query(
        `UPDATE users 
        SET profileimage = $1 
        WHERE id = $2
        RETURNING profileimage`,
        [imageProfile, currentUserId]
    )
}

//Lấy thông tin User của profile
const getUserById = async(uid, currentUserId) => {
    const sql = 
    `SELECT 
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

    return await db.query(sql, [uid, currentUserId]);
}

module.exports = {
    updateProfileQueryById,
    getUserById
}