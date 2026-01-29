const express = require('express');
const router = express.Router();
const Customer = require('../models/Customer');

router.get('/', async (req, res) => {
  try {
    const customers = await Customer.find().sort({ createdAt: -1 });
    res.json(customers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// UPDATED: Find customer by truck number ONLY
router.get('/find', async (req, res) => {
  try {
    const { truckNumber } = req.query;
    const customer = await Customer.findOne({
      truckNumber: truckNumber?.toUpperCase()
    });
    res.json(customer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, truckNumber, contactNumber } = req.body;
    let customer = await Customer.findOne({ 
      truckNumber: truckNumber.toUpperCase() 
    });
    
    if (customer) {
      customer.name = name;
      customer.truckNumber = truckNumber.toUpperCase();
      customer.contactNumber = contactNumber;
      customer.updatedAt = Date.now();
      await customer.save();
    } else {
      customer = new Customer({ 
        name, 
        truckNumber: truckNumber.toUpperCase(), 
        contactNumber, 
        balance: 0, 
        totalTransactions: 0 
      });
      await customer.save();
    }
    res.status(201).json(customer);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;