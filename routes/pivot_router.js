const express = require('express');
const router = express.Router();

module.exports = function(pool) {
  console.log('Accessing the pivot route');
  router.get('/pivot', (req, res) => {
    if(req.isAuthenticated()) {

      // console.log("USER (router.get('/pivot')): ", req.user);
      // console.log("Is Plain Object:", Object.getPrototypeOf(req.user) === Object.prototype);
      const plainUser = req.user.toObject();
      // console.log("USER PERMISSION (router.get('/pivot')): ", plainUser.permission)

      // const selectedCity = req.query.city || '';
      const selectedLocation = req.query.location || '';
      
      const query = `
        SELECT eh.CheckDate, eh.Name, j.JobDescription, l.City, eh.Location, eh.TotalHours AS TotalHours
        FROM EmployeeHours AS eh
        JOIN JobCode AS j ON RIGHT(eh.Department, 2) = j.JobCode
        JOIN Location AS l ON eh.Co = l.Co
        WHERE ('${selectedLocation}' = '' OR eh.Location = '${selectedLocation}') -- Replace 'selectedLocation' with the selected location value
        GROUP BY eh.CheckDate, eh.Name, j.JobDescription, eh.Location
        ORDER BY eh.CheckDate, eh.Name, j.JobDescription;
      `;

      // console.log("Query: ", query);
      
      
      pool.query(query, (error, results) => {
        if (error) {
            console.error('Error executing query:', error);
            return res.status(500).send('Internal Server Error');
        }

        // console.log("First 10 raw query results:", results.slice(0, 10));
      
        // Process and pivot data
        const pivotedData = {}; // Use an object for pivoting
      
        results.forEach(row => {
          const key = `${row.Name}-${row.JobDescription}-${row.City}`;
          if (!pivotedData[key]) {
              pivotedData[key] = {
                  Name: row.Name,
                  JobDescription: row.JobDescription,
                  City: row.City,
                  Location: row.Location,
                  CheckDates: {} // Initialize an object for Period End values
              };
          }
        
          // Check for null CheckDate before adding to CheckDates
          if (row.CheckDate !== null) {
              const formattedDate = new Date(row.CheckDate).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit'
              });
              pivotedData[key].CheckDates[formattedDate] = row.TotalHours;
          }
        
          // console.log("Period End: ", row.CheckDate)
          // console.log("Total Hours: ", row.TotalHours)
        });
      
        // Extract unique job descriptions
        const jobDescriptions = [...new Set(results.map(row => row.JobDescription))];

        // Extract unique cities
        const cities = [...new Set(results.map(row => row.City))];

        // Extract unique locations
        const locations = [...new Set(results.map(row => row.Location))];
      
        // Extract unique Period End dates
        const checkDatesSet = new Set(results.map(result => result.CheckDate && result.CheckDate.toISOString()));
        const checkDates = Array.from(checkDatesSet).filter(date => date !== null);
      
        // Format the Period End dates as "MM-DD-YYYY"
        const formattedCheckDates = checkDates.map(date => {
          const formattedDate = new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
          });
          return formattedDate;
        });
      
        // console.log("Period Ends: ", checkDates)
        // console.log("Formatted Period Ends: ", formattedCheckDates)
      
        res.render('pivot.ejs', { 
          req: req,
          username: req.user ? req.user.username : null,
          data: pivotedData, 
          jobDescriptions, 
          checkDates, 
          formattedCheckDates, 
          cities,
          locations,
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
