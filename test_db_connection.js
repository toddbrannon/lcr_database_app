const mysql = require('mysql2');
require('dotenv').config(); // Load environment variables from .env file

// Create a single database connection using createConnection
const dbConnection = mysql.createConnection({
  host: process.env.AWS_HOST,
  user: process.env.AWS_USER,
  password: process.env.AWS_PASS,
  database: process.env.AWS_NAME,
});

// Connect to the database
dbConnection.connect((err) => {
  if (err) {
    console.error('Error connecting to the database:', err);
  } else {
    console.log('Successfully connected to the database!');

    // Query the database with a simple statement
    // SQL statement to create the 'EmployeeHours' table
    const createTableQuery = `
      CREATE TABLE EmployeeHours (
        Co INT,
        ID INT,
        Name CHAR(255),
        Department CHAR(255),
        HireDate DATETIME,
        FirstCheckDate DATETIME,
        PeriodBegin DATETIME,
        PeriodEnd DATETIME,
        CheckDate DATETIME,
        \`E-2RegHours\` INT,
        \`E-3OTHours\` INT,
        \`E-WALIWALI\` INT,
        \`E-WALISALWALISAL\` INT,
        \`Original File\` CHAR(255)
      );
    `;
    // Execute the 'CREATE TABLE' query
    dbConnection.query(createTableQuery, (err, result) => {
      if (err) {
        console.error('Error creating table:', err);
      } else {
        console.log('Table created successfully!');
      }

      // Close the database connection
      dbConnection.end((endErr) => {
        if (endErr) {
          console.error('Error closing the database connection:', endErr);
        } else {
          console.log('Database connection closed.');
        }
      });
    });
  }
});
