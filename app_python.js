const express = require('express');
const app = express();
const mysql = require('mysql2');
const { spawn } = require('child_process');
const multer = require('multer');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const { formatDate } = require('./public/js/custom');
require('dotenv').config(); // Load environment variables from .env file

// Set up MySQL database connection using .env credentials
const pool = mysql.createPool({
  host: process.env.AWS_HOST,
  user: process.env.AWS_USER,
  password: process.env.AWS_PASS,
  database: process.env.AWS_NAME,
  connectionLimit: 10, // Adjust this value based on your needs
  waitForConnections: true,
  queueLimit: 0,
});

// Set up static file serving
app.use(express.static(path.join(__dirname, 'public')));

// Use EJS as the templating engine
app.set('view engine', 'ejs');

// Function to format date strings or Excel serial dates to MySQL date format (YYYY-MM-DD)
function formatDataDate(dateValue) {
  if (typeof dateValue === 'number' && dateValue >= 1 && dateValue < 2958466) {
    // If the date is an Excel serial date, convert it to a proper date object
    const dateObject = new Date(Math.floor((dateValue - 25569) * 86400 * 1000)); // Convert Excel serial date to JavaScript date
    const year = dateObject.getFullYear();
    const month = padZero(dateObject.getMonth() + 1, 2); // Pad with leading zeros to make it 2 digits
    const day = padZero(dateObject.getDate(), 2); // Pad with leading zeros to make it 2 digits
    const formattedDate = `${year}-${month}-${day}`;
    return formattedDate;
  } else if (typeof dateValue === 'string') {
    // If the date is already a string, assume it's in the format 'MM/DD/YYYY' and convert it to 'YYYY-MM-DD'
    const [month, day, year] = dateValue.split('/');
    const formattedDate = `${year}-${padZero(month, 2)}-${padZero(day, 2)}`;
    return formattedDate;
  } else {
    return null; // Return null for missing or invalid dates
  }
}

// GET Root Route
app.get('/', (req, res) => {
  // Implement data retrieval from the database and pass it to the 'index.ejs' template for rendering
  const sqlQuery = 'SELECT Co, ID, Name, Department, HireDate, FirstCheckDate, PeriodBegin, PeriodEnd, CheckDate, `E-2RegHours`, `E-3OTHours`, `E-WALIWALI`, `E-WALISALWALISAL` FROM EmployeeHours';

  pool.query(sqlQuery, (err, results) => {
    if (err) {
      console.error('Error fetching data from the database:', err);
      res.status(500).send('Internal Server Error');
      return;
    }

    // Convert dates to 'MM/DD/YYYY' format for rendering in HTML
    const dataFromDatabase = results.map((row) => {
      const modifiedRow = {};
      for (const [key, value] of Object.entries(row)) {
        modifiedRow[key] = key.includes('Date') ? formatDataDate(value, false) : value;
      }
      return modifiedRow;
    });

    res.render('index', { data: dataFromDatabase, formatDate: formatDate, isLoggedIn: true });
  });
});

// GET Upload Route

app.get('/upload', (req, res) => {
  res.render('upload');
});

// Set up multer to handle file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname); // Use the original file name instead of the generated name
  }
});
const upload = multer({ storage: storage });

// Handle file upload
app.post('/upload', upload.single('file'), (req, res) => {
  const filePath = path.join(__dirname, req.file.path);
  const fileName = req.file.originalname; // Get the original file name
  const pythonProcess = spawn('/path/to/venv/bin/python', ['etl.py', filePath, fileName]);

  // Handle Python process output
  pythonProcess.stdout.on('data', (data) => {
    console.log(`stdout: ${data}`);
  });

  pythonProcess.stderr.on('data', (data) => {
    console.error(`stderr: ${data}`);
  });

  pythonProcess.on('close', (code) => {
    console.log(`child process exited with code ${code}`);
  });

  res.send('File uploaded successfully');
});

// Start the server
const port = process.env.PORT || 8888;
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
