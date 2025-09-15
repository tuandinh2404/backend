const db = require("../config/db")
const jwt = require("jsonwebtoken")
const JWT_SECRET = process.env.JWT_SECRET

const AuthMiddleWare = async (req, res, next) => {
    const authHeader = req.headers["authorization"]
    if(!authHeader) {
        return res.status(401).json({message:"Thieu Token"})
    }
    const token = authHeader.split(" ")[1]
    if(!token) {
        return res.status(401).json({message:"Token khong hop le"})
    }

    jwt.verify(token, JWT_SECRET, async (err, user) => {
        if(err) {
            return res.status(403).json({message: "Token khong hop le"})
        }
        try{
            const result = await db.query(`SELECT id, uid, firstname, lastname, email FROM users WHERE id = $1`, [user.id])
            if(result.rows.length === 0) {
                return res.status(401).json({message: "User No Exist"})
            }
            req.user = result.rows[0]
            next()
        } catch(err) {
            console.error(err)
            res.status(500).json({message:"Loi server khi xac thuc"})
        }
    })
}
module.exports = AuthMiddleWare