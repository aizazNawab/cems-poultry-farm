const mongoose = require('mongoose');

const entrySchema = new mongoose.Schema({
  entryNumber: { type: String, required: true, unique: true },
  truckNumber: { type: String, required: true, uppercase: true },
  contactNumber: { type: String, required: true },
  customerName: { type: String, required: true },
  emptyWeight: { type: Number, required: true },
  advancePayment: { type: Number, default: 0 },
  entryDate: { type: Date, required: true },
  entryTime: { type: String, required: true },
  completed: { type: Boolean, default: false },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  createdAt: { type: Date, default: Date.now }
});

entrySchema.index({ truckNumber: 1, completed: 1 });

module.exports = mongoose.model('Entry', entrySchema);