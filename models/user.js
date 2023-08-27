const mongoose = require('mongoose');
const Schema = mongoose.Schema;
require('dotenv').config(); // Load environment variables from .env file

// Connect to the MongoDB database
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('Connected to MongoDB');
}).catch((err) => {
  console.log('Error connecting to MongoDB', err);
});

// Define the user schema
const userSchema = new Schema({
  email_address: String,
  username: String,
  password: String
});

// Create the User model
const User = mongoose.model('User', userSchema);

module.exports = User;