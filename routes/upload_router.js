const express = require('express');
const XLSX = require('xlsx');
const fs = require('fs');
const Papa = require('papaparse');
const { spawn } = require('child_process');
const router = express.Router();
const moment = require('moment-timezone');

module.exports = function(pool, storage, upload, formatDataDateForMySQL) {
  router.get('/upload', (req, res) => {
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

      try {
        const csvData = await convertXlsxToCsv(req.file.buffer);
        // Now proceed with your existing CSV processing logic
        // For instance, assuming you have a function processCsvData to handle csv data:
        await processCsvData(csvData);
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
    
      // Create a merged header row
      const headerFromRow0 = rows[0].slice(8, 12);
      const headerFromRow1 = rows[1].slice(0, 8);

      // Ensure no undefined or empty values in the headers
      function sanitizeHeaderValue(value) {
        return value || 'Placeholder';
      }

      const sanitizedHeaderFromRow0 = headerFromRow0.map(sanitizeHeaderValue);
      const sanitizedHeaderFromRow1 = headerFromRow1.map(sanitizeHeaderValue);

      const mergedHeader = sanitizedHeaderFromRow1.concat(sanitizedHeaderFromRow0);
    
      // Process the remaining rows using the merged header
      for (let i = 2; i < rows.length; i++) { // Starting from row index 2 since the first two rows are header rows
        const rowData = rows[i];
        const entry = {};
        let expectedColumnIndex = 0; // Separate index for tracking position in expectedColumns array
    
        for (let j = 0; j < mergedHeader.length; j++) {
          console.log(`Column ${j}, Value: ${mergedHeader[j]}`)
          const columnName = mergedHeader[j];
    
          console.log("Merged Header (line 138): ", mergedHeader);
    
          // Skip processing for the 'First Check Date' column
          if (columnName === 'First Check Date') {
            continue;
          }
    
          // Adjusted logic to use the correct index when accessing rowData
          const dataIndex = j < 8 ? j : j - 1;  // Adjust the index to account for the skipped column
          const value = sanitizeValue(rowData[dataIndex]);  // Sanitize the cell value
    
          const expectedColumnName = expectedColumns[expectedColumnIndex];
    
          function sanitizeColumnName(columnName) {
            return columnName.replace(/\n/g, ' ').trim();
          }
    
          const sanitizedColumnName = sanitizeColumnName(expectedColumnName);
    
          console.log("Sanitized Column Name: ", sanitizedColumnName);
    
          if (columnName !== expectedColumnName) {
            return res.status(400).send(`Invalid column name (line 181): ${columnName}.`);
          }
    
          const dataType = columnDataTypes[columnName];
          console.log("Column Name: ", columnName);
    
          if (!dataType) {
            return res.status(400).send(`Invalid data type for column (line 188) ${columnName}.`);
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
          expectedColumnIndex++;
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
