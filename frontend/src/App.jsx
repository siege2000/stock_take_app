import React, { useState, useEffect } from 'react';
import Home from './pages/Home';
import Scanner from './pages/Scanner';
import Summary from './pages/Summary';
import { registerDevice, checkDeviceStatus } from './api';

export default function App() {
  const [page, setPage] = useState('home');
  const [stockTakeId, setStockTakeId] = useState(null);
  const [counts, setCounts] = useState({}); // { stockId: { tradeName, soh, countedQty } }
  const [deviceStatus, setDeviceStatus] = useState('checking'); // checking | pending | approved

  // Device auth on mount
  useEffect(() => {
    async function initDevice() {
      let token = localStorage.getItem('deviceToken');
      try {
        if (!token) {
          const deviceName = `Android-${Date.now()}`;
          const reg = await registerDevice(null, deviceName);
          token = reg.token;
          localStorage.setItem('deviceToken', token);
        }
        const status = await checkDeviceStatus();
        setDeviceStatus(status.approved ? 'approved' : 'pending');
      } catch {
        setDeviceStatus('error');
      }
    }
    initDevice();
  }, []);

  // Persist counts to localStorage so a page refresh doesn't lose them
  useEffect(() => {
    if (stockTakeId) {
      localStorage.setItem(`counts_${stockTakeId}`, JSON.stringify(counts));
    }
  }, [counts, stockTakeId]);

  function startStockTake(id) {
    setStockTakeId(id);
    const saved = localStorage.getItem(`counts_${id}`);
    setCounts(saved ? JSON.parse(saved) : {});
    setPage('scanner');
  }

  function handleScan(item) {
    // item: { stockId, tradeName, soh, cost }
    setCounts((prev) => {
      const existing = prev[item.stockId];
      return {
        ...prev,
        [item.stockId]: {
          tradeName: item.tradeName,
          soh: item.soh,
          cost: item.cost,
          countedQty: existing ? existing.countedQty + 1 : 1,
        },
      };
    });
  }

  function handleManualCount(stockId, qty) {
    setCounts((prev) => ({
      ...prev,
      [stockId]: { ...prev[stockId], countedQty: qty },
    }));
  }

  function handleFinalised() {
    localStorage.removeItem(`counts_${stockTakeId}`);
    setCounts({});
    setStockTakeId(null);
    setPage('home');
  }

  if (deviceStatus === 'checking') {
    return <StatusScreen message="Connecting..." />;
  }

  if (deviceStatus === 'pending') {
    return (
      <StatusScreen
        message="This device is awaiting approval."
        sub="Ask your administrator to approve this device, then refresh the page."
        onRetry={async () => {
          setDeviceStatus('checking');
          try {
            const status = await checkDeviceStatus();
            setDeviceStatus(status.approved ? 'approved' : 'pending');
          } catch {
            setDeviceStatus('error');
          }
        }}
      />
    );
  }

  if (deviceStatus === 'error') {
    return <StatusScreen message="Cannot reach server. Check your WiFi connection." />;
  }

  return (
    <>
      {page === 'home' && <Home onStart={startStockTake} />}
      {page === 'scanner' && (
        <Scanner
          stockTakeId={stockTakeId}
          counts={counts}
          onScan={handleScan}
          onManualCount={handleManualCount}
          onReview={() => setPage('summary')}
        />
      )}
      {page === 'summary' && (
        <Summary
          stockTakeId={stockTakeId}
          counts={counts}
          onBack={() => setPage('scanner')}
          onFinalised={handleFinalised}
        />
      )}
    </>
  );
}

function StatusScreen({ message, sub, onRetry }) {
  return (
    <div style={styles.center}>
      <div style={styles.card}>
        <p style={styles.mainMsg}>{message}</p>
        {sub && <p style={styles.subMsg}>{sub}</p>}
        {onRetry && (
          <button style={styles.btn} onClick={onRetry}>
            Check Again
          </button>
        )}
      </div>
    </div>
  );
}

const styles = {
  center: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    minHeight: '100vh', padding: 24, background: '#f3f4f6',
  },
  card: {
    background: '#fff', borderRadius: 12, padding: 32, maxWidth: 360,
    width: '100%', textAlign: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.1)',
  },
  mainMsg: { fontSize: 18, fontWeight: 600, color: '#111827', marginBottom: 12 },
  subMsg: { fontSize: 14, color: '#6b7280', marginBottom: 20 },
  btn: {
    background: '#1d4ed8', color: '#fff', border: 'none',
    borderRadius: 8, padding: '12px 24px', fontSize: 16, cursor: 'pointer',
  },
};
