const express = require('express');
const path = require('path');
const config = require('./config.json');

const stockRoutes = require('./routes/stock');
const stockTakeRoutes = require('./routes/stocktake');
const deviceRoutes = require('./routes/devices');

const app = express();

app.use(express.json());

// Serve React frontend build
app.use(express.static(path.join(__dirname, '../frontend/build')));

// Device auth middleware — applied to all /api routes except device registration
app.use('/api', (req, res, next) => {
  if (req.path.startsWith('/devices')) return next();
  const token = req.headers['x-device-token'];
  if (!token) return res.status(401).json({ error: 'No device token' });

  const devices = require('./devices.json');
  const device = devices.find((d) => d.token === token && d.approved);
  if (!device) return res.status(403).json({ error: 'Device not authorised' });

  req.deviceId = device.id;
  next();
});

app.use('/api/stock', stockRoutes);
app.use('/api/stocktake', stockTakeRoutes);
app.use('/api/devices', deviceRoutes);

// Fallback to React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/build/index.html'));
});

const PORT = config.server.port || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Stock Take server running on port ${PORT}`);
});
