const {Pool} = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const db = new Pool({
  host: process.env.PG_HOST,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  database: process.env.PG_DB,
});
console.log("PG_USER in use:", process.env.PG_USER);


db.connect(err => {
  if (err) {
    console.error('Kết nối PostgreSQL lỗi:', err);
    return;
  }
  console.log('✅ Kết nối PostgreSQL thành công tại db.js');
});

module.exports = db;
