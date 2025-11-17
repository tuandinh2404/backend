const db = require("../config/db");


exports.followUser = async (req, res) => {
    const currentFollowedId = req.user.id;
    const followingId = parseInt(req.params.userId);

    try {
        if(currentFollowedId == followingId) {
            return res.status(400).json({ message: "Không thể theo dõi chính mình."});
        }

        const result = await db.query(
            `INSERT INTO follows (follower_id, following_id)
            VALUES ($1, $2)
            ON CONFLICT (follower_id, following_id) DO NOTHING`,
            [currentFollowedId, followingId]
        )

        if(result.rowCount === 0) {
            return res.status(200).json({ message: "Đã theo dõi người này."});
        };

        const mutual = await db.query(
            `SELECT 1 FROM follows
            WHERE followr_id = $1 AND following_id = $2`,
            [followingId, currentFollowedId]
        );

        if(mutual.rowCount > 0) {
            return res.status(201).json({ message: "Đã trở thành bạn bè "})
        }

        return res.status(201).json({ message: "Theo dõi thành công."});
    } catch (error) {
        console.error("Error following user:", error);
        return res.status(500).json({ message: "Lỗi Server"});
    }
}