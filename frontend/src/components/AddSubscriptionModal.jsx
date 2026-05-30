import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiSave } from 'react-icons/fi';
import api from '../api/axios';

const CATEGORIES = ['Entertainment', 'Utilities', 'SaaS', 'Health', 'Cloud', 'Other'];
const CYCLES = ['monthly', 'yearly', 'weekly', 'quarterly'];

const defaultForm = {
  name: '', amount: '', currency: 'INR', category: 'Other',
  billingCycle: 'monthly', nextRenewalDate: '',
  isShared: false, totalRoommates: '',
};

export default function AddSubscriptionModal({ isOpen, onClose, onSaved, editData }) {
  const [form, setForm] = useState(defaultForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (editData) {
      setForm({
        name: editData.name || '',
        amount: editData.amount || '',
        currency: editData.currency || 'INR',
        category: editData.category || 'Other',
        billingCycle: editData.billingCycle || 'monthly',
        nextRenewalDate: editData.nextRenewalDate
          ? new Date(editData.nextRenewalDate).toISOString().split('T')[0]
          : '',
        isShared: editData.isShared || false,
        totalRoommates: editData.splitDetails?.totalRoommates || '',
      });
    } else {
      setForm(defaultForm);
    }
    setError('');
  }, [editData, isOpen]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const payload = {
        ...form,
        amount: parseFloat(form.amount),
        totalRoommates: form.isShared ? parseInt(form.totalRoommates) : undefined,
      };
      if (editData) {
        await api.put(`/subscriptions/${editData._id}`, payload);
      } else {
        await api.post('/subscriptions', payload);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="glass-card w-full max-w-md p-6 border border-surface-700"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-100">
                {editData ? 'Edit Subscription' : 'Add Subscription'}
              </h2>
              <button onClick={onClose} className="p-2 hover:bg-surface-700 rounded-lg text-slate-400 hover:text-slate-100 transition-colors">
                <FiX size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Service Name</label>
                <input name="name" value={form.name} onChange={handleChange} required
                  placeholder="e.g. Netflix, AWS, Spotify" className="input-field" />
              </div>

              {/* Amount + Currency */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Amount</label>
                  <input name="amount" type="number" min="0" step="0.01" value={form.amount} onChange={handleChange} required
                    placeholder="0.00" className="input-field" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Currency</label>
                  <select name="currency" value={form.currency} onChange={handleChange} className="input-field">
                    <option value="INR">INR</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                  </select>
                </div>
              </div>

              {/* Category + Billing Cycle */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Category</label>
                  <select name="category" value={form.category} onChange={handleChange} className="input-field">
                    {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Billing Cycle</label>
                  <select name="billingCycle" value={form.billingCycle} onChange={handleChange} className="input-field">
                    {CYCLES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              {/* Next Renewal Date */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Next Renewal Date</label>
                <input name="nextRenewalDate" type="date" value={form.nextRenewalDate} onChange={handleChange} required
                  className="input-field" />
              </div>

              {/* Shared toggle */}
              <div className="flex items-center gap-3 p-3 bg-surface-900 rounded-xl border border-surface-700">
                <input id="isShared" name="isShared" type="checkbox" checked={form.isShared} onChange={handleChange}
                  className="w-4 h-4 accent-brand-500 cursor-pointer" />
                <label htmlFor="isShared" className="text-sm text-slate-300 cursor-pointer flex-1">
                  🤝 Shared with roommates?
                </label>
              </div>

              {/* Roommates input */}
              <AnimatePresence>
                {form.isShared && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">
                      Total People Sharing (including you)
                    </label>
                    <input name="totalRoommates" type="number" min="2" value={form.totalRoommates} onChange={handleChange}
                      placeholder="e.g. 3" className="input-field" required={form.isShared} />
                    {form.amount && form.totalRoommates > 1 && (
                      <p className="text-xs text-brand-400 mt-1.5">
                        💸 Your share: {(parseFloat(form.amount) / parseInt(form.totalRoommates)).toFixed(2)} {form.currency}
                      </p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {error && (
                <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancel</button>
                <button type="submit" disabled={loading} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  {loading ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <FiSave size={15} />
                  )}
                  {loading ? 'Saving...' : editData ? 'Update' : 'Add Subscription'}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
