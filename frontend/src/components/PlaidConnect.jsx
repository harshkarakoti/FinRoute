import { usePlaidLink } from 'react-plaid-link';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { FiLink, FiRefreshCw, FiCheckCircle, FiXCircle } from 'react-icons/fi';
import api from '../api/axios';

export default function PlaidConnect({ status, lastSynced, onSync }) {
  const [linkToken, setLinkToken] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);

  const fetchLinkToken = async () => {
    try {
      const { data } = await api.post('/plaid/link-token');
      setLinkToken(data.link_token);
    } catch {
      alert('Failed to initialize bank connection. Check your Plaid API keys.');
    }
  };

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: async (public_token) => {
      try {
        await api.post('/plaid/exchange-token', { public_token });
        alert('✅ Bank account linked! Click "Sync Now" to import subscriptions.');
        onSync();
      } catch {
        alert('Token exchange failed. Try again.');
      }
    },
  });

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const { data } = await api.post('/plaid/sync');
      setSyncResult(data);
      onSync();
    } catch (err) {
      setSyncResult({ error: err.response?.data?.message || 'Sync failed' });
    } finally {
      setSyncing(false);
    }
  };

  const handleUnlink = async () => {
    if (!confirm('Unlink your bank account? Your manually added subscriptions will remain.')) return;
    try {
      await api.delete('/plaid/unlink');
      onSync();
    } catch {
      alert('Unlink failed. Try again.');
    }
  };

  const isLinked = status === 'LINKED';

  return (
    <div className="glass-card p-5 border border-surface-700">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-slate-100 flex items-center gap-2">
            🏦 Bank Account
            {isLinked && (
              <span className="badge bg-green-500/10 text-green-400 border border-green-500/20">
                <FiCheckCircle size={10} className="inline mr-1" />
                Linked
              </span>
            )}
          </h3>
          {lastSynced && (
            <p className="text-xs text-slate-500 mt-0.5">
              Last synced: {new Date(lastSynced).toLocaleString()}
            </p>
          )}
        </div>
      </div>

      {syncResult && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mb-4 p-3 rounded-xl text-sm border ${
            syncResult.error
              ? 'bg-red-500/10 border-red-500/20 text-red-400'
              : 'bg-green-500/10 border-green-500/20 text-green-400'
          }`}
        >
          {syncResult.error
            ? `❌ ${syncResult.error}`
            : `✅ Detected ${syncResult.detected} patterns → ${syncResult.imported} imported, ${syncResult.skipped} already existed`}
        </motion.div>
      )}

      <div className="flex flex-wrap gap-2">
        {!isLinked ? (
          <button
            onClick={async () => { await fetchLinkToken(); }}
            onClickCapture={() => linkToken && open()}
            className="btn-primary text-sm py-2 flex items-center gap-2"
          >
            <FiLink size={14} />
            Connect Bank (Plaid Sandbox)
          </button>
        ) : (
          <>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="btn-primary text-sm py-2 flex items-center gap-2"
            >
              <FiRefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
              {syncing ? 'Syncing...' : 'Sync Now'}
            </button>
            <button
              onClick={handleUnlink}
              className="btn-ghost text-sm py-2 flex items-center gap-2 text-red-400 border-red-500/30 hover:bg-red-500/10"
            >
              <FiXCircle size={14} />
              Unlink
            </button>
          </>
        )}
      </div>

      {!isLinked && (
        <p className="text-xs text-slate-500 mt-3">
          Connect a mock bank account to auto-detect recurring subscriptions from your transaction history.
        </p>
      )}
    </div>
  );
}
