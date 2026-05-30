import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiPlus, FiRefreshCw, FiTrendingUp, FiCreditCard, FiAlertCircle } from 'react-icons/fi';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, getCategoryIcon } from '../utils/helpers';
import SubscriptionCard from '../components/SubscriptionCard';
import AddSubscriptionModal from '../components/AddSubscriptionModal';
import PlaidConnect from '../components/PlaidConnect';
import Navbar from '../components/Navbar';

const CATEGORIES = ['Entertainment', 'Utilities', 'SaaS', 'Health', 'Cloud', 'Other'];

export default function Dashboard() {
  const { user } = useAuth();
  const [subscriptions, setSubscriptions] = useState([]);
  const [plaidStatus, setPlaidStatus] = useState({ status: 'NOT_LINKED', lastSynced: null });
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [activeCategory, setActiveCategory] = useState('All');

  const fetchData = async () => {
    try {
      const [subRes, plaidRes] = await Promise.all([
        api.get('/subscriptions'),
        api.get('/plaid/status'),
      ]);
      setSubscriptions(subRes.data);
      setPlaidStatus(plaidRes.data);
    } catch (err) {
      console.error('Fetch error', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleDelete = async (id) => {
    if (!confirm('Remove this subscription?')) return;
    await api.delete(`/subscriptions/${id}`);
    setSubscriptions((s) => s.filter((sub) => sub._id !== id));
  };

  const handleEdit = (sub) => {
    setEditData(sub);
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setEditData(null);
  };

  // Stats
  const stats = useMemo(() => {
    const monthly = subscriptions.reduce((acc, s) => {
      const m = s.isShared && s.splitDetails?.yourShare ? s.splitDetails.yourShare : s.amount;
      if (s.billingCycle === 'monthly') return acc + m;
      if (s.billingCycle === 'yearly') return acc + m / 12;
      if (s.billingCycle === 'weekly') return acc + m * 4.33;
      if (s.billingCycle === 'quarterly') return acc + m / 3;
      return acc;
    }, 0);

    const urgent = subscriptions.filter((s) => {
      const days = Math.ceil((new Date(s.nextRenewalDate) - new Date()) / (1000 * 60 * 60 * 24));
      return days <= 3 && days >= 0;
    }).length;

    return { total: subscriptions.length, monthly, urgent };
  }, [subscriptions]);

  // Filter + group by category
  const filtered = activeCategory === 'All'
    ? subscriptions
    : subscriptions.filter((s) => s.category === activeCategory);

  const grouped = useMemo(() => {
    if (activeCategory !== 'All') return null;
    return CATEGORIES.reduce((acc, cat) => {
      const items = subscriptions.filter((s) => s.category === cat);
      if (items.length > 0) acc[cat] = items;
      return acc;
    }, {});
  }, [subscriptions, activeCategory]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading your subscriptions...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">

        {/* Welcome + CTA */}
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-100">
              Hey {user?.name?.split(' ')[0]} 👋
            </h1>
            <p className="text-slate-500 text-sm mt-1">Here's your subscription overview</p>
          </div>
          <button onClick={() => { setEditData(null); setModalOpen(true); }}
            className="btn-primary flex items-center gap-2 self-start sm:self-auto">
            <FiPlus size={16} />
            Add Subscription
          </button>
        </motion.div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {[
            { icon: <FiCreditCard />, label: 'Total Subscriptions', value: stats.total, sub: 'active plans' },
            { icon: <FiTrendingUp />, label: 'Monthly Burn', value: formatCurrency(stats.monthly, user?.currency || 'INR'), sub: 'your share, normalized' },
            { icon: <FiAlertCircle />, label: 'Renewing Soon', value: stats.urgent, sub: 'within 3 days', urgent: stats.urgent > 0 },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className={`glass-card p-5 border ${s.urgent ? 'border-orange-500/30' : 'border-surface-700'}`}>
              <div className={`text-lg mb-2 ${s.urgent ? 'text-orange-400' : 'text-brand-400'}`}>{s.icon}</div>
              <p className="text-xs text-slate-500 mb-1">{s.label}</p>
              <p className={`text-2xl font-bold ${s.urgent ? 'text-orange-400' : 'text-slate-100'}`}>{s.value}</p>
              <p className="text-xs text-slate-600 mt-1">{s.sub}</p>
            </motion.div>
          ))}
        </div>

        {/* Plaid Connect Panel */}
        <div className="mb-8">
          <PlaidConnect
            status={plaidStatus.status}
            lastSynced={plaidStatus.lastSynced}
            onSync={fetchData}
          />
        </div>

        {/* Category Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
          {['All', ...CATEGORIES].map((cat) => (
            <button key={cat} onClick={() => setActiveCategory(cat)}
              className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200
                ${activeCategory === cat
                  ? 'bg-gradient-brand text-white shadow-lg shadow-brand-500/25'
                  : 'bg-surface-800 text-slate-400 border border-surface-700 hover:border-brand-500/50'
                }`}>
              {cat === 'All' ? '🗂 All' : `${getCategoryIcon(cat)} ${cat}`}
            </button>
          ))}
        </div>

        {/* Subscriptions */}
        {subscriptions.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="glass-card p-12 text-center border border-surface-700">
            <div className="text-5xl mb-4">💳</div>
            <h3 className="text-lg font-semibold text-slate-300 mb-2">No subscriptions yet</h3>
            <p className="text-slate-500 text-sm mb-6">Add one manually or connect your bank to auto-detect them.</p>
            <button onClick={() => setModalOpen(true)} className="btn-primary inline-flex items-center gap-2">
              <FiPlus size={15} /> Add your first subscription
            </button>
          </motion.div>
        ) : activeCategory !== 'All' ? (
          // Flat filtered list
          <div className="grid gap-3">
            <AnimatePresence>
              {filtered.map((sub, i) => (
                <SubscriptionCard key={sub._id} sub={sub} index={i}
                  onEdit={handleEdit} onDelete={handleDelete} />
              ))}
            </AnimatePresence>
            {filtered.length === 0 && (
              <p className="text-center text-slate-500 py-8">No {activeCategory} subscriptions found.</p>
            )}
          </div>
        ) : (
          // Grouped by category
          <div className="space-y-8">
            {Object.entries(grouped).map(([cat, items]) => (
              <motion.div key={cat} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">{getCategoryIcon(cat)}</span>
                  <h2 className="font-semibold text-slate-300">{cat}</h2>
                  <span className="badge bg-surface-700 text-slate-500 border-0">{items.length}</span>
                </div>
                <div className="grid gap-3">
                  {items.map((sub, i) => (
                    <SubscriptionCard key={sub._id} sub={sub} index={i}
                      onEdit={handleEdit} onDelete={handleDelete} />
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>

      <AddSubscriptionModal
        isOpen={modalOpen}
        onClose={handleModalClose}
        onSaved={fetchData}
        editData={editData}
      />
    </>
  );
}
