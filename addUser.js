const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Schema = mongoose.Schema;
const User = require('./models/user'); // Import the User model

require('dotenv').config(); // Load environment variables from .env file

// Define the user schema
// const UserSchema = new Schema({
//     email_address: String,
//     username: String,
//     password: String,
//     firstname: String,
//     lastname: String,
//     dateadded: {
//       type: Date,
//       default: Date.now 
//     },// This will automatically set the current date and time
//     permission: { 
//       type: String, 
//       default: 'general'
//     } 
//   });


// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('Connected to MongoDB');
  // Create a new user instance
  const newUser = new User({
    email_address: process.env.EMAIL,
    username:  process.env.USER,
    password:  process.env.PASSWORD, // Plain text password, it will be hashed automatically due to pre-save hook
    firstname:  process.env.FIRSTNAME,
    lastname:  process.env.LASTNAME
  });

  // Save the new user to the database
  newUser.save()
    .then(user => {
      console.log('New user added:', user);
      mongoose.connection.close(); // Close the MongoDB connection after adding the user
    })
    .catch(error => {
      console.error('Error adding new user:', error);
      mongoose.connection.close(); // Close the MongoDB connection if an error occurs
    });
})
.catch(error => console.error('Error connecting to MongoDB:', error));
