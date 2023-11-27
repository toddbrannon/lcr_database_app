const express = require('express');
const XLSX = require('xlsx');
const router = express.Router();
const moment = require('moment-timezone');
const UploadLog = require('../models/upload_logs'); // Adjust the path to where your model file is located


module.exports = function(pool, storage, upload, formatDataDateForMySQL) {
  router.get('/upload', (req, res) => {
    if(req.isAuthenticated()){
      console.log("USERNAME: ", req.user.username);
      console.log("USER (router.get('/upload')): ", req.user);
      console.log("Is Plain Object:", Object.getPrototypeOf(req.user) === Object.prototype);
      const plainUser = req.user.toObject();
      console.log("USER PERMISSION (router.get('/upload')): ", plainUser.permission);

      res.render('upload', { 
        username: req.user ? req.user.username : null,
        req: req,
        message: '', 
        isLoggedIn: req.isAuthenticated(), 
        isAdmin: plainUser.permission === 'admin',
        messages: req.flash()
      });
    } else {
      res.redirect('/login');
    }
  });

  // Define the known database column names
  const databaseColumnNames = [
    'Co', 'ID', 'Name', 'Department', 'HireDate', 'PeriodBegin', 'PeriodEnd', 
    'CheckDate', 'E-2RegHours', 'E-3OTHours', 'E-WALIWALI', 'E-WALISALWALISAL'
  ];

  // Function to map upload column name to database column name
  function mapUploadColumnNameToDatabase(uploadColumnName) {

    // Special cases for specific columns
    if (uploadColumnName === 'E-WALI WALI Hours') {
      return 'E-WALIWALI';
    }
    if (uploadColumnName === 'E-WALISal WALISal Hours') {
      return 'E-WALISALWALISAL';
    }

    // General transformation for other columns
    let columnName = uploadColumnName.replace(/ /g, '');
    if (columnName.includes('Hrs')) {
      columnName = columnName.replace('Hrs', '');
    }
    console.log(`Mapping upload column '${uploadColumnName}' to database column '${columnName}'`);
    return columnName;
  }

  // Function to convert Excel date serial number to MySQL date string
  function convertExcelDateToMySQLDate(excelSerialDate) {
    if (!excelSerialDate) return null; // Handle null, undefined, or empty values

    // Excel stores dates as serial numbers where 1-Jan-1900 is 1
    const excelEpoch = new Date(1899, 11, 31);
    const date = new Date(excelEpoch.getTime() + excelSerialDate * 86400000);
    return date.toISOString().slice(0, 10); // Format as 'YYYY-MM-DD'
  }

  // Function to update the progress bar in the console
function updateProgressBar(total, current) {
  const progressBarLength = 40; // Length of the progress bar
  const percentage = current / total;
  const filledBarLength = Math.round(progressBarLength * percentage);
  const emptyBarLength = progressBarLength - filledBarLength;
  const filledBar = '='.repeat(filledBarLength);
  const emptyBar = ' '.repeat(emptyBarLength);
  const displayPercentage = (percentage * 100).toFixed(2);

  process.stdout.clearLine(); // Clear the current text in the console line
  process.stdout.cursorTo(0); // Move the cursor to the beginning of the line
  process.stdout.write(`Progress: [${filledBar}${emptyBar}] ${displayPercentage}%`); // Write the progress bar
}


  router.post('/upload', upload.single('file'), async (req, res) => {

    // Step 1: Check if a file is uploaded ====================
    // Check if a file is uploaded
    if (!req.file) {
      req.flash('error', 'No file selected');
      return res.redirect('/upload');
    }
  
    // Check if the uploaded file is an XLSX file
    if (req.file.mimetype !== 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
      req.flash('error', 'Invalid file format. Please upload an Excel spreadsheet file.');
      return res.redirect('/upload');
    }
  
    // Placeholder for next steps
    console.log('File uploaded successfully and is an XLSX file');
  
    // Step 2: Read the XLSX File =============================
    try {
      // Read the uploaded file into a workbook
      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });

      // Extract the first sheet's name
      const sheetName = workbook.SheetNames[0];
      console.log('Sheet Name:', sheetName);

      // Extract the content of the first sheet
      const sheet = workbook.Sheets[sheetName];
      // console.log('Sheet Content:', sheet); // FOR TESTING/DEBUGGING: This log might be large, consider logging a part of it

      // Step 3: Adapted logic to extract and merge headers =====
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      // First nine headers are directly from the second row
      const headers = rows[1].slice(0, 9);

    // Append the first row values to corresponding second row values
    rows[0].forEach((firstRowValue, index) => {
      if (firstRowValue) {
        // Correct index when accessing the second row
        const secondRowValue = rows[1][index] || '';
        headers.push(`${firstRowValue} ${secondRowValue}`.trim());
      }
    });

    console.log('Merged Headers:', headers);

    // Step 4: Extract Data Rows with Trimming ================
    const dataRows = rows.slice(2).map(row => 
      row.map(cell => 
        (typeof cell === 'string' ? cell.trim() : cell)
      )
    );

    // Log the first few sample rows to verify the extraction and trimming
    console.log('Sample Data Rows After Trimming:');
    dataRows.slice(0, 5).forEach((row, index) => {
      console.log(`Row ${index + 3}:`, row);
    });

    // Step 5: Map Data Rows to Database Column Schema with Custom Mapping
    const mappedData = dataRows.map(row => {
      let rowData = {};
      headers.forEach((header, index) => {
        // Apply the custom mapping function to header
        const mappedHeader = mapUploadColumnNameToDatabase(header);
        if (databaseColumnNames.includes(mappedHeader)) {
          // Convert undefined values to empty strings
          rowData[mappedHeader] = row[index] === undefined ? "" : row[index];
        }
      });
      return rowData;
    });

    // Log the first few sample mapped data objects to verify their structure
    console.log('Sample Mapped Data Objects:');
    mappedData.slice(0, 10).forEach((dataObject, index) => {
      console.log(`Mapped Data Object ${index + 1}:`, dataObject);
    });

    // Placeholder for next steps
    console.log('Data mapping to database columns completed successfully');

    // Step 6: Insert Mapped Data into Database with Date Conversion
    const insertDataIntoDatabase = async (data) => {
      const insertQuery = 'INSERT INTO EmployeeHours SET ?';
      let count = 0;

      for (const entry of data) {
        // Convert date columns
        ['HireDate', 'PeriodBegin', 'PeriodEnd', 'CheckDate'].forEach(dateColumn => {
          if (entry[dateColumn]) {
            entry[dateColumn] = convertExcelDateToMySQLDate(entry[dateColumn]);
          }
        });

        try {
          await new Promise((resolve, reject) => {
            pool.query(insertQuery, entry, (err, result) => {
              if (err) {
                console.error('Database Insertion Error:', err);
                reject(err);
              } else {
                resolve(result);
                count++;
                // Inside your data insertion logic
                req.session.progress = (count / data.length) * 100;
                updateProgressBar(data.length, count); // Update the progress bar after each insertion
              }
            });
          });
        } catch (error) {
          console.error('Error while inserting data:', error);
          // Additional error handling can be implemented here
        }
      }
      console.log(`Total Processed Entries: ${count} of ${data.length}`);
    };

    await insertDataIntoDatabase(mappedData);

    // Placeholder for response handling
    console.log('All data processed successfully');
    res.send('Data uploaded and inserted into the database successfully.');

    } catch (error) {
      console.error('Error reading XLSX file:', error);
      res.status(500).send('Error processing the uploaded file.');
      return;
    }
  });

  router.get('/progress', (req, res) => {
    res.json({ progress: req.session.progress || 0 });
  });
  
  
  router.post('/upload_xlsx', upload.single('file'), (req, res) => {
    // This part remains unchanged
  });

  return router;
};
