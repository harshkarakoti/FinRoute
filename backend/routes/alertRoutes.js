const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { triggerAlerts, resetAlert } = require('../controllers/alertController');

// POST /api/alerts/trigger — called by external cron (protected by x-cron-secret header)
router.post('/trigger', triggerAlerts);

// POST /api/alerts/reset/:id — user resets alert after managing their subscription
router.post('/reset/:id', protect, resetAlert);

module.exports = router;
