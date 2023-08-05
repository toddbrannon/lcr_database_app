const express = require('express');
const app = express();
const mysql = require('mysql2');
const path = require('path');
const multer = require('multer');
const XLSX = require('xlsx');
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

const storage = multer.memoryStorage(); // Store the uploaded file in memory
const upload = multer({ storage: storage });

// Define the padZero function
function padZero(number, length) {
  return String(number).padStart(length, '0');
}

// Define routes and handlers

// GET Root Route
app.get('/', (req, res) => {
  // Implement data retrieval from the database and pass it to the 'index.ejs' template for rendering
  const sqlQuery = 'SELECT Co, ID, Name, Department, HireDate, FirstCheckDate, PeriodBegin, PeriodEnd, CheckDate, `E-2RegHours`, `E-3OTHours`, `E-WALIWALI`, `E-WALISALWALISAL`, TotalHours, Location, JobCode, TotalDays, HoursPerDay FROM EmployeeHours';
  //const sqlQuery = 'SELECT * FROM EmployeeHours';

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

    res.render('index', { data: dataFromDatabase, formatDate: formatDataDate, isLoggedIn: true });
  });
});

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



// GET Upload Route

app.get('/upload', (req, res) => {
  res.render('upload', { message: '', isLoggedIn: true });
});



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


app.post('/upload', upload.single('file'), (req, res) => {
  // Check if a file was uploaded
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }

  // Validate file format (should be .xlsx)
  if (req.file.mimetype !== 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
    return res.status(400).send('Invalid file format. Please upload an .xlsx file.');
  }

  // Parse the Excel file
  const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0]; // Assuming data is in the first sheet
  const sheet = workbook.Sheets[sheetName];

  // Define expected column names and datatypes
  const expectedColumns = [
    'Co', 'ID', 'Name', 'Department', 'HireDate', 'FirstCheckDate', 'PeriodBegin', 'PeriodEnd',
    'CheckDate', 'E-2RegHours', 'E-3OTHours', 'E-WALIWALI', 'E-WALISALWALISAL'
  ];
  const columnDataTypes = {
    'Co': 'number', 'ID': 'number', 'Name': 'string', 'Department': 'string',
    'HireDate': 'date', 'FirstCheckDate': 'date', 'PeriodBegin': 'date', 'PeriodEnd': 'date',
    'CheckDate': 'date', 'E-2RegHours': 'number', 'E-3OTHours': 'number',
    'E-WALIWALI': 'number', 'E-WALISALWALISAL': 'number'
  };

  // Iterate through the rows and validate data
  const dataToImport = [];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  const headerRow = rows[0]; // Assuming the first row contains headers
  for (let i = 1; i < rows.length; i++) {
    const rowData = rows[i];
    const entry = {};

    // ... (column validation and population)
    for (let j = 0; j < headerRow.length; j++) {
      const columnName = headerRow[j];
      const dataType = columnDataTypes[columnName];
      const value = rowData[j];
    
      if (!dataType) {
        return res.status(400).send(`Invalid data type for column ${columnName}.`);
      }
    
      if (value === null || value === undefined || value === '') {
        entry[columnName] = null;
      } else if (dataType === 'number' && isNaN(value)) {
        return res.status(400).send(`Invalid data in row ${i + 1}, column ${columnName}.`);
      } else if (dataType === 'date') {
        entry[columnName] = formatDataDateForMySQL(value); // Convert to MySQL format
      } else {
        entry[columnName] = dataType === 'number' ? parseFloat(value) : value;
      }
    }
    

    dataToImport.push(entry);
  }

  // Insert data into the database
  function insertDataIntoDatabase(data) {
    const insertQuery = 'INSERT INTO EmployeeHours SET ?';

    data.forEach(entry => {
      pool.query(insertQuery, entry, (err, result) => {
        if (err) {
          console.error('Error inserting data into the database:', err);
        } else {
          console.log('Data inserted successfully:', result);
        }
      });
    });
  }

  try {
    // Call the function to insert data into the database
    insertDataIntoDatabase(dataToImport);

    // Respond with success message
    res.status(200).send('Data imported and inserted successfully.');
  } catch (error) {
    console.error('Error while processing the uploaded file:', error);
    res.status(500).send('There was an error importing data.');
  }
});



// Start the server
const port = process.env.PORT || 8888;
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
