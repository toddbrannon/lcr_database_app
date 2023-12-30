const express = require('express');
const router = express.Router();

module.exports = function(pool) {
  console.log('Accessing the pivot route');
  router.get('/pivot', (req, res) => {
    if(req.isAuthenticated()) {
      const selectedCity = req.query.city || 'Lahaina';
      const query = `...`; // Your existing query

      pool.query(query, (error, results) => {
        if (error) {
          console.error('Error executing query:', error);
          return res.status(500).send('Internal Server Error');
        }

        // Initialize pivoted data structure
        const pivotedData = {};
        const periodEndsSet = new Set();

        results.forEach(row => {
          const key = `${row.Name}-${row.JobDescription}-${row.City}`;
          const formattedDate = formatDate(row.PeriodEnd); // Helper function to format date

          // Initialize entry if not exists
          if (!pivotedData[key]) {
            pivotedData[key] = {
              Name: row.Name,
              JobDescription: row.JobDescription,
              City: row.City,
              PeriodEnds: {}
            };
          }

          // Populate period ends and total hours
          pivotedData[key].PeriodEnds[formattedDate] = row.TotalHours;
          periodEndsSet.add(formattedDate);
        });

        // Extract and sort period ends
        const formattedPeriodEnds = Array.from(periodEndsSet).sort();

        // Render view with pivoted data
        res.render('pivot.ejs', { 
          req: req,
          username: req.user ? req.user.username : null,
          data: pivotedData, 
          jobDescriptions, 
          formattedPeriodEnds, 
          isLoggedIn: req.isAuthenticated(),
          isAdmin: plainUser.permission === 'admin',
          messages: req.flash()  
        });
      });
    } else {
      res.redirect('/login');
    }
  });

  function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  }
  return router;
}
