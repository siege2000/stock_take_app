import React, { useState, useEffect, useRef } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { lookupStock } from '../api';

export default function Scanner({ stockTakeId, counts, onScan, onManualCount, onReview }) {
  const videoRef = useRef(null);
  const readerRef = useRef(null);
  const [lastScanned, setLastScanned] = useState(null); // { stockId, tradeName, soh, countedQty }
  const [scanError, setScanError] = useState('');
  const [editingQty, setEditingQty] = useState(null); // stockId being edited
  const [editValue, setEditValue] = useState('');
  const [cameraError, setCameraError] = useState('');
  const lastPluRef = useRef('');
  const cooldownRef = useRef(false);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  async function startCamera() {
    try {
      const reader = new BrowserMultiFormatReader();
      readerRef.current = reader;
      await reader.decodeFromVideoDevice(undefined, videoRef.current, async (result, err) => {
        if (!result) return;
        const plu = result.getText();

        // Debounce: ignore same PLU within 2 seconds
        if (plu === lastPluRef.current || cooldownRef.current) return;
        lastPluRef.current = plu;
        cooldownRef.current = true;
        setTimeout(() => { cooldownRef.current = false; }, 2000);

        await processBarcode(plu);
      });
    } catch (err) {
      setCameraError('Camera not available. Please allow camera access.');
    }
  }

  function stopCamera() {
    if (readerRef.current) {
      BrowserMultiFormatReader.releaseAllStreams();
    }
  }

  async function processBarcode(plu) {
    setScanError('');
    try {
      const item = await lookupStock(plu);
      onScan({ stockId: item.StockID, tradeName: item.TradeName, soh: item.SOH });
      setLastScanned({
        stockId: item.StockID,
        tradeName: item.TradeName,
        soh: item.SOH,
      });
    } catch (err) {
      setScanError(`Not found: ${plu}`);
      setLastScanned(null);
    }
  }

  const totalItems = Object.keys(counts).length;
  const lastCount = lastScanned ? counts[lastScanned.stockId] : null;

  function startEdit(stockId) {
    setEditingQty(stockId);
    setEditValue(String(counts[stockId]?.countedQty ?? 0));
    stopCamera();
  }

  function saveEdit(stockId) {
    const qty = parseFloat(editValue);
    if (!isNaN(qty) && qty >= 0) {
      onManualCount(stockId, qty);
      if (lastScanned?.stockId === stockId) {
        setLastScanned((prev) => ({ ...prev }));
      }
    }
    setEditingQty(null);
    startCamera();
  }

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={s.header}>
        <div>
          <div style={s.headerTitle}>Scanning</div>
          <div style={s.headerSub}>Stock Take #{stockTakeId}</div>
        </div>
        <button style={s.reviewBtn} onClick={onReview}>
          Review ({totalItems})
        </button>
      </div>

      {/* Camera */}
      <div style={s.cameraWrap}>
        {cameraError ? (
          <div style={s.cameraError}>{cameraError}</div>
        ) : (
          <video ref={videoRef} style={s.video} autoPlay playsInline muted />
        )}
        <div style={s.scanLine} />
      </div>

      {/* Last scanned item */}
      {lastScanned && lastCount && (
        <div style={s.resultCard}>
          <div style={s.tradeName}>{lastScanned.tradeName}</div>
          <div style={s.statsRow}>
            <div style={s.stat}>
              <div style={s.statLabel}>System SOH</div>
              <div style={s.statValue}>{lastScanned.soh}</div>
            </div>
            <div style={s.statDivider} />
            <div style={s.stat}>
              <div style={s.statLabel}>Counted</div>
              {editingQty === lastScanned.stockId ? (
                <div style={s.editRow}>
                  <input
                    style={s.editInput}
                    type="number"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    autoFocus
                  />
                  <button style={s.saveBtn} onClick={() => saveEdit(lastScanned.stockId)}>✓</button>
                </div>
              ) : (
                <div style={s.statValueLarge} onClick={() => startEdit(lastScanned.stockId)}>
                  {lastCount.countedQty}
                  <span style={s.editHint}> ✎</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {scanError && (
        <div style={s.errorBanner}>{scanError}</div>
      )}

      {/* Recent counts list */}
      {totalItems > 0 && (
        <div style={s.recentList}>
          <div style={s.recentHeader}>Counted Items ({totalItems})</div>
          {Object.entries(counts)
            .sort((a, b) => b[1].countedQty - a[1].countedQty)
            .slice(0, 10)
            .map(([stockId, item]) => (
              <div key={stockId} style={s.recentRow}>
                <span style={s.recentName}>{item.tradeName}</span>
                {editingQty === stockId ? (
                  <div style={s.editRow}>
                    <input
                      style={s.editInputSm}
                      type="number"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      autoFocus
                    />
                    <button style={s.saveBtnSm} onClick={() => saveEdit(stockId)}>✓</button>
                  </div>
                ) : (
                  <span style={s.recentQty} onClick={() => startEdit(stockId)}>
                    {item.countedQty} ✎
                  </span>
                )}
              </div>
            ))}
          {totalItems > 10 && (
            <div style={s.moreItems}>+{totalItems - 10} more — tap Review to see all</div>
          )}
        </div>
      )}
    </div>
  );
}

const s = {
  page: { minHeight: '100vh', background: '#f3f4f6', display: 'flex', flexDirection: 'column' },
  header: { background: '#1d4ed8', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: 700 },
  headerSub: { color: '#93c5fd', fontSize: 13 },
  reviewBtn: { background: '#fff', color: '#1d4ed8', border: 'none', borderRadius: 20, padding: '8px 16px', fontWeight: 700, fontSize: 14, cursor: 'pointer' },
  cameraWrap: { position: 'relative', width: '100%', aspectRatio: '4/3', background: '#000', maxHeight: 280, overflow: 'hidden' },
  video: { width: '100%', height: '100%', objectFit: 'cover' },
  scanLine: { position: 'absolute', left: '10%', right: '10%', top: '50%', height: 2, background: '#ef4444', boxShadow: '0 0 8px #ef4444' },
  cameraError: { color: '#fff', padding: 24, textAlign: 'center', fontSize: 15 },
  resultCard: { background: '#fff', margin: '12px 16px 0', borderRadius: 12, padding: '16px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' },
  tradeName: { fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 16 },
  statsRow: { display: 'flex', alignItems: 'center' },
  stat: { flex: 1, textAlign: 'center' },
  statLabel: { fontSize: 12, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 },
  statValue: { fontSize: 28, fontWeight: 700, color: '#374151' },
  statValueLarge: { fontSize: 40, fontWeight: 800, color: '#1d4ed8', cursor: 'pointer' },
  statDivider: { width: 1, height: 60, background: '#e5e7eb', margin: '0 16px' },
  editHint: { fontSize: 18, color: '#9ca3af' },
  editRow: { display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' },
  editInput: { width: 80, border: '2px solid #1d4ed8', borderRadius: 8, padding: '6px 10px', fontSize: 24, fontWeight: 700, textAlign: 'center' },
  saveBtn: { background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 20, cursor: 'pointer' },
  errorBanner: { background: '#fef2f2', color: '#dc2626', margin: '12px 16px 0', borderRadius: 8, padding: '10px 14px', fontSize: 14, fontWeight: 600 },
  recentList: { margin: '12px 16px 0', background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' },
  recentHeader: { padding: '10px 16px', background: '#f9fafb', fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1, borderBottom: '1px solid #e5e7eb' },
  recentRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', borderBottom: '1px solid #f3f4f6' },
  recentName: { fontSize: 14, color: '#374151', flex: 1, marginRight: 12 },
  recentQty: { fontSize: 16, fontWeight: 700, color: '#1d4ed8', cursor: 'pointer', whiteSpace: 'nowrap' },
  editInputSm: { width: 60, border: '1px solid #1d4ed8', borderRadius: 6, padding: '4px 8px', fontSize: 16, textAlign: 'center' },
  saveBtnSm: { background: '#16a34a', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 8px', fontSize: 14, cursor: 'pointer' },
  moreItems: { padding: '10px 16px', fontSize: 13, color: '#9ca3af', textAlign: 'center' },
};
