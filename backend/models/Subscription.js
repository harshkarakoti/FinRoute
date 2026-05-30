const mongoose = require('mongoose');

const splitDetailsSchema = new mongoose.Schema(
  {
    totalRoommates: { type: Number },
    yourShare: { type: Number },
  },
  { _id: false }
);

const alertSettingsSchema = new mongoose.Schema(
  {
    daysBefore: { type: Number, default: 3 },
    isAlertSent: { type: Boolean, default: false },
  },
  { _id: false }
);

const subscriptionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
    },
    name: {
      type: String,
      required: [true, 'Subscription name is required'],
      trim: true,
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
    },
    currency: {
      type: String,
      default: 'INR',
    },
    category: {
      type: String,
      enum: ['Entertainment', 'Utilities', 'SaaS', 'Health', 'Cloud', 'Other'],
      default: 'Other',
    },
    billingCycle: {
      type: String,
      enum: ['monthly', 'yearly', 'weekly', 'quarterly'],
      required: [true, 'Billing cycle is required'],
    },
    nextRenewalDate: {
      type: Date,
      required: [true, 'Next renewal date is required'],
    },
    source: {
      type: String,
      enum: ['MANUAL', 'PLAID'],
      default: 'MANUAL',
    },
    plaidTransactionId: {
      type: String,
    },
    isShared: {
      type: Boolean,
      default: false,
    },
    splitDetails: {
      type: splitDetailsSchema,
      default: () => ({}),
    },
    alertSettings: {
      type: alertSettingsSchema,
      default: () => ({}),
    },
  },
  { timestamps: true }
);

// Compound index for efficient per-user renewal queries
subscriptionSchema.index({ user: 1, nextRenewalDate: 1 });

const Subscription = mongoose.model('Subscription', subscriptionSchema);

module.exports = Subscription;
