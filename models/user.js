const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Schema = mongoose.Schema;
require('dotenv').config(); // Load environment variables from .env file

// Define the user schema
const UserSchema = new Schema({
  email_address: String,
  username: String,
  password: String,
  firstname: String,
  lastname: String,
  dateadded: {
    type: Date,
    default: Date.now 
  },// This will automatically set the current date and time
  permission: { 
    type: String, 
    default: 'general'
  } 
});

UserSchema.pre('save', async function(next) {
  try {
    // check method of registration
    const user = this;
    if (!user.isModified('password')) next();
    // generate salt
    const salt = await bcrypt.genSalt(10);
    // hash the password
    const hashedPassword = await bcrypt.hash(this.password, salt);
    // const hashedPassword = this.password;
    // replace plain text password with hashed password
    this.password = hashedPassword;
    next();
  } catch (error) {
    return next(error);
  }
});

UserSchema.methods.matchPassword = async function (password) {
  try {
    // return password === this.password;
    return await bcrypt.compare(password, this.password);
  } catch (error) {
    throw new Error(error);
  }
 };

// Create the User model
const User = mongoose.model('User', UserSchema);

module.exports = User;