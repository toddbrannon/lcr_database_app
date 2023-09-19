const express = require('express');
const passport = require('passport');
const LocalStrategy = require('passport-local');
const crypto = require('crypto');
const User = require('../models/user.js');
const flash = require('connect-flash');
const nodemailer = require('nodemailer');
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
    cb(null, { id: user.id, firstname: user.firstname, lastname: user.lastname, username: user.username, permission: user.permission });
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
    const user = await User.findById(obj.id, 'id firstname lastname username permission');
    console.log("ID (passport.deserializeUser): ", user.id)
    console.log("FIRSTNAME (passport.deserializeUser): ", user.firstname)
    console.log("LASTNAME (passport.deserializeUser): ", user.lastname)
    console.log("USERNAME (passport.deserializeUser): ", user.username)
    console.log("PERMISSION (passport.deserializeUser): ", user.permission)
    done(null, user);
  } catch (err) {
    done(err);
  }
});

// Create a transporter object using the default SMTP transport
const transporter = nodemailer.createTransport({
  host: 'mail.privateemail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USERNAME,
    pass: process.env.EMAIL_PASSWORD
  },
  tls: {
    // do not fail on invalid certs
    rejectUnauthorized: false
  },
  connectionTimeout: 30000 // 30 seconds
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
  successReturnToOrRedirect: '/dashboard',
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

// Render the forgot password page
router.get('/forgot_password', function(req, res, next) {
  res.render('forgot_password', { 
    username: req.user ? req.user.username : null,
    isLoggedIn: req.isAuthenticated(),
    isAdmin: req.user ? req.user.permission === 'admin' : false,
    error: req.flash('error'),
    success: req.flash('success')
  });
});


// Handle the forgot password form submission
// Check the database for the existence of the email address input into the form
router.post('/send-email', async function(req, res, next) {
  console.log("Request body:", req.body);  // Debugging line
  const emailAddress = req.body['email-address'];
  try {
    const user = await User.findOne({ email_address: emailAddress });
    console.log("USER: ", user)
    if (!user) {
      console.log('Email address not found.');
      req.flash('error', 'Email address not found.');
      return res.redirect('/forgot_password');
    }

    // Generate a reset token (you should save this token to your database)
    const resetToken = crypto.randomBytes(20).toString('hex');

    // TODO: Save resetToken to your database linked to the user

    // Send email
    const mailOptions = {
      from: '"Trusponse Support" <support@trusponse.com>',
      to: emailAddress,
      subject: 'LCR Capital Password Reset',
      html: `<p>You requested a password reset for the LCR Capital Partners Denny's Employee Hours Reporting Application. Click <a href="http://your-domain.com/reset_password?token=${resetToken}">here</a> to reset your password.</p>`
    };

    transporter.sendMail(mailOptions, function(error, info) {
      if (error) {
        console.log(error);
        req.flash('error', 'An error occurred while sending the email.');
        return res.redirect('/forgot_password');
      } else {
        console.log('Email sent: ' + info.response);
        req.flash('success', 'A reset link has been sent to your email.');
        return res.redirect('/forgot_password');
      }
    });

  } catch (error) {
    console.log(error);
    return next(error);
  }
});


module.exports = router;
