const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/uploadController'); // Import your upload controller

// Define routes for file upload
router.get('/upload', uploadController.showUploadPage);
router.post('/upload', uploadController.handleUpload);

module.exports = router;
