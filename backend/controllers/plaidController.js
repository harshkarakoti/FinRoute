const plaidClient = require('../config/plaidClient');
const User = require('../models/User');
const Subscription = require('../models/Subscription');

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Detect billing cycle from average interval between transactions (in days).
 */
const detectBillingCycle = (avgDays) => {
  if (avgDays <= 10) return 'weekly';
  if (avgDays <= 45) return 'monthly';
  if (avgDays <= 120) return 'quarterly';
  return 'yearly';
};

/**
 * Map a Plaid merchant/category name to a FinRoute category enum.
 */
const mapCategory = (merchantName = '', plaidCategories = []) => {
  const name = merchantName.toLowerCase();
  const cats = plaidCategories.map((c) => c.toLowerCase()).join(' ');
  const combined = `${name} ${cats}`;

  if (/netflix|spotify|disney|hulu|youtube|prime video|apple tv|hotstar|zee5|jiocinema|crunchyroll/.test(combined))
    return 'Entertainment';
  if (/electricity|gas|water|internet|broadband|airtel|jio|bsnl|vodafone|vi|phone|mobile|utility/.test(combined))
    return 'Utilities';
  if (/github|notion|slack|figma|linear|vercel|heroku|digitalocean|sentry|postman|atlassian|jira|monday|zoom|gsuite|google workspace|microsoft 365|office/.test(combined))
    return 'SaaS';
  if (/gym|fitness|cult|healthify|headspace|calm|therapy|doctor|medical|hospital|pharmacy|health/.test(combined))
    return 'Health';
  if (/aws|amazon web|gcp|google cloud|azure|cloudflare|linode|vultr|cloud/.test(combined))
    return 'Cloud';

  return 'Other';
};

/**
 * Core recurring pattern detection algorithm.
 * Groups transactions by merchant name, checks interval consistency,
 * and returns detected subscriptions with estimated billing cycle.
 *
 * @param {Array} transactions - Raw Plaid transactions array
 * @returns {Array} - Array of detected recurring subscription objects
 */
const detectRecurringPatterns = (transactions) => {
  // Group by merchant name (normalize: lowercase + trim)
  const groups = {};
  for (const txn of transactions) {
    const key = (txn.merchant_name || txn.name || 'Unknown').toLowerCase().trim();
    if (!groups[key]) groups[key] = [];
    groups[key].push(txn);
  }

  const detected = [];

  for (const [merchantKey, txns] of Object.entries(groups)) {
    // Need at least 2 occurrences to confirm a pattern
    if (txns.length < 2) continue;

    // Sort by date ascending
    const sorted = txns.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Calculate intervals between consecutive transactions (in days)
    const intervals = [];
    for (let i = 1; i < sorted.length; i++) {
      const prev = new Date(sorted[i - 1].date);
      const curr = new Date(sorted[i].date);
      const days = Math.round((curr - prev) / (1000 * 60 * 60 * 24));
      intervals.push(days);
    }

    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;

    // Check consistency — all intervals should be within ±10 days of average
    // (accounts for billing date drift, weekends, bank delays)
    const isConsistent = intervals.every((d) => Math.abs(d - avgInterval) <= 10);

    // Skip if interval is too short (< 5 days = likely not a subscription)
    // or too long (> 400 days = annual with drift, still keep)
    if (!isConsistent || avgInterval < 5) continue;

    // Calculate average amount (use median to handle anomalies)
    const amounts = sorted.map((t) => Math.abs(t.amount));
    amounts.sort((a, b) => a - b);
    const medianAmount = amounts[Math.floor(amounts.length / 2)];

    // Estimate next renewal date from last transaction + avg interval
    const lastDate = new Date(sorted[sorted.length - 1].date);
    const nextRenewal = new Date(lastDate);
    nextRenewal.setDate(nextRenewal.getDate() + Math.round(avgInterval));

    const billingCycle = detectBillingCycle(avgInterval);
    const plaidCategories = sorted[sorted.length - 1].category || [];
    const merchantDisplay =
      sorted[sorted.length - 1].merchant_name ||
      sorted[sorted.length - 1].name ||
      'Unknown';

    detected.push({
      name: merchantDisplay,
      amount: medianAmount,
      billingCycle,
      nextRenewalDate: nextRenewal,
      category: mapCategory(merchantDisplay, plaidCategories),
      source: 'PLAID',
      // Use the latest transaction's ID as the idempotency key
      plaidTransactionId: sorted[sorted.length - 1].transaction_id,
      occurrences: sorted.length,
      avgIntervalDays: Math.round(avgInterval),
    });
  }

  return detected;
};

// ─────────────────────────────────────────────────────────────────────────────
// CONTROLLERS
// ─────────────────────────────────────────────────────────────────────────────

// @desc    Create a Plaid Link token for the frontend to initialize Plaid Link
// @route   POST /api/plaid/link-token
// @access  Private
const createLinkToken = async (req, res) => {
  try {
    const response = await plaidClient.linkTokenCreate({
      user: { client_user_id: req.user.id },
      client_name: 'FinRoute',
      products: ['transactions'],
      country_codes: ['US', 'IN'],
      language: 'en',
    });

    return res.status(200).json({ link_token: response.data.link_token });
  } catch (error) {
    console.error('Plaid link token error:', error.response?.data || error.message);
    return res.status(500).json({ message: 'Failed to create Plaid link token' });
  }
};

