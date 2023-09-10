const express = require('express');
const XLSX = require('xlsx');
const router = express.Router();

// GET Root Route
module.exports = function(pool, storage, upload, formatDataDateForMySQL) {
    router.get('/upload', (req, res) => {
      
      if(req.isAuthenticated()){
        console.log("USERNAME: ", req.user.username)
        console.log("USER (router.get('/upload')): ", req.user);
        console.log("Is Plain Object:", Object.getPrototypeOf(req.user) === Object.prototype);
        const plainUser = req.user.toObject();
        console.log("USER PERMISSION (router.get('/upload')): ", plainUser.permission)

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

    router.post('/upload', upload.single('file'), async (req, res) => {
      // Check if a file was uploaded
      if (!req.file) {
        return res.status(400).send('No file uploaded.');
      }
    
      // Validate file format (should be .xlsx)
      if (req.file.mimetype !== 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
        return res.status(400).send('Invalid file format. Please upload an .xlsx file.');
      }
    
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
    
      // Parse the Excel file
      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0]; // Assuming data is in the first sheet
      const sheet = workbook.Sheets[sheetName];
    
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
    
          // if (dataType === 'date') {
          //   console.log("Column Name: ", columnName)
          //   console.log("Value: ", value)
          // }
    
          // console.log("Column Name: ", columnName)
          // console.log("Data Type: ", dataType)
        
          if (!dataType) {
            return res.status(400).send(`Invalid data type for column ${columnName}.`);
          }
        
          if (value === null || value === undefined || value === '') {
            entry[columnName] = null;
          } else if (dataType === 'number' && isNaN(value)) {
            return res.status(400).send(`Invalid data in row ${i + 1}, column ${columnName}.`);
          } else if (dataType === 'date') {
            entry[columnName] = formatDataDateForMySQL(value); // Convert upload to MySQL format
          } else {
            entry[columnName] = dataType === 'number' ? parseFloat(value) : value;
          }
        }
        dataToImport.push(entry);
      }
    
      // Insert data into the database
      function insertDataIntoDatabase(data) {
        const insertQuery = 'INSERT INTO EmployeeHours SET ?';
        const moment = require('moment-timezone');
      
        return new Promise((resolve, reject) => {
          let numInserted = 0;
          data.forEach(entry => {
            // Convert CheckDate to UTC
            if (entry.CheckDate) {
              // console.log('Before conversion:', entry.CheckDate);
              const checkDate = moment(entry.CheckDate).toDate();
              entry.CheckDate = moment(checkDate).utc().format('YYYY-MM-DD HH:mm:ss');
              // console.log('After conversion:', entry.CheckDate);
            }
      
            pool.query(insertQuery, entry, (err, result) => {
              if (err) {
                console.error('Error inserting data into the database:', err);
                reject(err);
              } else {
                console.log('Data inserted successfully:', result);
                numInserted++;
                if (numInserted === data.length) {
                  resolve();
                }
              }
            });
          });
        });
      }
    
      try {
        // Call the function to insert data into the database
        await insertDataIntoDatabase(dataToImport);
      
        // Set a flash message to indicate that data has been uploaded successfully
        req.flash('success', 'Your data was uploaded successfully!');
        // Redirect to the index route with a query parameter to indicate success
        res.redirect('/?uploadSuccess=true');
      } catch (error) {
        console.error('Error while processing the uploaded file:', error);
        res.status(500).send('There was an error importing data.');
      }
    });
      
    router.post('/upload_xlsx', upload.single('file'), (req, res) => {
      // Check if a file was uploaded
      if (!req.file) {
        return res.status(400).send('No file uploaded.');
      }
    
      // Validate file format (should be .xlsx)
      if (req.file.mimetype !== 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
        return res.status(400).send('Invalid file format. Please upload an .xlsx file.');
      }
    
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
    
      // Parse the Excel file
      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0]; // Assuming data is in the first sheet
      const sheet = workbook.Sheets[sheetName];
    
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
    
          // if (dataType === 'date') {
          //   console.log("Column Name: ", columnName)
          //   console.log("Value: ", value)
          // }
    
          // console.log("Column Name: ", columnName)
          // console.log("Data Type: ", dataType)
        
          if (!dataType) {
            return res.status(400).send(`Invalid data type for column ${columnName}.`);
          }
        
          if (value === null || value === undefined || value === '') {
            entry[columnName] = null;
          } else if (dataType === 'number' && isNaN(value)) {
            return res.status(400).send(`Invalid data in row ${i + 1}, column ${columnName}.`);
          } else if (dataType === 'date') {
            entry[columnName] = formatDataDateForMySQL(value); // Convert upload to MySQL format
          } else {
            entry[columnName] = dataType === 'number' ? parseFloat(value) : value;
          }
        }
        dataToImport.push(entry);
      }
    
      // Insert data into the database
      function insertDataIntoDatabase(data) {
        const insertQuery = 'INSERT INTO EmployeeHours SET ?';
        const moment = require('moment-timezone');
      
        data.forEach(entry => {
          // Convert CheckDate to UTC
          if (entry.CheckDate) {
            // console.log('Before conversion:', entry.CheckDate);
            const checkDate = moment(entry.CheckDate).toDate();
            entry.CheckDate = moment(checkDate).utc().format('YYYY-MM-DD HH:mm:ss');
            // console.log('After conversion:', entry.CheckDate);
          }
      
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
  return router;
};
