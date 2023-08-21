const express = require('express');
const app = express();
const path = require('path');
const session = require('express-session');
const passport = require('passport');
const flash = require('express-flash');
const port = process.env.PORT || 8888;

// Import route files
const loginRoutes = require('./routes/loginRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const uploadRoutes = require('./routes/uploadRoutes');

// Set up static file serving
app.use(express.static(path.join(__dirname, 'public')));

// Use EJS as the templating engine
app.set('view engine', 'ejs');

// Use session, passport, flash
app.use(session({ /* ... */ }));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

// Include routes
app.use('/', loginRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/upload', uploadRoutes);

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
