const express = require('express');
const User = require('../models/user.js');
const router = express.Router();
const bcrypt = require('bcryptjs');

/**
 * Admin Users page
 */
router.get('/admin/users', async function(req, res, next) {

  if (!req.isAuthenticated()) {
    return res.redirect('/');
  } else { 

  console.log("--------------------------------------------")
  console.log("USER (router.get('/admin/users')): ", req.user);
  console.log("Is Plain Object:", Object.getPrototypeOf(req.user) === Object.prototype);
  const plainUser = req.user.toObject();
  console.log("USER PERMISSION (router.get('/admin/users')): ", plainUser.permission)
  console.log("--------------------------------------------")

  if (!req.isAuthenticated() || plainUser.permission !== 'admin') {
    return res.redirect('/');
  }
  try {
    const users = await User.find();
    // migrateUsers();
    console.log('users: ', users)
    res.render('admin', { 
      username: req.user ? req.user.username : null,
      isLoggedIn: req.isAuthenticated(), 
      isAdmin: plainUser.permission === 'admin', 
      users });


  } catch (error) {
    console.error(error);
    res.status(500).send(error);
  }
  
}});

async function migrateUsers() {
  try {
    // Find all existing users without the 'permission' field
    const usersWithoutPermission = await User.find({ permission: { $exists: false } });

    // Update each user to add the 'permission' field
    for (const user of usersWithoutPermission) {
      user.permission = 'admin'; // Set a default value if needed
      await user.save();
    }

    console.log('Migration completed successfully.');
  } catch (error) {
    console.error('Error during migration:', error);
  } finally {
    mongoose.disconnect();
  }
  console.log('migrateUsere() completed.');
}



/**
 * Admin Users page - adding a new user or editing an existing user
 */
router.get('/admin/users/:id', async function(req, res, next) {

  if (!req.isAuthenticated()) {
    return res.redirect('/');
  } else {

  console.log("--------------------------------------------")
  console.log("USER (router.get('/admin/users/:id')): ", req.user);
  console.log("Is Plain Object:", Object.getPrototypeOf(req.user) === Object.prototype);
  const plainUser = req.user.toObject();
  console.log("USER PERMISSION (router.get('/admin/users/:id')): ", plainUser.permission)
  console.log("--------------------------------------------")

  if (!req.isAuthenticated() || plainUser.permission !== 'admin') {
    return res.redirect('/');
  }
  // adding a new user
  let method = "POST";
  let action = "/users";
  let updateBtn = 'Create';
  let user = null;
  if (req.params.id === 'new') {
  } else {
    // editing an existing user
    method = "PUT";
    updateBtn = 'Update';
    user = await User.findById(req.params.id);
    action = `/users/${req.params.id}`
  }
  res.render('user', { 
    username: req.user ? req.user.username : null,
    isLoggedIn: req.isAuthenticated(), 
    isAdmin: plainUser.permission === 'admin', 
    action, 
    method, 
    user, 
    updateBtn, 
    error: req.flash('error') });
}});

// Create a new user
router.post('/users', async (req, res) => {
  
  const { firstname, lastname, username, email_address, password, permission, method } = req.body;
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
    const user = new User({ firstname, lastname, username, email_address, password, permission });
    console.log('user: ', user);
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
  const { firstname, lastname, username, email_address, password, permission, dateadded } = req.body;
  
  

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  try {
    console.log('req.body: ', req.body);
    const user = await User.findByIdAndUpdate( id, { firstname, lastname, username, email_address, permission, password: hashedPassword });
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
