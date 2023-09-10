const express = require('express');
const router = express.Router();

module.exports = function(pool) {
  console.log('Accessing the pivot route');
  router.get('/pivot', (req, res) => {
    if(req.isAuthenticated()) {

      console.log("USER (router.get('/pivot')): ", req.user);
      console.log("Is Plain Object:", Object.getPrototypeOf(req.user) === Object.prototype);
      const plainUser = req.user.toObject();
      console.log("USER PERMISSION (router.get('/pivot')): ", plainUser.permission)

      const selectedCity = req.query.city || 'Lahaina';
      
      const query = `
        SELECT eh.PeriodEnd, eh.Name, j.JobDescription, l.City, SUM(eh.TotalHours) AS TotalHours
        FROM EmployeeHours AS eh
        JOIN JobCode AS j ON RIGHT(eh.Department, 2) = j.JobCode
        JOIN Location AS l ON eh.Co = l.Co
        WHERE l.City = '${selectedCity}' -- Replace 'SelectedCity' with the selected city value
        GROUP BY eh.PeriodEnd, eh.Name, j.JobDescription, l.City
        ORDER BY eh.PeriodEnd, eh.Name, j.JobDescription;
      `;
      
      pool.query(query, (error, results) => {
        if (error) {
            console.error('Error executing query:', error);
            return res.status(500).send('Internal Server Error');
        }
      
        // Process and pivot data
        const pivotedData = {}; // Use an object for pivoting
      
        results.forEach(row => {
          const key = `${row.Name}-${row.JobDescription}-${row.City}`;
          if (!pivotedData[key]) {
              pivotedData[key] = {
                  Name: row.Name,
                  JobDescription: row.JobDescription,
                  City: row.City,
                  PeriodEnds: {} // Initialize an object for Period End values
              };
          }
        
          // Check for null PeriodEnd before adding to PeriodEnds
          if (row.PeriodEnd !== null) {
              const formattedDate = new Date(row.PeriodEnd).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit'
              });
              pivotedData[key].PeriodEnds[formattedDate] = row.TotalHours;
          }
        
          console.log("Period End: ", row.PeriodEnd)
          console.log("Total Hours: ", row.TotalHours)
        });
      
        // Extract unique job descriptions
        const jobDescriptions = [...new Set(results.map(row => row.JobDescription))];
      
        // Extract unique Period End dates
        const periodEndsSet = new Set(results.map(result => result.PeriodEnd && result.PeriodEnd.toISOString()));
        const periodEnds = Array.from(periodEndsSet).filter(date => date !== null);
      
        // Format the Period End dates as "MM-DD-YYYY"
        const formattedPeriodEnds = periodEnds.map(date => {
          const formattedDate = new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
          });
          return formattedDate;
        });
      
        console.log("Period Ends: ", periodEnds)
        console.log("Formatted Period Ends: ", formattedPeriodEnds)
      
        res.render('pivot.ejs', { 
          req: req,
          username: req.user ? req.user.username : null,
          data: pivotedData, 
          jobDescriptions, 
          periodEnds, 
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
  return router;
}
