const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  truckNumber: {
    type: String,
    required: true,
    unique: true,  // ONLY truck number is unique
    uppercase: true,
    trim: true
  },
  contactNumber: {
    type: String,
    required: true,
    trim: true
    // NO unique constraint here
  },
  balance: {
    type: Number,
    default: 0
  },
  totalTransactions: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Only index contactNumber, not unique
customerSchema.index({ contactNumber: 1 });

module.exports = mongoose.model('Customer', customerSchema);