const BASE_URL = '/api';

function getToken() {
  return localStorage.getItem('deviceToken');
}

async function request(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'x-device-token': token } : {}),
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${res.status}`);
  }

  return res.json();
}

export async function registerDevice(existingToken, name) {
  const res = await fetch(`${BASE_URL}/devices/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: existingToken, name }),
  });
  return res.json();
}

export async function checkDeviceStatus() {
  return request('/devices/status');
}

export async function lookupStock(plu) {
  return request(`/stock/lookup?plu=${encodeURIComponent(plu)}`);
}

export async function createStockTake(staffInitials) {
  return request('/stocktake', {
    method: 'POST',
    body: JSON.stringify({ staffInitials }),
  });
}

export async function getStockTakes() {
  return request('/stocktake');
}

export async function finaliseStockTake(stockTakeId, items, staffId) {
  return request(`/stocktake/${stockTakeId}/finalise`, {
    method: 'POST',
    body: JSON.stringify({ items, staffId }),
  });
}
