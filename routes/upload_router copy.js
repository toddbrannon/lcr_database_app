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
          // ... (existing code) ...
          try {
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
      try {
        const csvData = await convertXlsxToCsv(req.file.buffer);
        // Now proceed with your existing CSV processing logic
        // For instance, assuming you have a function processCsvData to handle csv data:
        // await processCsvData(csvData);
      } catch (error) {
          console.error('Error converting xlsx to csv:', error);
          res.status(500).send('There was an error converting the xlsx file.');
      }
    }

    async function convertXlsxToCsv(buffer) {
      return new Promise((resolve, reject) => {
          const workbook = XLSX.read(buffer, {type: 'buffer'});
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const csvOutput = XLSX.utils.sheet_to_csv(worksheet);
          if (csvOutput) resolve(csvOutput);
          else reject(new Error('Conversion failed'));
      });
    }

    // Sanitize function to normalize values
    function sanitizeValue(value) {
      if (value === null || value === undefined) {
        return '';
      }

      let sanitizedValue = String(value).trim();
      sanitizedValue = sanitizedValue.replace(/\r?\n|\r/g, ' ');
      return sanitizedValue;
    }

    // Process CSV Data Function
    async function processCsvData(csvData) {
      // Split the CSV data into individual lines
      const lines = csvData.split('\n');
      // Assume headers are in the first row
      const headers = lines[0].split(',');
      // Process each row
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        let entry = {};
        for (let j = 0; j < headers.length; j++) {
          entry[headers[j]] = sanitizeValue(values[j]);
        }
        dataToImport.push(entry);
      }
      
      try {
        await insertDataIntoDatabase(dataToImport);
        req.flash('success', 'Your data was uploaded successfully!');
        res.redirect('/?uploadSuccess=true');
      } catch (error) {
        console.error('Error while inserting data into the database:', error);
        res.status(500).send('There was an error importing data.');
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
  });

  router.post('/upload_xlsx', upload.single('file'), (req, res) => {
    // This part remains unchanged
  });

  return router;
};

