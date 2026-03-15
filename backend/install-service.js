/**
 * Installs or uninstalls the Stock Take backend as a Windows Service.
 *
 * Usage:
 *   node install-service.js            -- install
 *   node install-service.js --uninstall -- uninstall
 */

const Service = require('node-windows').Service;
const path = require('path');

const svc = new Service({
  name: 'StockTakeApp',
  description: 'Stock Take mobile scanning backend',
  script: path.join(__dirname, 'server.js'),
  nodeOptions: [],
  workingDirectory: __dirname,
});

const uninstall = process.argv.includes('--uninstall');

svc.on('install', () => {
  console.log('Service installed. Starting...');
  svc.start();
});

svc.on('start', () => {
  console.log('Service started. Stock Take app is running.');
});

svc.on('uninstall', () => {
  console.log('Service uninstalled.');
});

svc.on('error', (err) => {
  console.error('Service error:', err);
});

if (uninstall) {
  svc.uninstall();
} else {
  svc.install();
}
