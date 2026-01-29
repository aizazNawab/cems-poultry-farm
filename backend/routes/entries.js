const express = require('express');
const router = express.Router();
const Entry = require('../models/Entry');
const Customer = require('../models/Customer');

router.get('/', async (req, res) => {
  try {
    const { completed } = req.query;
    const filter = completed !== undefined ? { completed: completed === 'true' } : {};
    const entries = await Entry.find(filter).sort({ createdAt: -1 });
    res.json(entries);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/pending', async (req, res) => {
  try {
    const entries = await Entry.find({ completed: false }).sort({ createdAt: -1 });
    res.json(entries);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// UPDATED: Find entry by truck number ONLY
router.get('/find', async (req, res) => {
  try {
    const { truckNumber } = req.query;
    const entry = await Entry.findOne({
      completed: false,
      truckNumber: truckNumber?.toUpperCase()
    });
    res.json(entry);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/next-number', async (req, res) => {
  try {
    const count = await Entry.countDocuments();
    const nextNumber = (count + 1).toString().padStart(4, '0');
    res.json({ entryNumber: nextNumber });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// UPDATED: Create entry - check truck number only
// UPDATED: Create entry - check based on customerType
router.post('/', async (req, res) => {
  try {
    const { truckNumber, contactNumber, customerName, emptyWeight, advancePayment, entryDate, entryTime, customerType } = req.body;
    
    // Check if customer exists by truck number ONLY
    let customer = await Customer.findOne({
      truckNumber: truckNumber.toUpperCase()
    });
    
    // Validation based on customer type
    if (customerType === 'new' && customer) {
      // New customer but truck already exists - REJECT
      return res.status(400).json({ 
        message: `Truck ${truckNumber} already exists! Please use "Existing Customer" option.`
      });
    }
    
    if (customerType === 'existing' && !customer) {
      // Existing customer but truck doesn't exist - REJECT
      return res.status(400).json({ 
        message: `Truck ${truckNumber} not found! Please use "New Customer" option.`
      });
    }
    
    // DON'T create customer yet - only create when exit is completed
    const count = await Entry.countDocuments();
    const entryNumber = (count + 1).toString().padStart(4, '0');
    
    const entry = new Entry({ 
      entryNumber, 
      truckNumber: truckNumber.toUpperCase(), 
      contactNumber, 
      customerName, 
      emptyWeight, 
      advancePayment: advancePayment || 0, 
      entryDate, 
      entryTime, 
      completed: false, 
      customerId: customer?._id || null  // Null if new customer
    });
    
    await entry.save();
    res.status(201).json(entry);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});
router.delete('/:id', async (req, res) => {
  try {
    await Entry.findByIdAndDelete(req.params.id);
    res.json({ message: 'Entry deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
module.exports = router;