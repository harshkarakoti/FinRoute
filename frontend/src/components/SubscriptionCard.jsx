import { motion } from 'framer-motion';
import { useCountdown, formatCurrency, getCategoryIcon, getCycleLabel } from '../utils/helpers';
import { FiEdit2, FiTrash2, FiUsers } from 'react-icons/fi';

const urgencyClass = {
  critical: 'urgency-critical',
  warning: 'urgency-warning',
  ok: 'urgency-ok',
};

const urgencyBorder = {
  critical: 'border-red-500/40',
  warning: 'border-orange-500/40',
  ok: 'border-surface-700',
};

export default function SubscriptionCard({ sub, onEdit, onDelete, index }) {
  const countdown = useCountdown(sub.nextRenewalDate);
  const icon = getCategoryIcon(sub.category);
  const cycleLabel = getCycleLabel(sub.billingCycle);
  const isShared = sub.isShared && sub.splitDetails?.yourShare < sub.amount;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className={`glass-card p-5 border ${urgencyBorder[countdown.urgency]} hover:border-brand-500/50 transition-all duration-300 group`}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Left — icon + name */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-xl bg-surface-700 flex items-center justify-center text-xl flex-shrink-0">
            {icon}
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-slate-100 truncate">{sub.name}</h3>
            <p className="text-xs text-slate-500 capitalize">{sub.billingCycle} · {sub.category}</p>
          </div>
        </div>

        {/* Right — amount */}
        <div className="text-right flex-shrink-0">
          <p className="font-bold text-slate-100 text-lg leading-tight">
            {formatCurrency(sub.amount, sub.currency)}
            <span className="text-xs text-slate-500 font-normal">{cycleLabel}</span>
          </p>
          {isShared && (
            <p className="text-xs text-brand-400 flex items-center justify-end gap-1 mt-0.5">
              <FiUsers size={10} />
              Your share: {formatCurrency(sub.splitDetails.yourShare, sub.currency)}
            </p>
          )}
        </div>
      </div>

      {/* Countdown + badges */}
      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`badge ${urgencyClass[countdown.urgency]}`}>
            {countdown.urgency === 'critical' ? '🚨' : countdown.urgency === 'warning' ? '⚠️' : '⏱'}{' '}
            {countdown.label}
          </span>
          {sub.source === 'PLAID' && (
            <span className="badge bg-blue-500/10 text-blue-400 border border-blue-500/20">
              🏦 Auto-detected
            </span>
          )}
          {isShared && (
            <span className="badge bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <FiUsers size={10} className="inline mr-1" />
              Shared
            </span>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <button
            onClick={() => onEdit(sub)}
            className="p-2 rounded-lg hover:bg-surface-700 text-slate-400 hover:text-brand-400 transition-colors"
            title="Edit"
          >
            <FiEdit2 size={14} />
          </button>
          <button
            onClick={() => onDelete(sub._id)}
            className="p-2 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-colors"
            title="Delete"
          >
            <FiTrash2 size={14} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
