// config/database.js
const mysql = require('mysql2');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.AWS_HOST,
  user: process.env.AWS_USER,
  password: process.env.AWS_PASS,
  database: process.env.AWS_NAME,
  connectionLimit: 10,
  waitForConnections: true,
  queueLimit: 0,
});

module.exports = pool;
