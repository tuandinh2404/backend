const db = require("../config/db");

const querygetEmailUser = async(email) => {
    return await db.query(`
        SELECT * 
        FROM users 
        WHERE email = $1
        `,
        [email]
    )
}

module.exports = {
    querygetEmailUser
}