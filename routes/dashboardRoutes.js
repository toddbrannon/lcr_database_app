const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController'); // Import your dashboard controller

console.log('dashboardRoutes.js is being executed.');


// Define routes for dashboard
router.get('/', (req, res) => {
    dashboardController.showDashboard(req, res);
  });
router.get('/jobcodes', (req, res) => {
    dashboardController.showJobCodes(req, res);
  });
router.get('/locations', (req, res) => {
    dashboardController.showLocations(req, res);
  });
router.get('/pivot', (req, res) => {
    dashboardController.showPivot(req, res);
  });
router.get('/lahaina_pivot', (req, res) => {
    dashboardController.showLahainaPivot(req, res);
  });

module.exports = router;
