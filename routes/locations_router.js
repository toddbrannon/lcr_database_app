const express = require('express');
const router = express.Router();

// GET Locations Route
router.get('/locations', (req, res) => {

    // Implement data retrieval from the database and pass it to the 'index.ejs' template for rendering
    const sqlQuery = 'SELECT Co, Location, City FROM Location;';
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
  
      res.render('locations', { data: dataFromDatabase, formatDate: formatDataDate, isLoggedIn: true });
    });
  });

  module.exports = router;