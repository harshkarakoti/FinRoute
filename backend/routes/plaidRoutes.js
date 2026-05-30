const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  createLinkToken,
  exchangePublicToken,
  syncTransactions,
  getLinkStatus,
  unlinkAccount,
} = require('../controllers/plaidController');

// All Plaid routes are private — valid JWT required

// POST /api/plaid/link-token    → generate link token for Plaid Link UI
router.post('/link-token', protect, createLinkToken);

// POST /api/plaid/exchange-token → swap public token for permanent access token
router.post('/exchange-token', protect, exchangePublicToken);

// POST /api/plaid/sync          → scan transactions, detect & import recurring subs
router.post('/sync', protect, syncTransactions);

// GET  /api/plaid/status        → check if bank account is linked + last sync time
router.get('/status', protect, getLinkStatus);

// DELETE /api/plaid/unlink      → revoke access token + clear plaid data
router.delete('/unlink', protect, unlinkAccount);

module.exports = router;
