import React, { useState, useEffect } from 'react';
import { createStockTake, getStockTakes } from '../api';

export default function Home({ onStart }) {
  const [initials, setInitials] = useState('z');
  const [recentTakes, setRecentTakes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getStockTakes()
      .then(setRecentTakes)
      .catch(() => {});
  }, []);

  async function handleNew() {
    if (!initials.trim()) {
      setError('Please enter your initials');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { stockTakeId } = await createStockTake(initials.trim().toUpperCase());
      onStart(stockTakeId);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={s.page}>
      <div style={s.header}>
        <h1 style={s.title}>Stock Take</h1>
      </div>

      <div style={s.section}>
        <label style={s.label}>Staff Initials</label>
        <input
          style={s.input}
          value={initials}
          onChange={(e) => setInitials(e.target.value)}
          maxLength={4}
          autoCapitalize="characters"
        />
        {error && <p style={s.error}>{error}</p>}
        <button style={s.primaryBtn} onClick={handleNew} disabled={loading}>
          {loading ? 'Starting...' : 'Start New Stock Take'}
        </button>
      </div>

      {recentTakes.length > 0 && (
        <div style={s.section}>
          <p style={s.sectionTitle}>Recent Stock Takes</p>
          {recentTakes.map((st) => (
            <button
              key={st.StockTakeID}
              style={s.recentBtn}
              onClick={() => onStart(st.StockTakeID)}
            >
              <span style={s.recentId}>#{st.StockTakeID}</span>
              <span style={s.recentDate}>{new Date(st.DateCreated).toLocaleString()}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const s = {
  page: { minHeight: '100vh', background: '#f3f4f6', paddingBottom: 40 },
  header: { background: '#1d4ed8', padding: '24px 20px' },
  title: { color: '#fff', fontSize: 24, fontWeight: 700 },
  section: { background: '#fff', margin: '16px 16px 0', borderRadius: 12, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' },
  label: { display: 'block', fontSize: 14, color: '#374151', fontWeight: 600, marginBottom: 8 },
  input: { width: '100%', border: '1px solid #d1d5db', borderRadius: 8, padding: '12px 14px', fontSize: 20, letterSpacing: 4, textTransform: 'uppercase', marginBottom: 16 },
  error: { color: '#dc2626', fontSize: 14, marginBottom: 12 },
  primaryBtn: { width: '100%', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, padding: '14px', fontSize: 17, fontWeight: 600, cursor: 'pointer' },
  sectionTitle: { fontSize: 13, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  recentBtn: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '12px 14px', marginBottom: 8, cursor: 'pointer', textAlign: 'left' },
  recentId: { fontWeight: 700, color: '#1d4ed8', fontSize: 16 },
  recentDate: { color: '#6b7280', fontSize: 13 },
};
