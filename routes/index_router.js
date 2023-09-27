const express = require('express');
const router = express.Router();

// GET Root Route
module.exports = function(pool, formatDataDate) {
  router.get('/', function(req, res, next) {
    // Check if user is logged in
      if (req.isAuthenticated()) {
        
        console.log("USER (router.get('/')): ", req.user);
        console.log("Is Plain Object:", Object.getPrototypeOf(req.user) === Object.prototype);
        const plainUser = req.user.toObject();
        console.log("USER PERMISSION (router.get('/')): ", plainUser.permission)
        // Implement data retrieval from the database and pass it to the 'index.ejs' template for rendering
        const sqlQuery = 'SELECT Co, ID, Name, Department, HireDate, PeriodBegin, PeriodEnd, CheckDate, `E-2RegHours`, `E-3OTHours`, `E-WALIWALI`, `E-WALISALWALISAL`, TotalHours, Location, JobCode, TotalDays, HoursPerDay FROM EmployeeHours';
        //const sqlQuery = 'SELECT * FROM EmployeeHours';

        let columnsFromTable = [];

        pool.query(sqlQuery, (err, results) => {
          if (err) {
            console.error('Error fetching data from the database:', err);
            res.status(500).send('Internal Server Error');
            return;
          }

          if (results.length > 0) {
            columnsFromTable = Object.keys(results[0]); // Get the column names from the first row
          }

          // Convert dates to 'MM/DD/YYYY' format for rendering in HTML
          const dataFromDatabase = results.map((row) => {
            const modifiedRow = {};
            for (const [key, value] of Object.entries(row)) {
              modifiedRow[key] = key.includes('Date') ? formatDataDate(value, false) : value;
            }
            return modifiedRow;
          });

          console.log("req.user:", req.user);
          console.log("plainUser:", plainUser)
          console.log("req.user.firstname:", plainUser ? plainUser.firstname : 'Not available');
       
          res.render('index', { 
            req: req, 
            username: req.user ? req.user.username : null,
            firstname: req.user ? req.user.firstname : null,
            lastname: req.user ? req.user.lastname : null,
            columns: columnsFromTable,
            data: dataFromDatabase, 
            formatDate: formatDataDate, 
            isLoggedIn: req.isAuthenticated(), 
            isAdmin: plainUser.permission === 'admin',
            messages: req.flash()  
          });
        });
      
      } else {
        // Redirect to the login page
        res.redirect('/login');
      }
  });

  router.get('/dashboard', function(req, res, next) {
    if (req.isAuthenticated()) {
      const plainUser = req.user.toObject();
      res.render('dashboard', { 
            req: req, 
            username: req.user ? req.user.username : null,
            firstname: req.user ? req.user.firstname : null,
            lastname: req.user ? req.user.lastname : null,
            isLoggedIn: req.isAuthenticated(), 
            isAdmin: plainUser.permission === 'admin',
            messages: req.flash()  
          });
        } else {
          // Redirect to the login page
          res.redirect('/login');
        }
    });
  return router;
}
