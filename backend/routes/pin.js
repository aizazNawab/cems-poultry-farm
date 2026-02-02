const express = require('express');
const router = express.Router();

router.post('/verify-pin', (req, res) => {
  const { pin } = req.body;

  if (!pin) {
    return res.status(400).json({ message: 'PIN is required' });
  }

  if (pin === process.env.APP_PIN) {
    return res.json({ success: true });
  }

  return res.status(401).json({ success: false, message: 'Invalid PIN' });
});

module.exports = router;
