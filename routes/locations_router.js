const express = require('express');
const router = express.Router();


module.exports = function(pool) {
  console.log('Accessing the locations route');
  router.get('/locations', (req, res) => {
    if(req.isAuthenticated()) {

      console.log("USER (router.get('/locations')): ", req.user);
      console.log("Is Plain Object:", Object.getPrototypeOf(req.user) === Object.prototype);
      const plainUser = req.user.toObject();
      console.log("USER PERMISSION (router.get('/locations')): ", plainUser.permission)
      
      // Implement data retrieval from the database and pass it to the 'locations.ejs' template for rendering
      const sqlQuery = 'SELECT Co, Location, City FROM Location;';
      
      pool.query(sqlQuery, (error, results) => {
        if (error) {
            console.error('Error executing query:', error);
            return res.status(500).send('Internal Server Error');
        }
      
      // Convert dates to 'MM/DD/YYYY' format for rendering in HTML
      const dataLocations = results.map((row) => {
        const modifiedRow = {};
        for (const [key, value] of Object.entries(row)) {
          modifiedRow[key] = key.includes('Date') ? formatDataDate(value, false) : value;
        }
        return modifiedRow;
      });
      
        res.render('locations.ejs', { 
          req: req,
          username: req.user ? req.user.username : null,
          data: dataLocations, 
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