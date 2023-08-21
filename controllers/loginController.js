const passport = require('passport');
const User = require('../models/User'); // Adjust the path
const bcrypt = require('bcrypt');
const mongoConnection = require('../config/mongodb');
const { formatDataDate } = require('../utils/dataUtils'); // Adjust the path

const loginController = {
  showLoginPage(req, res) {
    res.render('login', { messages: req.flash('error') });
  },

  async handleLogin(req, res, next) {
    passport.authenticate('local', (err, user, info) => {
      if (err) {
        return next(err);
      }

      if (!user) {
        req.flash('error', 'Invalid username or password');
        return res.redirect('/login');
      }

      req.login(user, (loginErr) => {
        if (loginErr) {
          return next(loginErr);
        }
        return res.redirect('/dashboard'); // Redirect to the dashboard after successful login
      });
    })(req, res, next);
  },

  logout(req, res) {
    req.logout();
    res.redirect('/login');
  },
};

module.exports = loginController;

