const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// PIN Routes
const pinRoutes = require('./routes/pin');

// Middleware - Updated CORS for production
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, {
  autoIndex: false
})
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

// PIN route
app.use('/api', pinRoutes);

// Existing routes
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
  res.status(500).json({ message: err.message });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Qaiser Ali Poultry Farm API Running' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});