const Subscription = require('../models/Subscription');
const User = require('../models/User');
const { sendRenewalAlertEmail } = require('../services/emailService');

// @desc    Scan all subscriptions and fire renewal alerts where due
// @route   POST /api/alerts/trigger
// @access  Internal (called by external cron job — protected by CRON_SECRET header)
const triggerAlerts = async (req, res) => {
  try {
    // Validate cron secret to prevent abuse
    const cronSecret = req.headers['x-cron-secret'];
    if (!cronSecret || cronSecret !== process.env.CRON_SECRET) {
      return res.status(401).json({ message: 'Unauthorized — invalid cron secret' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find all subscriptions where alert hasn't been sent yet
    const subscriptions = await Subscription.find({ 'alertSettings.isAlertSent': false });

    const results = { sent: 0, skipped: 0, errors: [] };

    for (const sub of subscriptions) {
      try {
        const renewal = new Date(sub.nextRenewalDate);
        renewal.setHours(0, 0, 0, 0);

        // Calculate days until renewal
        const msPerDay = 1000 * 60 * 60 * 24;
        const daysLeft = Math.round((renewal - today) / msPerDay);

        // Fire alert if within the configured daysBefore window (and not overdue)
        if (daysLeft > sub.alertSettings.daysBefore || daysLeft < 0) {
          results.skipped++;
          continue;
        }

        // Fetch the subscription owner
        const user = await User.findById(sub.user).select('name email');
        if (!user || !user.email) {
          results.skipped++;
          continue;
        }

        // Calculate effective share
        const yourShare =
          sub.isShared && sub.splitDetails?.yourShare
            ? sub.splitDetails.yourShare
            : sub.amount;

        // Fire the email
        await sendRenewalAlertEmail({
          toEmail: user.email,
          userName: user.name,
          subName: sub.name,
          amount: sub.amount,
          yourShare,
          currency: sub.currency,
          billingCycle: sub.billingCycle,
          renewalDate: sub.nextRenewalDate,
          daysLeft,
        });

        // Mark alert as sent to prevent re-firing
        sub.alertSettings.isAlertSent = true;
        await sub.save();

        results.sent++;
        console.log(`✅ Alert sent: ${sub.name} → ${user.email} (${daysLeft}d left)`);
      } catch (innerError) {
        console.error(`❌ Alert failed for sub ${sub._id}: ${innerError.message}`);
        results.errors.push({ subId: sub._id, error: innerError.message });
      }
    }

    return res.status(200).json({
      message: 'Alert scan complete',
      ...results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Alert trigger error:', error.message);
    return res.status(500).json({ message: 'Server error during alert scan' });
  }
};

// @desc    Reset isAlertSent flag after subscription renews (called internally or manually)
// @route   POST /api/alerts/reset/:id
// @access  Private (user must own the subscription)
const resetAlert = async (req, res) => {
  try {
    const subscription = await Subscription.findById(req.params.id);

    if (!subscription) {
      return res.status(404).json({ message: 'Subscription not found' });
    }

    if (subscription.user.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    subscription.alertSettings.isAlertSent = false;
    await subscription.save();

    return res.status(200).json({ message: 'Alert reset — will fire again before next renewal' });
  } catch (error) {
    console.error('Reset alert error:', error.message);
    return res.status(500).json({ message: 'Server error during alert reset' });
  }
};

module.exports = { triggerAlerts, resetAlert };
