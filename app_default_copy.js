const express = require('express');
const app = express();
const mysql = require('mysql2');
const multer = require('multer');
const xlsx = require('xlsx');
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

// Middleware for handling file uploads using Multer
const upload = multer({ dest: 'uploads/' });

// Helper function to modify the column names to match the MySQL table columns
function modifyColumnNames(headers) {
  return headers.map((header) => {
    // Remove spaces and convert headers to match MySQL table columns
    const modifiedHeader = header.replace(/\s/g, '');

    // Define aliases for specific column names
    const aliases = {
      'HireDate': 'HireDate', // Add more aliases if needed
    };

    return aliases[modifiedHeader] || modifiedHeader;
  });
}

// Helper function to handle null values and format values before insertion
function formatValue(value, column) {
  if (value === null || value === undefined || value === '') {
    return 'NULL';
    } else if ((column === 'Name' || column === 'Department') && typeof value === 'string') {
    return value; // Don't apply formatting for Name and Department
  } else if (typeof value === 'string') {
    // Check if the value is numeric
    if (!isNaN(value)) {
      return parseInt(value); // Parse numeric strings to integers
    }
    return "'" + value.replace(/'/g, "''") + "'";
  } else if (typeof value === 'object' && value instanceof Date) {
    return "'" + value.toISOString().slice(0, 10) + "'";
  } else {
    return value;
  }
}

// Define routes and handlers

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

// Custom function to pad a number with leading zeros
function padZero(num, size) {
  const padded = `000000000${num}`;
  return padded.substr(-size);
}

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

app.post('/upload', upload.array('file', 20), (req, res) => {
  if (req.files && req.files.length > 0) {
    // Multiple files were uploaded
    const filePaths = req.files.map((file) => file.path);

    // Process each uploaded file
    filePaths.forEach((filePath) => {
      // Read the Excel file
      const workbook = xlsx.readFile(filePath, { cellDates: true });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = xlsx.utils.sheet_to_json(worksheet, { header: 1, raw: true });

      // Get the modified column names
      const modifiedColumns = modifyColumnNames(jsonData[0]);

      // Shift the modified headers row from the data
      jsonData.shift();

      console.log("jsonData: ", jsonData);

      const modifiedData = jsonData.map((row) => {
        const modifiedRow = {};
        modifiedColumns.forEach((col, index) => {
          const value = row[index];
          if (col === 'Co' || col === 'ID') {
            const parsedValue = parseInt(value.trim()); // Parse 'Co' and 'ID' as integers
            console.log(`Column: ${col}, Original Value: ${value}, Parsed Value: ${parsedValue}`);
            modifiedRow[col] = parsedValue;
          } else if (col === 'Name' || col === 'Department') {
            const stringValue = String(value);
            console.log(`Column: ${col}, Original Value: ${value}, Parsed Value: ${stringValue}`);
            modifiedRow[col] = stringValue; // Convert 'Name' and 'Department' to string
          } else if (typeof value === 'object' && value instanceof Date) {
            modifiedRow[col] = formatDate(value);
          } else if (value === undefined || value === null || value === '') {
            modifiedRow[col] = 'NULL';
          } else if (col === 'E-2RegHours') {
            modifiedRow[col] = parseInt(value); // Convert 'E-2RegHours' to a whole number
          } else {
            modifiedRow[col] = formatDataDate(value);
          }
        });
        return modifiedRow;
      });
      

      // Output the modified columns and data
      console.log('Modified Columns:', modifiedColumns);
      console.log('Modified Data:', modifiedData);


    });

    res.redirect('/');
  } else if (req.file) {
    // Single file was uploaded
    const filePath = req.file.path;

    // Read the Excel file
    const workbook = xlsx.readFile(filePath, { cellDates: true });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = xlsx.utils.sheet_to_json(worksheet, { header: 1, raw: true });

    // Get the modified column names
    const modifiedColumns = modifyColumnNames(jsonData[0]);

    // Shift the modified headers row from the data
    jsonData.shift();

    console.log("jsonData: ", jsonData);

    // Rename the keys in the data objects to match the modified headers
    // ...

    const modifiedData = jsonData.map((row) => {
      const modifiedRow = {};
      modifiedColumns.forEach((col, index) => {
        const value = row[index];
      
        if (col === 'Co' || col === 'ID') {
          const parsedValue = parseInt(value.trim()); // Parse 'Co' and 'ID' as integers
          console.log(`Column: ${col}, Original Value: ${value}, Parsed Value: ${parsedValue}`);
          modifiedRow[col] = parsedValue;
        } else if (col === 'Name' || col === 'Department') {
          const stringValue = String(value);
          console.log(`Column: ${col}, Original Value: ${value}, Parsed Value: ${stringValue}`);
          modifiedRow[col] = stringValue; // Convert 'Name' and 'Department' to string
        } else if (typeof value === 'object' && value instanceof Date) {
          modifiedRow[col] = formatDate(value);
        } else if (value === undefined || value === null || value === '') {
          modifiedRow[col] = 'NULL';
        } else if (col === 'E-2RegHours') {
          modifiedRow[col] = parseInt(value); // Convert 'E-2RegHours' to a whole number
        } else if (col === 'E-2RegHours' || col === 'E-3OTHours' || col === 'E-WALIWALI' || col === 'E-WALISALWALISAL') {
          modifiedRow[col] = value ? parseInt(value) : null; // Convert 'E-3OTHours', 'E-WALIWALI', and 'E-WALISALWALISAL' to a whole number or null if there is no value
        } else {
          modifiedRow[col] = formatDataDate(value);
        }
      });
      return modifiedRow;
    });

// ...


    // Output the modified columns and data
    console.log('Modified Columns:', modifiedColumns);
    console.log('Modified Data:', modifiedData);

  } else {
    // No files were uploaded, handle the error condition
    res.status(400).send('No files uploaded.');
  }
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

// Function to insert data into the EmployeeHours table
function insertDataIntoDatabase(data, callback) {
  // Perform data insertion into the database
  const insertQuery =
    'INSERT INTO EmployeeHours (Co, ID, Name, Department, HireDate, FirstCheckDate, PeriodBegin, PeriodEnd, CheckDate, `E-2RegHours`, `E-3OTHours`, `E-WALIWALI`, `E-WALISALWALISAL`) VALUES ?';

  // Convert the date strings to MySQL date format (YYYY-MM-DD)
  const formattedData = data.map((record) => {
    return [
      record.Co,
      record.ID,
      record.Name,
      record.Department,
      record.HireDate ? formatDataDate(record.HireDate) : null,
      record.FirstCheckDate ? formatDataDate(record.FirstCheckDate) : null,
      record.PeriodBegin ? formatDataDate(record.PeriodBegin) : null,
      record.PeriodEnd ? formatDataDate(record.PeriodEnd) : null,
      record.CheckDate ? formatDataDate(record.CheckDate) : null,
      record['E-2RegHours'],
      record['E-3OTHours'],
      record['E-WALIWALI'],
      record['E-WALISALWALISAL'],
    ];
  });

  // Execute the insert query
  pool.query(insertQuery, [formattedData], (error, results) => {
    if (error) {
      console.error('Error inserting data into the database:', error);
      callback(error);
    } else {
      console.log('Data inserted successfully.');
      callback(null);
    }
  });
}




// Start the server
const port = process.env.PORT || 8888;
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
