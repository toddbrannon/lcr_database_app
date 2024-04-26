
const mysql = require('mysql2/promise');
require('dotenv').config(); // Load environment variables from .env file

console.log(process.env.DO_HOST);
console.log(process.env.DO_USER);
console.log(process.env.DO_PASS);
console.log(process.env.DO_DB);

// Set up MySQL database connection using .env credentials
const pool = mysql.createPool({
  host: process.env.DO_HOST,
  user: process.env.DO_USER,
  password: process.env.DO_PASS,
  database: process.env.DO_DB,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 30000, // 30 seconds
  ssl: {
    // If your DigitalOcean database requires SSL, you might need to configure this
    rejectUnauthorized: true
  }
});

// // Test the database connection
pool.getConnection()
    .then(conn => {
      console.log("Database connection established");
      conn.release(); // release to pool
      process.exit(0); // Exit the process after connection test
    })
    .catch(err => {
      console.error("Unable to connect to the database:", err);
      process.exit(1); // Exit the process with an error code
    });


module.exports = pool;