const XLSX = require('xlsx');
const multer = require('multer');
const dataUtils = require('../utils/dataUtils'); // Import data utility functions
const pool = require('../config/database'); // Import your database connection pool

const storage = multer.memoryStorage(); // Store the uploaded file in memory
const upload = multer({ storage: storage });

const uploadController = {
  showUploadPage(req, res) {
    res.render('upload', { message: '', isLoggedIn: req.isAuthenticated() });
  },

  handleUpload(req, res) {
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
          entry[columnName] = dataUtils.formatDataDateForMySQL(value); // Convert to MySQL format
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
  },

  // Other methods related to file upload...
};

module.exports = uploadController;
