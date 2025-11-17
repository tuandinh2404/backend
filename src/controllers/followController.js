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
            return res.status(200).json({ 
                message: "Đã theo dõi người này.",
                status: "already_following"
            });
        };

        const mutual = await db.query(
            `SELECT 1 FROM follows
            WHERE follower_id = $1 AND following_id = $2`,
            [followingId, currentFollowedId]
        );

        if(mutual.rowCount > 0) {
            return res.status(201).json({ 
                message: "Đã trở thành bạn bè ",
                status: "mutual"
            });
        }

        return res.status(201).json({ 
            message: "Theo dõi thành công.",
            status: "followed"
        });
    } catch (error) {
        console.error("Error following user:", error);
        return res.status(500).json({ message: "Lỗi Server"});
    }
}

exports.getRelationshipStatus = async ( req, res) => {
    const currentUserId = req.user.id;
    const followingId = parseInt(req.params.userId);

    try {
        const iFollowResult = await db.query(
            `SELECT 1 FROM follows
            WHERE follower_id =$1 AND following_id =$2`,
            [currentUserId, followingId]
        );

        const followMeReuslt = await db.query(
            `SELECT 1 FROM follows
            WHERE follower_id = $1 AND following_id =$2`,
            [followingId, currentUserId]
        );

        let status = "none";

        if( iFollowResult.rowCount > 0 && followMeReuslt.rowCount > 0 ) {
            status = "mutual";
        } else if(followMeReuslt.rowCount > 0) {
            status = "followed";
        };

        return res.status(200).json({ 
            status,
            is_Following: iFollowResult.rowCount > 0,
            is_Followed: followMeReuslt.rowCount > 0
        });
    } catch (error) {
        console.error("Mối quan hệ lỗi:", error);
        return res.status(500).json({ message: "Lỗi Server"});
    }
}

exports.unfollowUser = async ( req, res) => {
    const currentUserId = req.user.id;
    const followingId = parseInt(req.params.userId);

    try {
        const result = await db.query(
            `DELETE FROM follows
            WHERE follower_id =$1 AND following_id =$2`,
            [currentUserId, followingId]
        )
        if(result.rowCount === 0) {
            return res.status(400).json({
                status: "not_following",
                message: "Bạn chưa theo dõi người này."
            });
        };

        return res.status(200).json({
            status: "unfollowed",
            message: "Hủy theo dõi thành công."
        })
    } catch (error) {
        console.error("Error unfollowing user:", error);
        return res.status(500).json({ message: "Lỗi Server"});
    }
}