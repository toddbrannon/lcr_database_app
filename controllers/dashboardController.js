const dataUtils = require('../utils/dataUtils'); // Import data utility functions

console.log('dashboardController.js is being executed.');

const dashboardController = {
  showDashboard(req, res) {
    // Retrieve data from the database and format it as needed
    // Replace the following with your actual database query and formatting logic
    const dataFromDatabase = []; // Replace with fetched data

    const formattedData = dataFromDatabase.map(row => ({
      // Format data fields using dataUtils.formatDataDate and other utility functions
      // For example:
      hireDate: dataUtils.formatDataDate(row.HireDate),
      // ... other formatted fields ...
    }));

    res.render('/', { data: formattedData, isLoggedIn: req.isAuthenticated() });
  },

  // Other methods related to the dashboard...
};

module.exports = dashboardController;
