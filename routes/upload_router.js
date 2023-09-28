const express = require('express');
const XLSX = require('xlsx');
const fs = require('fs');
const Papa = require('papaparse');
const { spawn } = require('child_process');
const router = express.Router();
const moment = require('moment-timezone');

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

  router.post('/upload', upload.single('file'), async (req, res) => {
    let dataToImport = [];
    console.log("Starting the upload process...");

    if (!req.file) {
      req.flash('error', 'No file selected');
      return res.redirect('/upload');
    }

    if (!['text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'].includes(req.file.mimetype)) {
      req.flash('error', 'Invalid file format. Please upload a CSV or Excel spreadsheet file.');
      return res.redirect('/upload');
    }

    const expectedColumns = [
      'Co', 'ID', 'Name', 'Department', 'Hire Date', 'Period Begin', 'Period End',
      'Check Date', 'E-2 Reg Hrs', 'E-3 OT Hrs', 'E-WALI WALI', 'E-WALISal WALISal'
    ];    

    const columnDataTypes = {
      'Co': 'number', 'ID': 'number', 'Name': 'string', 'Department': 'string',
      'Hire Date': 'date', 'Period Begin': 'date', 'Period End': 'date',
      'Check Date': 'date', 'E-2 Reg Hrs': 'number', 'E-3 OT Hrs': 'number',
      'E-WALI WALI': 'number', 'E-WALISal WALISal': 'number'
    };
    

    if (req.file.mimetype === 'text/csv') {
      const csvData = req.file.buffer.toString('utf8');
      // Split the CSV data into individual lines
      const lines = csvData.split('\n');
      // Remove the first four lines
      const dataToParse = lines.slice(2).join('\n');
      Papa.parse(dataToParse, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: async function(results) {

          console.log("DataFrame/Data Structure:", results.data);
          const tempFilePath = './temp.csv';
          fs.writeFileSync(tempFilePath, req.file.buffer);

          const runPythonScript = new Promise((resolve, reject) => {
            console.log("Running Python script...");
            const pythonProcess = spawn('/Users/toddbrannon/.local/share/virtualenvs/Express-PassportJs-BzwaXHEA/bin/python', ['process_csv.py', tempFilePath]);
            let jsonOutput = '';

            console.log("Python Process:", pythonProcess);
            pythonProcess.stdout.on('data', (data) => {
              const output = data.toString();
              console.log('Python Output:', output);
              jsonOutput += output;
            });
          
            pythonProcess.stderr.on('data', (data) => {
              console.error('Python Error:', data.toString());
            });
          

            pythonProcess.on('close', (code) => {
              if (code !== 0) {
                reject(new Error(`Python script exited with code ${code}`));
              } else {
                resolve(JSON.parse(jsonOutput));
              }
            });
          });

          try {
            console.log("Before running Python script");
            dataToImport = await runPythonScript;
            console.log("After running Python script");
            // console.log("Data to Import:", dataToImport);  // Logging the data for inspection
            console.log("Before inserting data into database");
            console.log("Data to be inserted:" , dataToImport)
            await insertDataIntoDatabase(dataToImport);
            console.log("After inserting data into database - before removing duplicate rows");
           
            req.flash('success', 'Your data was uploaded successfully!');
            res.redirect('/?uploadSuccess=true');
          } catch (error) {
            console.error('Error while running Python script:', error);
            return res.status(500).send('There was an error running the Python script.');
          }
        }
      });
    } else if (req.file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      const headerRow = rows[0];

      for (let i = 1; i < rows.length; i++) {
        const rowData = rows[i];
        const entry = {};
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
            entry[columnName] = formatDataDateForMySQL(value);
          } else {
            entry[columnName] = dataType === 'number' ? parseFloat(value) : value;
          }
        }
        dataToImport.push(entry);
      }
    }

    const insertDataIntoDatabase = async (data) => {
      const insertQuery = 'INSERT INTO EmployeeHours SET ?';
      
      return new Promise((resolve, reject) => {
        let numInserted = 0;
        data.forEach(entry => {
          // List of date fields to format
          
          const dateFields = ['CheckDate', 'HireDate', 'PeriodBegin', 'PeriodEnd'];
    
          dateFields.forEach(field => {
            if (entry[field]) {
              const dateValue = moment(entry[field]).toDate();
              entry[field] = moment(dateValue).utc().format('YYYY-MM-DD HH:mm:ss');
            }
          });
    
          pool.query(insertQuery, entry, (err, result) => {
            console.log('Executing Query:', insertQuery, entry);
            if (err) {
                console.error('Database Error:', err.code, err.sqlMessage);
                console.error('Failed Entry:', entry);
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
    };

    try {
      await insertDataIntoDatabase(dataToImport);
      req.flash('success', 'Your data was uploaded successfully!');
      res.redirect('/?uploadSuccess=true');
    } catch (error) {
      console.error('Error while inserting data into the database:', error);
      res.status(500).send('There was an error importing data.');
    }
  });

  router.post('/upload_xlsx', upload.single('file'), (req, res) => {
    // This part remains unchanged
  });

  return router;
};
