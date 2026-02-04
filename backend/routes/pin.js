const express = require('express');
const router = express.Router();

router.post('/verify-pin', (req, res) => {
  const { pin } = req.body;

  console.log('Received PIN:', pin, 'Type:', typeof pin);
  console.log('Expected PIN:', process.env.APP_PIN, 'Type:', typeof process.env.APP_PIN);

  if (!pin) {
    return res.status(400).json({ message: 'PIN is required' });
  }

  // Trim whitespace and convert both to strings
  const receivedPin = String(pin).trim();
  const expectedPin = String(process.env.APP_PIN).trim();

  console.log('After trim - Received:', receivedPin, 'Expected:', expectedPin);
  console.log('Match:', receivedPin === expectedPin);

  if (receivedPin === expectedPin) {
    console.log('PIN matched!');
    return res.json({ success: true });
  }

  console.log('PIN did not match');
  return res.status(401).json({ success: false, message: 'Invalid PIN' });
});

module.exports = router;