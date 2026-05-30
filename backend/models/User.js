const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const plaidSchema = new mongoose.Schema(
  {
    accessToken: { type: String },
    itemId: { type: String },
    status: { type: String, default: 'NOT_LINKED' },
    lastSynced: { type: Date },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
    },
    currency: {
      type: String,
      default: 'INR',
    },
    plaid: {
      type: plaidSchema,
      default: () => ({}),
    },
  },
  { timestamps: true }
);

// Pre-save hook — hash password only when modified (Mongoose 9+ async style)
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Instance method — compare entered password against stored hash
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);

module.exports = User;
