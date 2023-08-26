const express = require('express');
const router = express.Router();

// GET Root Route
module.exports = function(pool, formatDataDate) {
  router.get('/', (req, res) => {
    // Check if data has been uploaded successfully
    const uploadSuccess = res.locals.uploadSuccess === false;
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

      res.render('index', { req: req, data: dataFromDatabase, formatDate: formatDataDate, isLoggedIn: true, messages: req.flash() });
    });
  });

  return router;
};
