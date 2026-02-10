const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  entryNumber: { type: String, required: true },
  entryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Entry', required: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  truckNumber: { type: String, required: true },
  contactNumber: { type: String, required: true },
  customerName: { type: String, required: true },
  emptyWeight: { type: Number, required: true },
  loadedWeight: { type: Number, required: true },
  netWeight: { type: Number, required: true },
  ratePerKg: {
    type: Number,
    required: true
  },
  totalAmount: { type: Number, required: true },
  advancePaid: { type: Number, default: 0 },
  oldBalance: { type: Number, default: 0 },
  paidNow: { type: Number, default: 0 },
  finalBalance: { type: Number, required: true },
  paymentMethod: { type: String, enum: ['cash', 'bank'], default: 'cash' },
  shedLocation: { type: String, default: '' },
  entryDate: { type: Date, required: true },
  entryTime: { type: String, required: true },
  exitDate: { type: Date, required: true },
  exitTime: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

// These compound indexes are fine - no duplicates
transactionSchema.index({ customerId: 1, createdAt: -1 });
transactionSchema.index({ exitDate: -1 });

module.exports = mongoose.model('Transaction', transactionSchema);