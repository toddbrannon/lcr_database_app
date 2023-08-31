const express = require('express');
const User = require('../models/user.js');
const router = express.Router();

/**
 * Admin Users page
 */
router.get('/admin/users', async function(req, res, next) {
  if (!req.isAuthenticated()) {
    return res.redirect('/login');
  }
  try {
    const users = await User.find();
    res.render('admin', { isLoggedIn: req.isAuthenticated(), users });

  } catch (error) {
    console.error(error);
    res.status(500).send(error);
  }
  
});

/**
 * Admin Users page
 */
router.get('/admin/users/:id', async function(req, res, next) {
  if (!req.isAuthenticated()) {
    return res.redirect('/login');
  }
  let method = "POST";
  let action = "/users";
  let updateBtn = 'Create';
  let user = null;
  if (req.params.id === 'new') {
  } else {
    method = "PUT";
    updateBtn = 'Update';
    user = await User.findById(req.params.id);
    action = `/users/${req.params.id}`
  }
  res.render('user', { isLoggedIn: req.isAuthenticated(), action, method, user, updateBtn, error: req.flash('error') });
});

// Create a new user
router.post('/users', async (req, res) => {
  
  const { username, email_address, password, method } = req.body;
  try {
    const isNameExist = await User.find({username})
    if (isNameExist && isNameExist.length > 0) {
      req.flash("error", 'Name already exists!');
      return res.redirect('/admin/users/new');
    }
  } catch (error) {
    console.error(error);
    res.status(500).send(error);
  }

  try {
    const isEmailExist = await User.find({email_address})
    if (isEmailExist && isEmailExist.length > 0) {
      req.flash("error", 'Email already exists!');
      return res.redirect('/admin/users/new');
    }
  } catch (error) {
    console.error(error);
    res.status(500).send(error);
  }

  try {
    const user = new User({ username, email_address, password });
    await user.save();
    res.redirect('/admin/users');
  } catch (error) {
    console.error(error);
    res.status(500).send(error);
  }
});

// Update a user
router.put('/users/:id', async (req, res) => {
  const id = req.params.id;
  const { username, email_address, password } = req.body;

  try {
    const user = await User.findByIdAndUpdate( id, { username, email_address, password });
    res.redirect('/admin/users');
  } catch (error) {
    console.error(error);
    res.status(500).send(error);
  }
});

// Delete a user
router.delete('/users/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const user = await User.deleteOne({ _id: id });
    res.redirect('/admin/users');
  } catch (error) {
    console.error(error);
    res.status(500).send(error);
  }
});

module.exports = router;
