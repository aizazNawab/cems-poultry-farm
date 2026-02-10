const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const Entry = require('../models/Entry');
const Customer = require('../models/Customer');

router.get('/', async (req, res) => {
  try {
    const { startDate, endDate, customerId } = req.query;
    let filter = {};
    if (startDate && endDate) {
      filter.exitDate = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }
    if (customerId) filter.customerId = customerId;
    const transactions = await Transaction.find(filter).sort({ exitDate: -1 }).populate('customerId', 'name balance');
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { entryId, loadedWeight, netWeight, ratePerKg, totalAmount, advancePaid, oldBalance, paidNow, finalBalance, shedLocation, exitDate, exitTime, paymentMethod } = req.body;
    const entry = await Entry.findById(entryId);
    if (!entry) {
      return res.status(404).json({ message: 'Entry not found' });
    }
    
    // Find or create customer
    let customer = await Customer.findOne({
      truckNumber: entry.truckNumber
    });
    
    if (!customer) {
      // NEW: Create customer NOW (when exit is completed)
      customer = new Customer({
        name: entry.customerName,
        truckNumber: entry.truckNumber,
        contactNumber: entry.contactNumber,
        balance: 0,
        totalTransactions: 0
      });
      await customer.save();
    }
    
    // Create transaction
    const transaction = new Transaction({
      entryNumber: entry.entryNumber,
      entryId: entry._id,
      customerId: customer._id,
      truckNumber: entry.truckNumber,
      contactNumber: entry.contactNumber,
      customerName: entry.customerName,
      emptyWeight: entry.emptyWeight,
      loadedWeight,
      netWeight,
      ratePerKg,      
      totalAmount,
      advancePaid,
      oldBalance,
      paidNow,
      finalBalance,
      shedLocation,
      paymentMethod: paymentMethod || 'cash',
      entryDate: entry.entryDate,
      entryTime: entry.entryTime,
      exitDate,
      exitTime
    });
    
    await transaction.save();
    
    // Update customer balance and transaction count
    customer.balance = parseFloat(finalBalance);
    customer.totalTransactions += 1;
    customer.updatedAt = Date.now();
    await customer.save();
    
    // Mark entry as completed
    entry.completed = true;
    entry.customerId = customer._id;  // Update customerId if it was null
    await entry.save();
    
    res.status(201).json(transaction);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// NEW: Update transaction endpoint
router.put('/:id', async (req, res) => {
  try {
    const { loadedWeight, ratePerKg, paidNow, shedLocation, paymentMethod } = req.body;
    const transaction = await Transaction.findById(req.params.id);
    
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    // Recalculate if weight or rate changed
    if (loadedWeight) {
      transaction.loadedWeight = loadedWeight;
      transaction.netWeight = loadedWeight - transaction.emptyWeight;
    }
    
    if (ratePerKg) {
      transaction.ratePerKg = ratePerKg;
    }

    // Recalculate total if needed
    if (loadedWeight || ratePerKg) {
      transaction.totalAmount = transaction.netWeight * transaction.ratePerKg;
    }

    if (paidNow !== undefined) {
      const oldPaidNow = transaction.paidNow || 0;
      transaction.paidNow = paidNow;
      
      // Recalculate final balance
      transaction.finalBalance = (transaction.totalAmount + transaction.oldBalance) - (transaction.advancePaid + paidNow);
      
      // Update customer balance
      const balanceDiff = oldPaidNow - paidNow;
      const customer = await Customer.findById(transaction.customerId);
      if (customer) {
        customer.balance = parseFloat(transaction.finalBalance);
        customer.updatedAt = Date.now();
        await customer.save();
      }
    }

    if (shedLocation !== undefined) {
      transaction.shedLocation = shedLocation;
    }

    if (paymentMethod) {
      transaction.paymentMethod = paymentMethod;
    }

    await transaction.save();
    res.json(transaction);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);
    if (!transaction) return res.status(404).json({ message: 'Transaction not found' });
    
    await Entry.findByIdAndUpdate(transaction.entryId, { completed: false });
    
    const customer = await Customer.findById(transaction.customerId);
    if (customer) {
      customer.totalTransactions = Math.max(0, customer.totalTransactions - 1);
      
      // Recalculate balance by finding the latest transaction for this customer
      const latestTransaction = await Transaction.findOne({ 
        customerId: customer._id,
        _id: { $ne: req.params.id } // Exclude the one being deleted
      }).sort({ createdAt: -1 });
      
      customer.balance = latestTransaction ? latestTransaction.finalBalance : 0;
      customer.updatedAt = Date.now();
      await customer.save();
    }
    
    await Transaction.findByIdAndDelete(req.params.id);
    res.json({ message: 'Transaction deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;