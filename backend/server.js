const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// MongoDB Connection with autoIndex disabled
mongoose.connect(process.env.MONGODB_URI, {
  autoIndex: false  // Disable automatic index creation to prevent duplicates
})
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

// Routes with error handling
app.use('/api/customers', (req, res, next) => {
  console.log('📍 Customer route hit:', req.method, req.path);
  next();
}, require('./routes/customers'));

app.use('/api/entries', (req, res, next) => {
  console.log('📍 Entry route hit:', req.method, req.path);
  next();
}, require('./routes/entries'));

app.use('/api/transactions', (req, res, next) => {
  console.log('📍 Transaction route hit:', req.method, req.path);
  next();
}, require('./routes/transactions'));

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ ERROR:', err);
  res.status(500).json({ message: err.message, stack: err.stack });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'CEMS Poultry Farm API Running' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});