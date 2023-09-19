const express = require('express');
const router = express.Router();

module.exports = function(pool) {
  console.log('Accessing the job codes route');
  router.get('/jobcodes', (req, res) => {
    if(req.isAuthenticated()) {

      console.log("USER (router.get('/jobcodes')): ", req.user);
      console.log("Is Plain Object:", Object.getPrototypeOf(req.user) === Object.prototype);
      const plainUser = req.user.toObject();
      console.log("USER PERMISSION (router.get('/jobcodes')): ", plainUser.permission)
      
      // Implement data retrieval from the database and pass it to the 'locations.ejs' template for rendering
      const sqlQuery = 'SELECT JobCode, JobDescription FROM JobCode;';
      
      pool.query(sqlQuery, (error, results) => {
        if (error) {
            console.error('Error executing query:', error);
            return res.status(500).send('Internal Server Error');
        }
      
      // Convert dates to 'MM/DD/YYYY' format for rendering in HTML
      const dataJobCodes = results.map((row) => {
        const modifiedRow = {};
        for (const [key, value] of Object.entries(row)) {
          modifiedRow[key] = key.includes('Date') ? formatDataDate(value, false) : value;
        }
        return modifiedRow;
      });
      
        res.render('jobcodes.ejs', { 
          req: req,
          username: req.user ? req.user.username : null,
          data: dataJobCodes, 
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
