const db = require("../config/db");

const findById = async(userId) => {
    return await db.query(
        `SELECT id, uid, firstname, lastname, email 
        FROM users 
        WHERE id = $1`,
        [userId]
    )
}

module.exports = {
    findById
}