// @desc    Exchange Plaid public token for permanent access token, save to user
// @route   POST /api/plaid/exchange-token
// @access  Private
const exchangePublicToken = async (req, res) => {
  try {
    const { public_token } = req.body;

    if (!public_token) {
      return res.status(400).json({ message: 'public_token is required' });
    }

    const response = await plaidClient.itemPublicTokenExchange({ public_token });
    const { access_token, item_id } = response.data;

    // Persist access token and item ID to the user's plaid sub-document
    await User.findByIdAndUpdate(req.user.id, {
      'plaid.accessToken': access_token,
      'plaid.itemId': item_id,
      'plaid.status': 'LINKED',
      'plaid.lastSynced': null,
    });

    return res.status(200).json({ message: 'Bank account linked successfully' });
  } catch (error) {
    console.error('Plaid exchange token error:', error.response?.data || error.message);
    return res.status(500).json({ message: 'Failed to exchange Plaid token' });
  }
};

// @desc    Sync transactions from Plaid, detect recurring patterns, import subscriptions
// @route   POST /api/plaid/sync
// @access  Private
const syncTransactions = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user.plaid?.accessToken || user.plaid.status !== 'LINKED') {
      return res.status(400).json({
        message: 'No bank account linked. Please connect via Plaid Link first.',
      });
    }

    // Fetch up to 24 months of transactions to maximize pattern detection
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 24);
    const endDate = new Date();

    const formatDate = (d) => d.toISOString().split('T')[0]; // YYYY-MM-DD

    const txnResponse = await plaidClient.transactionsGet({
      access_token: user.plaid.accessToken,
      start_date: formatDate(startDate),
      end_date: formatDate(endDate),
      options: { count: 500, offset: 0 },
    });

    const transactions = txnResponse.data.transactions;

    if (!transactions || transactions.length === 0) {
      return res.status(200).json({
        message: 'No transactions found in the linked account',
        imported: 0,
        skipped: 0,
      });
    }

    // Run recurring pattern detection
    const detectedSubs = detectRecurringPatterns(transactions);

    const results = { imported: 0, skipped: 0, detected: detectedSubs.length };

    for (const sub of detectedSubs) {
      // IDEMPOTENCY CHECK — skip if this plaidTransactionId already exists
      const existing = await Subscription.findOne({
        user: user._id,
        plaidTransactionId: sub.plaidTransactionId,
      });

      if (existing) {
        results.skipped++;
        continue;
      }

      await Subscription.create({
        user: user._id,
        name: sub.name,
        amount: sub.amount,
        currency: user.currency || 'INR',
        billingCycle: sub.billingCycle,
        nextRenewalDate: sub.nextRenewalDate,
        category: sub.category,
        source: 'PLAID',
        plaidTransactionId: sub.plaidTransactionId,
        isShared: false,
        splitDetails: { yourShare: sub.amount },
      });

      results.imported++;
    }

    // Update lastSynced timestamp on user
    await User.findByIdAndUpdate(user._id, {
      'plaid.lastSynced': new Date(),
    });

    return res.status(200).json({
      message: 'Plaid sync complete',
      ...results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Plaid sync error:', error.response?.data || error.message);
    return res.status(500).json({ message: 'Failed to sync transactions from Plaid' });
  }
};

// @desc    Get current Plaid link status for the logged-in user
// @route   GET /api/plaid/status
// @access  Private
const getLinkStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('plaid');
    return res.status(200).json({
      status: user.plaid?.status || 'NOT_LINKED',
      lastSynced: user.plaid?.lastSynced || null,
    });
  } catch (error) {
    console.error('Plaid status error:', error.message);
    return res.status(500).json({ message: 'Failed to get Plaid status' });
  }
};

// @desc    Unlink bank account (revoke access token, clear plaid sub-doc)
// @route   DELETE /api/plaid/unlink
// @access  Private
const unlinkAccount = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user.plaid?.accessToken || user.plaid.status !== 'LINKED') {
      return res.status(400).json({ message: 'No linked account to remove' });
    }

    // Revoke the access token with Plaid
    await plaidClient.itemRemove({ access_token: user.plaid.accessToken });

    // Clear plaid sub-document
    await User.findByIdAndUpdate(user._id, {
      'plaid.accessToken': null,
      'plaid.itemId': null,
      'plaid.status': 'NOT_LINKED',
      'plaid.lastSynced': null,
    });

    return res.status(200).json({ message: 'Bank account unlinked successfully' });
  } catch (error) {
    console.error('Plaid unlink error:', error.response?.data || error.message);
    return res.status(500).json({ message: 'Failed to unlink bank account' });
  }
};

module.exports = {
  createLinkToken,
  exchangePublicToken,
  syncTransactions,
  getLinkStatus,
  unlinkAccount,
};
