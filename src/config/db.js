const {Pool} = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const db = new Pool({
  host: process.env.PG_HOST,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  database: process.env.PG_DB,
});

db.connect(err => {
  if (err) {
    console.error('Kết nối PostgreSQL lỗi:', err);
    return;
  }
  console.log('✅ Kết nối PostgreSQL thành công');
});

module.exports = db;
