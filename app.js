const express = require('express');
const app = express();
const mysql = require('mysql2');
const multer = require('multer');
const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');
require('dotenv').config(); // Load environment variables from .env file
// Import the formatDate function from custom.js
const { formatDate } = require('./public/js/custom');

// Set up MySQL database connection using .env credentials
const pool = mysql.createPool({
  host: process.env.AWS_HOST,
  user: process.env.AWS_USER,
  password: process.env.AWS_PASS,
  database: process.env.AWS_NAME,
  connectionLimit: 10, // Adjust this value based on your needs
  waitForConnections: true,
  queueLimit: 0
});

// Set up static file serving
app.use(express.static(path.join(__dirname, 'public')));

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

    res.render('index', { data: dataFromDatabase, formatDate: formatDate });
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

// Route to handle JSON file upload and insertion
app.post('/upload-json', upload.single('jsonFile'), (req, res) => {
  // Use the req.file object to access the uploaded JSON file
  const filePath = path.join(__dirname, 'db_seed.json');

  // Read the JSON file
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading JSON file:', err);
      res.status(500).send('Internal Server Error');
      return;
    }

    try {
      // Parse the JSON data
      const jsonData = JSON.parse(data);

      // Perform data insertion into the database
      insertDataIntoDatabase(jsonData, (error) => {
        if (error) {
          console.error('Error inserting data into the database:', error);
          res.status(500).send('Internal Server Error');
          return;
        }

        // Data insertion successful
        res.status(200).send('Data inserted successfully.');
      });
    } catch (parseError) {
      console.error('Error parsing JSON data:', parseError);
      res.status(400).send('Invalid JSON data.');
    }
  });
});

// Function to insert data into the EmployeeHours tables
function insertDataIntoDatabase(data, callback) {
  // Perform data insertion into the database
  const insertQuery = 'INSERT INTO EmployeeHours (Co, ID, Name, Department, HireDate, `FirstCheckDate`, `PeriodBegin`, `PeriodEnd`, `CheckDate`, `E-2RegHours`, `E-3OTHours`, `E-WALIWALI`, `E-WALISALWALISAL`, `Original File`) VALUES ?';

  const values = data.map((record) => {
    // Convert the date strings to MySQL date format
    const hireDate = formatDataDate(record['Hire Date']);
    const firstCheckDate = formatDataDate(record['FirstCheckDate']);
    const periodBegin = formatDataDate(record['PeriodBegin']);
    const periodEnd = formatDataDate(record['PeriodEnd']);
    const checkDate = formatDataDate(record['CheckDate']);

    return [
      record.Co,
      record.ID,
      record.Name,
      record.Department,
      hireDate,
      firstCheckDate,
      periodBegin,
      periodEnd,
      checkDate,
      record['E-2RegHours'],
      record['E-3OTHours'],
      record['E-WALIWALI'],
      record['E-WALISALWALISAL'],
      record['Original File'],
    ];
  });

  pool.query(insertQuery, [values], (error, results) => {
    if (error) {
      callback(error);
    } else {
      callback(null);
    }
  });
}

// Function to format date strings to MySQL date format (YYYY-MM-DD)
function formatDataDate(dateString) {
  const [month, day, year] = dateString.split('/');
  const formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  return formattedDate;
}

// Start the server
const port = process.env.PORT || 8888;
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
