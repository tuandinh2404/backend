const {Pool} = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const db = new Pool({
  host: process.env.PG_HOST,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  database: process.env.PG_DB,
  port: process.env.PG_PORT,
});

console.log("PG_HOST:", process.env.PG_HOST);
console.log("PG_USER:", process.env.PG_USER);
console.log("PG_DB:", process.env.PG_DB);

db.connect()
.then(() => {
  console.log("✅ Kết nối PostgreSQL thành công");
  return db.query("SELECT current_database()")
})
.then(res => {
    console.log("📂 Đang kết nối database:", res.rows[0].current_database);
})
.catch(err => {
    console.error("❌ Lỗi kết nối PostgreSQL:", err);
    process.exit(1);
})

module.exports = db;
