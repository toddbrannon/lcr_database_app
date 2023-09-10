const express = require('express');
const passport = require('passport');
const LocalStrategy = require('passport-local');
const crypto = require('crypto');
const User = require('../models/user.js');
const router = express.Router();

passport.use(
  "local-login",
  new LocalStrategy(
    {
      username: "username",
      password: "password",
    },
    async (username, password, done) => {
      try {
        const user = await User.findOne({ username: username });
        if (!user) return done(null, false, { message: 'Incorrect username or password.' });
        const isMatch = await user.matchPassword(password);
        if (!isMatch)
          return done(null, false, { message: 'Incorrect username or password.' });
        // if passwords match return user
        return done(null, user);
      } catch (error) {
        console.log(error)
        return done(error, false);
      }
    }
  )
);

passport.serializeUser(function(user, cb) {
  process.nextTick(function() {
    cb(null, { id: user.id, username: user.username, permission: user.permission });
  });
});

// passport.deserializeUser(function(user, cb) {
//   process.nextTick(function() {
//     return cb(null, user);
//   });
// });

// passport.deserializeUser(function(id, done) {
//   User.findById(obj.id, 'id username permission')
//     .then(user => {
//       done(null, user);
//     })
//     .catch(err => {
//       done(err);
//     });
// });

passport.deserializeUser(async function(obj, done) {
  try {
    const user = await User.findById(obj.id, 'id username permission');
    console.log("ID (passport.deserializeUser): ", user.id)
    console.log("USERNAME (passport.deserializeUser): ", user.username)
    console.log("PERMISSION (passport.deserializeUser): ", user.permission)
    done(null, user);
  } catch (err) {
    done(err);
  }
});


// Set up login page route
router.get('/login', function(req, res, next) {
  res.render('login', { 
    username: req.user ? req.user.username : null,
    isLoggedIn: req.isAuthenticated(),
    isAdmin: req.user ? req.user.permission === 'admin' : false
  });
});

router.post('/login/password', passport.authenticate('local-login', {
  successReturnToOrRedirect: '/',
  failureRedirect: '/login',
  failureMessage: true
}), (req, res) => {
   console.log('If you see this, authentication was successful');
   res.redirect('/index');
});

/* POST /logon
 *
 * This route logs the user out.
 */
router.post('/logout', function(req, res, next) {
  req.logout(function(err) {
    if (err) { return next(err); }
    res.redirect('/login');
  });
});

router.get('/logout', function(req, res, next) {
  res.render('login', { 
    username: req.user ? req.user.username : null,
    isLoggedIn: req.isAuthenticated(), 
    isAdmin: req.user.permission === 'admin' 
  });
});

module.exports = router;
