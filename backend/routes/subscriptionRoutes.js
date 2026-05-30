const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  createSubscription,
  getSubscriptions,
  updateSubscription,
  deleteSubscription,
} = require('../controllers/subscriptionController');

// All routes are protected — valid JWT required
router.post('/', protect, createSubscription);
router.get('/', protect, getSubscriptions);
router.put('/:id', protect, updateSubscription);
router.delete('/:id', protect, deleteSubscription);

module.exports = router;
