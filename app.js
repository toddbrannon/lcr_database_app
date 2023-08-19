const express = require('express');
const app = express();
const mysql = require('mysql2');
const path = require('path');
const multer = require('multer');
const XLSX = require('xlsx');
const bodyParser = require('body-parser')
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const flash = require('express-flash');
const bcrypt = require('bcrypt');
const { formatDate } = require('./public/js/custom');
require('dotenv').config(); // Load environment variables from .env file

app.use(bodyParser.urlencoded({ extended: true }));

// Set up MySQL database connection using .env credentials
const pool = mysql.createPool({
  host: process.env.AWS_HOST,
  user: process.env.AWS_USER,
  password: process.env.AWS_PASS,
  database: process.env.AWS_NAME,
  connectionLimit: 10, // Adjust this value based on your needs
  waitForConnections: true,
  queueLimit: 0,
});

// Set up static file serving
app.use(express.static(path.join(__dirname, 'public')));

app.use((req, res, next) => {
  res.locals.currentRoute = req.originalUrl;
  next();
});


// Use EJS as the templating engine
app.set('view engine', 'ejs');

const storage = multer.memoryStorage(); // Store the uploaded file in memory
const upload = multer({ storage: storage });

// Define the padZero function
function padZero(number, length) {
  return String(number).padStart(length, '0');
}

// Use session to manage user login state
app.use(session({
  secret: 'ThisIsSomeKindOfSecret',
  resave: false,
  saveUninitialized: false
}));

// Initialize Passport.js for user authentication
app.use(passport.initialize());
app.use(passport.session());

// Use express-flash for flashing error messages
app.use(flash());

// Define a user schema and model for authentication
const User = {
  id: 'user-id',
  email: 'email',
  username: 'username',
  password: 'password'
};

// Middleware to set the isLoggedIn variable
app.use((req, res, next) => {
  res.locals.isLoggedIn = req.session.isLoggedIn || false; // Assuming you're using sessions
  res.locals.currentRoute = req.originalUrl;
  next();
});

// Configure Passport.js with LocalStrategy
passport.use(new LocalStrategy(
  (username, password, done) => {
    // Replace this with your actual database query to fetch user data
    const user = User; // Replace with database query to find user by username

    if (!user) {
      return done(null, false, { message: 'Incorrect username.' });
    }

    bcrypt.compare(password, user.password, (err, result) => {
      if (err) {
        return done(err);
      }

      if (!result) {
        return done(null, false, { message: 'Incorrect password.' });
      }

      return done(null, user);
    });
  }
));

// Serialize and deserialize user for session management
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  // Replace this with your actual database query to fetch user data
  const user = User; // Replace with database query to find user by id
  done(null, user);
});

// ... existing code ...

// Implement authentication middleware
const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/login');
};

// Define routes and handlers

// GET Login Route
app.get('/login', (req, res) => {
  res.render('login', { messages: req.flash('error') });
});


// POST Login Route
app.post('/login', passport.authenticate('local', {
  successRedirect: '/',
  failureRedirect: '/login',
  failureFlash: true
}));

// Logout Route
app.get('/logout', (req, res) => {
  req.logout();
  res.redirect('/login');
});


// GET Root Route
app.get('/', isAuthenticated, (req, res) => {

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

    res.render('index', { data: dataFromDatabase, formatDate: formatDataDate, isLoggedIn: true });
  });
});



// GET Root Route
app.get('/jobcodes', (req, res) => {

  // Implement data retrieval from the database and pass it to the 'index.ejs' template for rendering
  const sqlQuery = 'SELECT JobCode, JobDescription FROM JobCode;';
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

    res.render('jobcodes', { data: dataFromDatabase, formatDate: formatDataDate, isLoggedIn: true });
  });
});

// GET Root Route
app.get('/locations', (req, res) => {

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

app.get('/pivot', (req, res) => {
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

    res.render('pivot.ejs', { data: pivotedData, jobDescriptions, periodEnds, formattedPeriodEnds, isLoggedIn: true });
  });
});





