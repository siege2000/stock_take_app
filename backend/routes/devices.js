const express = require('express');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();
const devicesFile = path.join(__dirname, '../devices.json');

function readDevices() {
  return JSON.parse(fs.readFileSync(devicesFile, 'utf8'));
}

function writeDevices(devices) {
  fs.writeFileSync(devicesFile, JSON.stringify(devices, null, 2));
}

// Device registers itself — returns token for storage in localStorage
// If device already has a token, re-sends it back
router.post('/register', (req, res) => {
  const { token: existingToken, name } = req.body;
  const devices = readDevices();

  if (existingToken) {
    const existing = devices.find((d) => d.token === existingToken);
    if (existing) {
      return res.json({ token: existing.token, approved: existing.approved });
    }
  }

  const newDevice = {
    id: uuidv4(),
    token: uuidv4(),
    name: name || 'Unknown Device',
    approved: false,
    registeredAt: new Date().toISOString(),
  };

  devices.push(newDevice);
  writeDevices(devices);

  res.json({ token: newDevice.token, approved: false });
});

// Check if device is approved (device polls this on startup)
router.get('/status', (req, res) => {
  const token = req.headers['x-device-token'];
  if (!token) return res.status(400).json({ error: 'No token provided' });

  const devices = readDevices();
  const device = devices.find((d) => d.token === token);
  if (!device) return res.status(404).json({ error: 'Device not found' });

  res.json({ approved: device.approved, name: device.name });
});

// Admin: list all devices
router.get('/', (req, res) => {
  const adminKey = req.headers['x-admin-key'];
  const config = require('../config.json');
  if (adminKey !== config.adminKey) return res.status(403).json({ error: 'Forbidden' });

  res.json(readDevices());
});

// Admin: approve or revoke a device
router.patch('/:id', (req, res) => {
  const adminKey = req.headers['x-admin-key'];
  const config = require('../config.json');
  if (adminKey !== config.adminKey) return res.status(403).json({ error: 'Forbidden' });

  const devices = readDevices();
  const device = devices.find((d) => d.id === req.params.id);
  if (!device) return res.status(404).json({ error: 'Device not found' });

  device.approved = req.body.approved;
  writeDevices(devices);
  res.json(device);
});

module.exports = router;
