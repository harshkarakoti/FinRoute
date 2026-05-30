import { useEffect, useState } from 'react';

/**
 * Returns a live countdown string for a given target date.
 * Updates every second.
 */
export const useCountdown = (targetDate) => {
  const compute = () => {
    const now = new Date();
    const target = new Date(targetDate);
    const diff = target - now;

    if (diff <= 0) return { label: 'Due now', urgency: 'critical', totalMs: 0 };

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    let label = '';
    if (days > 0) label = `${days}d ${hours}h ${minutes}m`;
    else if (hours > 0) label = `${hours}h ${minutes}m ${seconds}s`;
    else label = `${minutes}m ${seconds}s`;

    let urgency = 'ok';
    if (days === 0) urgency = 'critical';
    else if (days <= 3) urgency = 'warning';

    return { label, urgency, days, hours, minutes, seconds, totalMs: diff };
  };

  const [state, setState] = useState(compute);

  useEffect(() => {
    const timer = setInterval(() => setState(compute()), 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  return state;
};

/**
 * Format a currency amount with proper locale formatting.
 */
export const formatCurrency = (amount, currency = 'INR') => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
};

/**
 * Get category icon emoji.
 */
export const getCategoryIcon = (category) => {
  const map = {
    Entertainment: '🎬',
    Utilities: '⚡',
    SaaS: '🛠️',
    Health: '💊',
    Cloud: '☁️',
    Other: '📦',
  };
  return map[category] || '📦';
};

/**
 * Get billing cycle label.
 */
export const getCycleLabel = (cycle) => {
  const map = {
    monthly: '/mo',
    yearly: '/yr',
    weekly: '/wk',
    quarterly: '/qtr',
  };
  return map[cycle] || '';
};
