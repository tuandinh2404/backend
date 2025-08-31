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
console.log("PG_USER in use:", process.env.PG_USER);

module.exports = db;
