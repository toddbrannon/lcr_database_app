const mongoose = require('mongoose');
const Schema = mongoose.Schema;
require('dotenv').config(); // Load environment variables from .env file

// Define the upload_log schema
const UploadLogSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId, // Assuming this refers to the User model's _id
    required: true,
    ref: 'User' // Creating a reference to the User model
  },
  uploadId: {
    type: String,
    required: true,
    unique: true // Ensure each upload has a unique identifier
  },
  progress: {
    type: Number,
    default: 0 // Progress percentage
  },
  startTime: {
    type: Date,
    default: Date.now // Automatically set to the current date and time
  },
  endTime: {
    type: Date // Timestamp when the upload ended
  },
  status: {
    type: String,
    enum: ['In Progress', 'Completed', 'Failed'], // Allowed values
    default: 'In Progress'
  },
  fileName: {
    type: String,
    required: true // Name of the uploaded file
  },
  fileSize: {
    type: Number,
    required: true // Size of the uploaded file
  },
  error: {
    type: String // Error message in case of upload failure
  }
});

// Create the UploadLog model
const UploadLog = mongoose.model('UploadLog', UploadLogSchema);

module.exports = UploadLog;
