# Stock Take App

A mobile stock-taking application for Android that communicates with an on-site SQL database over a local area network (LAN). The app is designed for warehouse, retail, or any environment where staff need to perform stock counts using a mobile device without requiring internet access.

---

## Architecture Overview

```
Android App  <-->  REST API Backend  <-->  SQL Database
   (LAN)              (on-site server)        (on-site)
```

- **Android App** — Mobile front end used by staff to scan/enter stock counts
- **Backend API** — Lightweight REST API running on a local server (Windows PC, NAS, or Raspberry Pi); never exposed to the internet
- **SQL Database** — On-site database (SQL Server, MySQL, or PostgreSQL) containing product and stock data

All communication stays within the local LAN. No internet connection is required during stock takes.

---

## Requirements

### Android Device
- Android 8.0 (API 26) or higher
- Connected to the site's Wi-Fi network

### Backend Server (on-site)
- Any machine on the LAN that can run Node.js (Windows, Linux, macOS, Raspberry Pi)
- Node.js 18 or higher
- Access to the SQL database (same machine or reachable over LAN)
- Firewall allows inbound TCP on the configured port (default: `3000`) from LAN only

### Database
- SQL Server, MySQL/MariaDB, or PostgreSQL (configurable)
- Existing product/stock schema, or use the provided schema setup script

---

## Backend Setup

### 1. Install Node.js

Download and install from [nodejs.org](https://nodejs.org) (LTS version recommended).

### 2. Clone / Copy the Backend

Copy the `backend/` folder to the server machine, then install dependencies:

```bash
cd backend
npm install
```

### 3. Configure the Backend

Copy the example environment file and edit it:

```bash
cp .env.example .env
```

Edit `.env` with the correct values for the site:

```env
# Server
PORT=3000

# Database type: mssql | mysql | postgres
DB_TYPE=mssql

# Database connection
DB_HOST=localhost
DB_PORT=1433
DB_NAME=StockDB
DB_USER=stock_user
DB_PASSWORD=your_password_here
```

### 4. (Optional) Set Up the Database Schema

If starting from scratch, run the provided setup script:

```bash
npm run db:setup
```

### 5. Start the Backend

```bash
npm start
```

For automatic restart on failure, use PM2:

```bash
npm install -g pm2
pm2 start server.js --name stock-api
pm2 save
pm2 startup   # follow the printed command to auto-start on boot
```

The API will be available at `http://<server-ip>:3000`. It binds to the local network interface only and is not accessible from outside the LAN.

---

## Android App Setup

### Installing the APK

1. Download the latest `stock-take-app.apk` from the Releases section of this repository.
2. On the Android device, go to **Settings > Apps > Special app access > Install unknown apps** and allow your file manager.
3. Open the APK file and install it.

### Configuring the App

On first launch, enter the backend server address:

```
http://192.168.1.50:3000
```

Replace `192.168.1.50` with the actual LAN IP address of the server running the backend. This setting is saved and only needs to be entered once per device.

---

## Features

- Barcode / QR code scanning for fast product lookup
- Manual product code entry
- View current stock levels for each product
- Enter and submit stock counts
- Stock count sessions (start a count, add lines, finalise)
- Offline queue — counts taken during brief Wi-Fi drops are submitted automatically when reconnected
- Simple admin screen to view and export completed count sessions

---

## Security

- The backend binds only to the local network interface; it will not accept connections from outside the LAN.
- No data is sent to the internet at any point.
- It is recommended to run the backend on a dedicated VLAN or behind the site's existing firewall.
- Basic API key authentication is used between the app and the backend. The key is configured in `.env` and entered once in the app settings.

---

## Project Structure

```
stock_take_app/
├── android/          # Android app source (React Native / Kotlin)
├── backend/          # Node.js REST API
│   ├── server.js
│   ├── .env.example
│   └── package.json
├── db/
│   └── schema.sql    # Database setup script
└── readme.md
```

---

## Troubleshooting

| Problem | Check |
|---|---|
| App cannot connect to server | Confirm both devices are on the same Wi-Fi network. Check the IP address in app settings. |
| Backend fails to start | Check `.env` database credentials. Confirm the database server is running and reachable. |
| Firewall blocking connection | Allow inbound TCP on port `3000` from LAN addresses only in the server's firewall settings. |
| Barcode not recognised | Ensure the product code in the database matches the barcode format exactly. |

---

## Contributing

Pull requests are welcome. For significant changes, please open an issue first to discuss what you would like to change.

---

## License

MIT
