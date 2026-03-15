import React, { useState } from 'react';
import { finaliseStockTake } from '../api';

export default function Summary({ stockTakeId, counts, onBack, onFinalised }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  const items = Object.entries(counts).map(([stockId, item]) => ({
    stockId: parseInt(stockId, 10),
    tradeName: item.tradeName,
    soh: item.soh,
    countedQty: item.countedQty,
    variance: item.soh - item.countedQty,
  }));

  async function handleFinalise() {
    setLoading(true);
    setError('');
    try {
      await finaliseStockTake(stockTakeId, items);
      onFinalised();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={s.page}>
      <div style={s.header}>
        <button style={s.backBtn} onClick={onBack}>← Back</button>
        <div>
          <div style={s.headerTitle}>Review</div>
          <div style={s.headerSub}>Stock Take #{stockTakeId}</div>
        </div>
        <div style={s.itemCount}>{items.length} items</div>
      </div>

      <div style={s.tableWrap}>
        <div style={s.tableHeader}>
          <span style={{ ...s.col, flex: 3 }}>Item</span>
          <span style={{ ...s.col, ...s.right }}>SOH</span>
          <span style={{ ...s.col, ...s.right }}>Counted</span>
          <span style={{ ...s.col, ...s.right }}>Variance</span>
        </div>

        {items.map((item) => (
          <div key={item.stockId} style={{ ...s.row, background: item.variance !== 0 ? '#fffbeb' : '#fff' }}>
            <span style={{ ...s.col, flex: 3, fontWeight: 500, color: '#111827' }}>{item.tradeName}</span>
            <span style={{ ...s.col, ...s.right, color: '#6b7280' }}>{item.soh}</span>
            <span style={{ ...s.col, ...s.right, color: '#1d4ed8', fontWeight: 700 }}>{item.countedQty}</span>
            <span style={{
              ...s.col, ...s.right, fontWeight: 700,
              color: item.variance > 0 ? '#dc2626' : item.variance < 0 ? '#16a34a' : '#6b7280',
            }}>
              {item.variance > 0 ? `-${item.variance}` : item.variance < 0 ? `+${Math.abs(item.variance)}` : '0'}
            </span>
          </div>
        ))}
      </div>

      <div style={s.footer}>
        {error && <p style={s.error}>{error}</p>}

        {!confirmed ? (
          <button style={s.confirmBtn} onClick={() => setConfirmed(true)} disabled={items.length === 0}>
            Finalise Stock Take
          </button>
        ) : (
          <div style={s.confirmBox}>
            <p style={s.confirmText}>
              This will write {items.length} adjustments to the database. Are you sure?
            </p>
            <div style={s.confirmBtns}>
              <button style={s.cancelBtn} onClick={() => setConfirmed(false)}>Cancel</button>
              <button style={s.submitBtn} onClick={handleFinalise} disabled={loading}>
                {loading ? 'Saving...' : 'Confirm & Save'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const s = {
  page: { minHeight: '100vh', background: '#f3f4f6', display: 'flex', flexDirection: 'column' },
  header: { background: '#1d4ed8', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  backBtn: { background: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.4)', borderRadius: 8, padding: '6px 12px', fontSize: 14, cursor: 'pointer' },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: 700, textAlign: 'center' },
  headerSub: { color: '#93c5fd', fontSize: 13, textAlign: 'center' },
  itemCount: { color: '#bfdbfe', fontSize: 14, fontWeight: 600 },
  tableWrap: { flex: 1, overflowY: 'auto', background: '#fff', margin: '16px 16px 0', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' },
  tableHeader: { display: 'flex', padding: '10px 16px', background: '#f9fafb', borderBottom: '2px solid #e5e7eb', borderRadius: '12px 12px 0 0' },
  col: { fontSize: 13, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, flex: 1 },
  right: { textAlign: 'right' },
  row: { display: 'flex', padding: '12px 16px', borderBottom: '1px solid #f3f4f6', alignItems: 'center' },
  footer: { padding: 16 },
  error: { color: '#dc2626', fontSize: 14, marginBottom: 12, textAlign: 'center' },
  confirmBtn: { width: '100%', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, padding: 16, fontSize: 17, fontWeight: 700, cursor: 'pointer' },
  confirmBox: { background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' },
  confirmText: { fontSize: 15, color: '#374151', marginBottom: 16, textAlign: 'center' },
  confirmBtns: { display: 'flex', gap: 12 },
  cancelBtn: { flex: 1, background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 8, padding: 14, fontSize: 16, fontWeight: 600, cursor: 'pointer' },
  submitBtn: { flex: 2, background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, padding: 14, fontSize: 16, fontWeight: 700, cursor: 'pointer' },
};