app.get('/lahaina_pivot', (req, res) => {
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






// Function to format date strings or Excel serial dates to MySQL date format (YYYY-MM-DD)
// Function to format date strings or Excel serial dates to MySQL date format (YYYY-MM-DD)
function formatDataDate(dateValue, forMySQL = true) {
  if (dateValue === null || dateValue === undefined || dateValue === '') {
    return ''; // Return empty string for null, undefined, or empty values
  }

  if (typeof dateValue === 'number' && dateValue >= 1 && dateValue < 2958466) {
    // If the date is an Excel serial date, convert it to a proper date object
    const dateObject = new Date(Math.floor((dateValue - 25569) * 86400 * 1000)); // Convert Excel serial date to JavaScript date
    const year = dateObject.getFullYear();
    const month = padZero(dateObject.getMonth() + 1, 2); // Pad with leading zeros to make it 2 digits
    const day = padZero(dateObject.getDate(), 2); // Pad with leading zeros to make it 2 digits
    const formattedDate = `${year}-${month}-${day}`;
    
    if (forMySQL) {
      // For MySQL format ('YYYY-MM-DD')
      return formattedDate;
    }
    
    // For 'MM/DD/YYYY' format
    return `${month}/${day}/${year}`;
  } else if (typeof dateValue === 'string') {
    // If the date is already a string, assume it's in the format 'MM/DD/YYYY' and convert it to 'YYYY-MM-DD'
    const [month, day, year] = dateValue.split('/');
    const formattedDate = `${year}-${padZero(month, 2)}-${padZero(day, 2)}`;
    
    if (forMySQL) {
      // For MySQL format ('YYYY-MM-DD')
      return formattedDate;
    }
    
    // For 'MM/DD/YYYY' format
    return `${month}/${day}/${year}`;
  } else if (dateValue instanceof Date) {
    // If the date is already a Date object, format it as 'YYYY-MM-DD'
    const year = dateValue.getFullYear();
    const month = padZero(dateValue.getMonth() + 1, 2);
    const day = padZero(dateValue.getDate(), 2);
    const formattedDate = `${year}-${month}-${day}`;
    
    if (forMySQL) {
      // For MySQL format ('YYYY-MM-DD')
      return formattedDate;
    }
    
    // For 'MM/DD/YYYY' format
    return `${month}/${day}/${year}`;
  } else {
    return ''; // Return empty string for missing or invalid dates
  }
}



// GET Upload Route

app.get('/upload', (req, res) => {
  res.render('upload', { message: '', isLoggedIn: true });
});



// Function to format date strings or Excel serial dates to MySQL date format (YYYY-MM-DD)
function formatDataDateForMySQL(dateValue) {
  if (typeof dateValue === 'number' && dateValue >= 1 && dateValue < 2958466) {
    // If the date is an Excel serial date, convert it to a proper date object
    const dateObject = new Date(Math.floor((dateValue - 25569) * 86400 * 1000)); // Convert Excel serial date to JavaScript date
    const year = dateObject.getFullYear();
    const month = padZero(dateObject.getMonth() + 1, 2); // Pad with leading zeros to make it 2 digits
    const day = padZero(dateObject.getDate(), 2); // Pad with leading zeros to make it 2 digits
    const formattedDate = `${year}-${month}-${day}`;
    return formattedDate;
  } else if (typeof dateValue === 'string') {
    // If the date is already a string, assume it's in the format 'MM/DD/YYYY' and convert it to 'YYYY-MM-DD'
    const [month, day, year] = dateValue.split('/');
    const formattedDate = `${year}-${padZero(month, 2)}-${padZero(day, 2)}`;
    return formattedDate;
  } else if (dateValue instanceof Date) {
    // If the date is already a Date object, format it as 'YYYY-MM-DD'
    const year = dateValue.getFullYear();
    const month = padZero(dateValue.getMonth() + 1, 2);
    const day = padZero(dateValue.getDate(), 2);
    const formattedDate = `${year}-${month}-${day}`;
    return formattedDate;
  } else {
    return null; // Return null for missing or invalid dates
  }
}


app.post('/upload', upload.single('file'), (req, res) => {
  // Check if a file was uploaded
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }

  // Validate file format (should be .xlsx)
  if (req.file.mimetype !== 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
    return res.status(400).send('Invalid file format. Please upload an .xlsx file.');
  }

  // Parse the Excel file
  const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0]; // Assuming data is in the first sheet
  const sheet = workbook.Sheets[sheetName];

  // Define expected column names and datatypes
  const expectedColumns = [
    'Co', 'ID', 'Name', 'Department', 'HireDate', 'FirstCheckDate', 'PeriodBegin', 'PeriodEnd',
    'CheckDate', 'E-2RegHours', 'E-3OTHours', 'E-WALIWALI', 'E-WALISALWALISAL'
  ];
  const columnDataTypes = {
    'Co': 'number', 'ID': 'number', 'Name': 'string', 'Department': 'string',
    'HireDate': 'date', 'FirstCheckDate': 'date', 'PeriodBegin': 'date', 'PeriodEnd': 'date',
    'CheckDate': 'date', 'E-2RegHours': 'number', 'E-3OTHours': 'number',
    'E-WALIWALI': 'number', 'E-WALISALWALISAL': 'number'
  };

  // Iterate through the rows and validate data
  const dataToImport = [];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  const headerRow = rows[0]; // Assuming the first row contains headers
  for (let i = 1; i < rows.length; i++) {
    const rowData = rows[i];
    const entry = {};

    // ... (column validation and population)
    for (let j = 0; j < headerRow.length; j++) {
      const columnName = headerRow[j];
      const dataType = columnDataTypes[columnName];
      const value = rowData[j];
    
      if (!dataType) {
        return res.status(400).send(`Invalid data type for column ${columnName}.`);
      }
    
      if (value === null || value === undefined || value === '') {
        entry[columnName] = null;
      } else if (dataType === 'number' && isNaN(value)) {
        return res.status(400).send(`Invalid data in row ${i + 1}, column ${columnName}.`);
      } else if (dataType === 'date') {
        entry[columnName] = formatDataDateForMySQL(value); // Convert to MySQL format
      } else {
        entry[columnName] = dataType === 'number' ? parseFloat(value) : value;
      }
    }
    

    dataToImport.push(entry);
  }

  // Insert data into the database
  function insertDataIntoDatabase(data) {
    const insertQuery = 'INSERT INTO EmployeeHours SET ?';

    data.forEach(entry => {
      pool.query(insertQuery, entry, (err, result) => {
        if (err) {
          console.error('Error inserting data into the database:', err);
        } else {
          console.log('Data inserted successfully:', result);
        }
      });
    });
  }

  try {
    // Call the function to insert data into the database
    insertDataIntoDatabase(dataToImport);

    // Respond with success message
    res.status(200).send('Data imported and inserted successfully.');
  } catch (error) {
    console.error('Error while processing the uploaded file:', error);
    res.status(500).send('There was an error importing data.');
  }
});



// Start the server
const port = process.env.PORT || 8888;
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
