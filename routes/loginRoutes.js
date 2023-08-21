// routes/loginRoutes.js
const express = require('express');
const loginController = require('../controllers/loginController');

const router = express.Router();

router.get('/login', loginController.showLoginPage);
router.post('/login', loginController.handleLogin);
router.get('/logout', loginController.logout);

module.exports = router;
