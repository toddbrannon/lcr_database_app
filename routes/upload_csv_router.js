const express = require('express');
const XLSX = require('xlsx');
const csv = require('csv-parser');  // Importing the CSV parser
const fs = require('fs');  // Importing the File System module
const multer = require('multer');
const router = express.Router();

// Multer storage configuration
const multerStorage = multer.diskStorage({
  destination: function(req, file, cb) {
    const dir = './uploads_csv/';
    if (!fs.existsSync(dir)){
        fs.mkdirSync(dir);
    }
    cb(null, dir);
  },
  filename: function(req, file, cb) {
    cb(null, file.originalname);
  }
});

const upload = multer({ storage: multerStorage });

// GET Upload Route
module.exports = function(pool, someOtherStorage, someOtherUpload, formatDataDateForMySQL){
    router.get('/upload_csv', (req, res) => {
      
      if(req.isAuthenticated()){
        console.log("USERNAME: ", req.user.username)
        console.log("USER (router.get('/upload_csv')): ", req.user);
        console.log("Is Plain Object:", Object.getPrototypeOf(req.user) === Object.prototype);
        const plainUser = req.user.toObject();
        console.log("USER PERMISSION (router.get('/upload_csv')): ", plainUser.permission)

        res.render('upload_csv', { 
          username: req.user ? req.user.username : null,
          req: req,
          message: '', 
          isLoggedIn: req.isAuthenticated(), 
          isAdmin: plainUser.permission === 'admin',
          messages: req.flash()
        });
      } else {
        res.redirect('/login');
      }       
    });

    router.post('/upload_csv', upload.single('file'), async (req, res) => {
      // Log the uploaded file information
      console.log("Uploaded File Info: ", req.file);

      // Check if a file was uploaded
      if (!req.file) {
        req.flash('error', 'No file selected');
        return res.redirect('/upload_csv'); // Redirect to the page where the form is
      }
    
      // Validate file format (should now be .csv)
      if (req.file.mimetype !== 'text/csv') {
        req.flash('error', 'Invalid file format. Please ensure you are selecting a CSV file and try again.');
        console.log("Flash Messages: ", req.flash());
        return res.redirect('/upload_csv'); // Redirect to the page where the form is
      }

      // Process the uploaded CSV file
      // This is a simplified example; you may replace it with your actual processing logic
      const filePath = req.file.path;  // Assuming 'path' is a field in your uploaded file object
      const results = [];

      console.log("Imported file: ", req.file)

      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', () => {
          // Do something with the 'results' array (contains rows from the uploaded CSV)
        });
        console.log("Uploaded File Info: ", req.file);
    });
  return router;
};
