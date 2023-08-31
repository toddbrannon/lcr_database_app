const express = require('express');
const router = express.Router();

router.get('/lahaina_pivot', (req, res) => {
    const periodEndQuery = `
      SELECT DISTINCT PeriodEnd
      FROM EmployeeHours AS eh
      JOIN Location AS loc ON eh.Co = loc.Co
      WHERE loc.City = 'Lahaina'
      ORDER BY PeriodEnd;
    `;
  
    pool.query(periodEndQuery, (periodEndError, periodEndResults) => {
      if (periodEndError) {
        console.error('Error fetching Period End dates:', periodEndError);
        res.status(500).send('Internal Server Error');
        return;
      }
  
      const periodEndDates = periodEndResults.map(row => row.PeriodEnd);
  
      const dataQuery = `
        SELECT
          eh.Co,
          loc.City,
          eh.ID,
          eh.Name,
          jc.JobDescription
        FROM
          EmployeeHours AS eh
        JOIN
          Location AS loc ON eh.Co = loc.Co
        JOIN
          JobCode AS jc ON SUBSTRING(eh.Department, -2) = jc.JobCode
        WHERE
          loc.City = 'Lahaina'
        ORDER BY
          jc.JobDescription,
          eh.Name;
      `;
  
      pool.query(dataQuery, (dataError, dataResults) => {
        if (dataError) {
          console.error('Error fetching data from the database:', dataError);
          res.status(500).send('Internal Server Error');
          return;
        }
  
        const dataFromDatabase = dataResults.map(row => {
          const modifiedRow = {};
          for (const [key, value] of Object.entries(row)) {
            modifiedRow[key] = key.includes('Date') ? formatDataDate(value, false) : value;
          }
          return modifiedRow;
        });
  
        res.render('lahaina_pivot', { data: dataFromDatabase, periodEndDates, isLoggedIn: true });
      });
    });
  });

module.exports = router;
