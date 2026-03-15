import React, { useState } from 'react';
import { finaliseStockTake } from '../api';

const fmt = (n) => `$${Math.abs(n).toFixed(2)}`;
const varDisplay = (v) => v > 0 ? `-${v}` : v < 0 ? `+${Math.abs(v)}` : '0';
const varColor = (v) => v > 0 ? '#dc2626' : v < 0 ? '#16a34a' : '#6b7280';

function rowBg(item) {
  if (Math.abs(item.varianceValue) > 25) return '#fef2f2';
  if (item.variance !== 0) return '#fffbeb';
  return '#fff';
}

export default function Summary({ stockTakeId, counts, onBack, onFinalised }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [finalised, setFinalised] = useState(false);

  const items = Object.entries(counts).map(([stockId, item]) => {
    const variance = item.soh - item.countedQty;
    const cost = item.cost || 0;
    return {
      stockId: parseInt(stockId, 10),
      tradeName: item.tradeName,
      soh: item.soh,
      cost,
      countedQty: item.countedQty,
      variance,
      sohValue: item.soh * cost,
      varianceValue: variance * cost,
    };
  });

  async function handleFinalise() {
    setLoading(true);
    setError('');
    try {
      await finaliseStockTake(stockTakeId, items);
      setFinalised(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (finalised) {
    return (
      <>
        <style>{`
          @media print {
            .no-print { display: none !important; }
            .print-only { display: block !important; }
            body { margin: 0; font-family: sans-serif; }
            tr.high-variance { background: #fef2f2 !important; }
            tr.low-variance { background: #fffbeb !important; }
          }
          .print-only { display: none; }
        `}</style>

        {/* Screen view */}
        <div style={s.page} className="no-print">
          <div style={s.header}>
            <div style={s.headerTitle}>Stock Take Complete</div>
            <div style={s.headerSub}>#{stockTakeId} — {items.length} items saved</div>
          </div>

          <div style={s.tableWrap}>
            <div style={s.tableHeader}>
              <span style={{ ...s.col, flex: 3 }}>Item</span>
              <span style={{ ...s.col, ...s.right }}>Counted</span>
              <span style={{ ...s.col, ...s.right }}>Var</span>
              <span style={{ ...s.col, ...s.right }}>SOH $</span>
              <span style={{ ...s.col, ...s.right }}>Var $</span>
            </div>
            {items.map((item) => (
              <div key={item.stockId} style={{ ...s.row, background: rowBg(item) }}>
                <span style={{ ...s.col, flex: 3, fontWeight: 500, color: '#111827', fontSize: 12 }}>{item.tradeName}</span>
                <span style={{ ...s.col, ...s.right, color: '#1d4ed8', fontWeight: 700 }}>{item.countedQty}</span>
                <span style={{ ...s.col, ...s.right, fontWeight: 700, color: varColor(item.variance) }}>
                  {varDisplay(item.variance)}
                </span>
                <span style={{ ...s.col, ...s.right, color: '#6b7280' }}>{fmt(item.sohValue)}</span>
                <span style={{
                  ...s.col, ...s.right, fontWeight: 700,
                  color: Math.abs(item.varianceValue) > 25 ? '#dc2626' : varColor(item.variance),
                }}>
                  {item.variance === 0 ? '-' : fmt(item.varianceValue)}
                </span>
              </div>
            ))}
          </div>

          <div style={s.footer}>
            <button style={s.pdfBtn} onClick={() => window.print()}>Export to PDF</button>
            <button style={s.doneBtn} onClick={onFinalised}>Done</button>
          </div>
        </div>

        {/* Print-only view */}
        <div className="print-only" style={{ padding: 24 }}>
          <h2 style={{ marginBottom: 4 }}>Stock Take #{stockTakeId}</h2>
          <p style={{ color: '#555', marginBottom: 4, fontSize: 13 }}>Printed: {new Date().toLocaleString()}</p>
          <p style={{ color: '#888', marginBottom: 16, fontSize: 12 }}>
            Rows highlighted red have a variance value exceeding $25.
          </p>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#e5e7eb' }}>
                <th style={pt.th}>Item</th>
                <th style={{ ...pt.th, textAlign: 'right' }}>SOH</th>
                <th style={{ ...pt.th, textAlign: 'right' }}>Counted</th>
                <th style={{ ...pt.th, textAlign: 'right' }}>Variance</th>
                <th style={{ ...pt.th, textAlign: 'right' }}>SOH Value</th>
                <th style={{ ...pt.th, textAlign: 'right' }}>Variance Value</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const highVariance = Math.abs(item.varianceValue) > 25;
                const bg = highVariance ? '#fef2f2' : item.variance !== 0 ? '#fffbeb' : 'transparent';
                return (
                  <tr key={item.stockId} style={{ background: bg }}>
                    <td style={pt.td}>{item.tradeName}</td>
                    <td style={{ ...pt.td, textAlign: 'right' }}>{item.soh}</td>
                    <td style={{ ...pt.td, textAlign: 'right' }}>{item.countedQty}</td>
                    <td style={{ ...pt.td, textAlign: 'right', color: varColor(item.variance), fontWeight: 700 }}>
                      {varDisplay(item.variance)}
                    </td>
                    <td style={{ ...pt.td, textAlign: 'right' }}>{fmt(item.sohValue)}</td>
                    <td style={{
                      ...pt.td, textAlign: 'right', fontWeight: highVariance ? 700 : 400,
                      color: highVariance ? '#dc2626' : 'inherit',
                    }}>
                      {item.variance === 0 ? '-' : fmt(item.varianceValue)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p style={{ marginTop: 16, fontSize: 12, color: '#888' }}>Total items: {items.length}</p>
        </div>
      </>
    );
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
          <span style={{ ...s.col, ...s.right }}>Counted</span>
          <span style={{ ...s.col, ...s.right }}>Var</span>
          <span style={{ ...s.col, ...s.right }}>SOH $</span>
          <span style={{ ...s.col, ...s.right }}>Var $</span>
        </div>
        {items.map((item) => (
          <div key={item.stockId} style={{ ...s.row, background: rowBg(item) }}>
            <span style={{ ...s.col, flex: 3, fontWeight: 500, color: '#111827', fontSize: 12 }}>{item.tradeName}</span>
            <span style={{ ...s.col, ...s.right, color: '#1d4ed8', fontWeight: 700 }}>{item.countedQty}</span>
            <span style={{ ...s.col, ...s.right, fontWeight: 700, color: varColor(item.variance) }}>
              {varDisplay(item.variance)}
            </span>
            <span style={{ ...s.col, ...s.right, color: '#6b7280' }}>{fmt(item.sohValue)}</span>
            <span style={{
              ...s.col, ...s.right, fontWeight: 700,
              color: Math.abs(item.varianceValue) > 25 ? '#dc2626' : varColor(item.variance),
            }}>
              {item.variance === 0 ? '-' : fmt(item.varianceValue)}
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
  col: { fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, flex: 1 },
  right: { textAlign: 'right' },
  row: { display: 'flex', padding: '10px 16px', borderBottom: '1px solid #f3f4f6', alignItems: 'center' },
  footer: { padding: 16, display: 'flex', flexDirection: 'column', gap: 10 },
  error: { color: '#dc2626', fontSize: 14, marginBottom: 12, textAlign: 'center' },
  confirmBtn: { width: '100%', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, padding: 16, fontSize: 17, fontWeight: 700, cursor: 'pointer' },
  confirmBox: { background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' },
  confirmText: { fontSize: 15, color: '#374151', marginBottom: 16, textAlign: 'center' },
  confirmBtns: { display: 'flex', gap: 12 },
  cancelBtn: { flex: 1, background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 8, padding: 14, fontSize: 16, fontWeight: 600, cursor: 'pointer' },
  submitBtn: { flex: 2, background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, padding: 14, fontSize: 16, fontWeight: 700, cursor: 'pointer' },
  pdfBtn: { width: '100%', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, padding: 16, fontSize: 17, fontWeight: 700, cursor: 'pointer' },
  doneBtn: { width: '100%', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 8, padding: 14, fontSize: 16, fontWeight: 600, cursor: 'pointer' },
};

const pt = {
  th: { padding: '8px 10px', borderBottom: '2px solid #ccc', textAlign: 'left', fontWeight: 700 },
  td: { padding: '6px 10px', borderBottom: '1px solid #eee' },
};
