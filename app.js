const express = require('express');
const app = express();
const mysql = require('mysql2');
const path = require('path');
const multer = require('multer');
const XLSX = require('xlsx');
const moment = require('moment-timezone');
const session = require('express-session');
const flash = require('connect-flash');
const XlsxPopulate = require('xlsx-populate');
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

app.use((req, res, next) => {
  res.locals.currentRoute = req.originalUrl;
  next();
});

// Use EJS as the templating engine
app.set('view engine', 'ejs');

// Set up session middleware
app.use(session({
  secret: 'mysecret',
  resave: false,
  saveUninitialized: false
}));

// Set up flash middleware
app.use(flash());

const storage = multer.memoryStorage(); // Store the uploaded file in memory
const upload = multer({ storage: storage });

// Define the padZero function
function padZero(number, length) {
  return String(number).padStart(length, '0');
}

// --------------  Define routes and handlers ----------------------

// Import route modules
const indexRouter = require('./routes/index_router')(pool, formatDataDate); // Pass the pool instance
const pivotRouter = require('./routes/pivot_router')(pool);
const uploadRouter = require('./routes/upload_router')(pool, storage, upload, formatDataDateForMySQL);

// Use route modules
app.use('/', indexRouter);
app.use('/', pivotRouter);
app.use('/', uploadRouter);

// Function to format date strings or Excel serial dates to MySQL date format (YYYY-MM-DD)
// Function to format date strings or Excel serial dates to MySQL date format (YYYY-MM-DD)
function formatDataDate(dateValue, forMySQL = true) {
  if (dateValue === null || dateValue === undefined || dateValue === '') {
    return ''; // Return empty string for null, undefined, or empty values
  }

  if (typeof dateValue === 'number' && dateValue >= 1 && dateValue < 2958466) {
    // If the date is an Excel serial date, convert it to a proper date object
    const dateObject = new Date(Math.floor((dateValue - 25569) * 86400 * 1000)); // Convert Excel serial date to JavaScript date
    const year = dateObject.getFullYear();
    const month = padZero(dateObject.getMonth() + 1, 2); // Pad with leading zeros to make it 2 digits
    const day = padZero(dateObject.getDate(), 2); // Pad with leading zeros to make it 2 digits
    const formattedDate = `${year}-${month}-${day}`;
    
    if (forMySQL) {
      // For MySQL format ('YYYY-MM-DD')
      return formattedDate;
    }
    
    // For 'MM/DD/YYYY' format
    return `${month}/${day}/${year}`;
  } else if (typeof dateValue === 'string') {
    // If the date is already a string, assume it's in the format 'MM/DD/YYYY' and convert it to 'YYYY-MM-DD'
    const [month, day, year] = dateValue.split('/');
    const formattedDate = `${year}-${padZero(month, 2)}-${padZero(day, 2)}`;
    
    if (forMySQL) {
      // For MySQL format ('YYYY-MM-DD')
      return formattedDate;
    }
    
    // For 'MM/DD/YYYY' format
    return `${month}/${day}/${year}`;
  } else if (dateValue instanceof Date) {
    // If the date is already a Date object, format it as 'YYYY-MM-DD'
    const year = dateValue.getFullYear();
    const month = padZero(dateValue.getMonth() + 1, 2);
    const day = padZero(dateValue.getDate(), 2);
    const formattedDate = `${year}-${month}-${day}`;
    
    if (forMySQL) {
      // For MySQL format ('YYYY-MM-DD')
      return formattedDate;
    }
    
    // For 'MM/DD/YYYY' format
    return `${month}/${day}/${year}`;
  } else {
    return ''; // Return empty string for missing or invalid dates
  }
}

// Function to format date strings or Excel serial dates to MySQL date format (YYYY-MM-DD)
function formatDataDateForMySQL(dateValue) {
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
  } else if (dateValue instanceof Date) {
    // If the date is already a Date object, format it as 'YYYY-MM-DD'
    const year = dateValue.getFullYear();
    const month = padZero(dateValue.getMonth() + 1, 2);
    const day = padZero(dateValue.getDate(), 2);
    const formattedDate = `${year}-${month}-${day}`;
    return formattedDate;
  } else {
    return null; // Return null for missing or invalid dates
  }
}

// Start the server
const port = process.env.PORT || 8888;
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
