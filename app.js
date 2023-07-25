const express = require('express');
const app = express();
const mysql = require('mysql2');
const multer = require('multer');
const xlsx = require('xlsx');
require('dotenv').config(); // Load environment variables from .env file

// Set up MySQL database connection using .env credentials
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  connectionLimit: 10, // Adjust this value based on your needs
  waitForConnections: true,
  queueLimit: 0
});


// Use EJS as the templating engine
app.set('view engine', 'ejs');

// Middleware for handling file uploads using Multer
const upload = multer({ dest: 'uploads/' });

// Define routes and handlers

// GET Root Route

app.get('/', (req, res) => {
  // Implement data retrieval from the database and pass it to the 'index.ejs' template for rendering
  const sqlQuery = 'SELECT Co, ID, Name, Department, HireDate, FirstCheckDate, PeriodBegin, PeriodEnd, CheckDate, `E-2RegHours`, `E-3OTHours`, `E-WALIWALI`, `E-WALISALWALISAL`, `Original File` FROM EmployeeHours';

  pool.query(sqlQuery, (err, results) => {
    if (err) {
      console.error('Error fetching data from the database:', err);
      res.status(500).send('Internal Server Error');
      return;
    }

    // 'results' contains the data fetched from the database
    // Modify the data if needed before passing it to the template
    const dataFromDatabase = results;

    res.render('index', { data: dataFromDatabase });
  });
});

// GET Upload Route

app.get('/upload', (req, res) => {
  res.render('upload');
});

// Implement file upload logic in the POST method
app.post('/upload', upload.single('file'), (req, res) => {
  // Use the req.file object to access the uploaded file
  const filePath = req.file.path;

  // Implement logic to read the Excel file using XLSX and insert data into the database
  // Your logic here to read the Excel file and insert data into the database

  res.redirect('/');
});

// Start the server
const port = 3000;
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
