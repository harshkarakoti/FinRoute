const Subscription = require('../models/Subscription');

// @desc    Create a new subscription
// @route   POST /api/subscriptions
// @access  Private
const createSubscription = async (req, res) => {
  try {
    const {
      name,
      amount,
      billingCycle,
      nextRenewalDate,
      category,
      currency,
      isShared,
      totalRoommates,
    } = req.body;

    if (!name || !amount || !billingCycle || !nextRenewalDate) {
      return res.status(400).json({
        message: 'Please provide name, amount, billingCycle, and nextRenewalDate',
      });
    }

    // Calculate yourShare programmatically
    let splitDetails = {};
    const shared = Boolean(isShared);
    if (shared && totalRoommates && totalRoommates > 0) {
      splitDetails = {
        totalRoommates,
        yourShare: parseFloat((amount / totalRoommates).toFixed(2)),
      };
    } else {
      splitDetails = {
        yourShare: amount,
      };
    }

    const subscription = await Subscription.create({
      user: req.user.id,
      name,
      amount,
      currency: currency || 'INR',
      billingCycle,
      nextRenewalDate,
      category: category || 'Other',
      isShared: shared,
      splitDetails,
    });

    return res.status(201).json(subscription);
  } catch (error) {
    console.error('Create subscription error:', error.message);
    return res.status(500).json({ message: 'Server error while creating subscription' });
  }
};

// @desc    Get all subscriptions for logged-in user
// @route   GET /api/subscriptions
// @access  Private
const getSubscriptions = async (req, res) => {
  try {
    const subscriptions = await Subscription.find({ user: req.user.id }).sort({
      nextRenewalDate: 1, // ascending — closest renewal first
    });

    return res.status(200).json(subscriptions);
  } catch (error) {
    console.error('Get subscriptions error:', error.message);
    return res.status(500).json({ message: 'Server error while fetching subscriptions' });
  }
};

// @desc    Update a subscription
// @route   PUT /api/subscriptions/:id
// @access  Private
const updateSubscription = async (req, res) => {
  try {
    const subscription = await Subscription.findById(req.params.id);

    if (!subscription) {
      return res.status(404).json({ message: 'Subscription not found' });
    }

    // Ownership check
    if (subscription.user.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this subscription' });
    }

    const {
      name,
      amount,
      billingCycle,
      nextRenewalDate,
      category,
      currency,
      isShared,
      totalRoommates,
      alertSettings,
    } = req.body;

    // Apply scalar field updates
    if (name !== undefined) subscription.name = name;
    if (amount !== undefined) subscription.amount = amount;
    if (billingCycle !== undefined) subscription.billingCycle = billingCycle;
    if (nextRenewalDate !== undefined) subscription.nextRenewalDate = nextRenewalDate;
    if (category !== undefined) subscription.category = category;
    if (currency !== undefined) subscription.currency = currency;
    if (alertSettings !== undefined) subscription.alertSettings = alertSettings;

    // Recalculate split if relevant fields changed
    const effectiveAmount = amount !== undefined ? amount : subscription.amount;
    const effectiveIsShared = isShared !== undefined ? Boolean(isShared) : subscription.isShared;
    const effectiveRoommates =
      totalRoommates !== undefined ? totalRoommates : subscription.splitDetails?.totalRoommates;

    if (isShared !== undefined) subscription.isShared = effectiveIsShared;

    if (effectiveIsShared && effectiveRoommates && effectiveRoommates > 0) {
      subscription.splitDetails = {
        totalRoommates: effectiveRoommates,
        yourShare: parseFloat((effectiveAmount / effectiveRoommates).toFixed(2)),
      };
    } else {
      subscription.splitDetails = {
        yourShare: effectiveAmount,
      };
    }

    const updated = await subscription.save();
    return res.status(200).json(updated);
  } catch (error) {
    console.error('Update subscription error:', error.message);
    return res.status(500).json({ message: 'Server error while updating subscription' });
  }
};

// @desc    Delete a subscription
// @route   DELETE /api/subscriptions/:id
// @access  Private
const deleteSubscription = async (req, res) => {
  try {
    const subscription = await Subscription.findById(req.params.id);

    if (!subscription) {
      return res.status(404).json({ message: 'Subscription not found' });
    }

    // Ownership check
    if (subscription.user.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this subscription' });
    }

    await subscription.deleteOne();
    return res.status(200).json({ message: 'Subscription removed successfully' });
  } catch (error) {
    console.error('Delete subscription error:', error.message);
    return res.status(500).json({ message: 'Server error while deleting subscription' });
  }
};

module.exports = {
  createSubscription,
  getSubscriptions,
  updateSubscription,
  deleteSubscription,
};
