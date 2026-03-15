# Stock Take App

A mobile barcode-scanning stock take app for pharmacy use.
Runs as a local web app (PWA) on Android devices over WiFi.

---

## Architecture

```
Pharmacy PC (Windows)
  └── Node.js backend (Express)
        ├── Connects to LOTSSQL via mssql
        ├── Serves React PWA as static files
        └── Runs as a Windows Service

Android devices (same WiFi network)
  └── Chrome browser → http://[PC-IP]:3000
        └── "Add to Home Screen" for app-like experience
```

---

## First-Time Setup

### 1. Database — Add Stock Take reason

Run this on LOTSSQL, then note the ID returned:

```sql
INSERT INTO [LOTSSQL].[dbo].[ShrinkageReason] (Reason, ShrinkageReasonGUID, ShrinkageReasonDateModified)
VALUES ('Mobile Stock Take', NEWID(), GETDATE())

SELECT ReasonID FROM [LOTSSQL].[dbo].[ShrinkageReason] WHERE Reason = 'Mobile Stock Take'
```

### 2. Configure the backend

Edit `backend/config.json`:

```json
{
  "server": {
    "port": 3000
  },
  "database": {
    "server": "YOUR_SQL_SERVER_NAME_OR_IP",
    "database": "LOTSSQL",
    "user": "YOUR_SQL_USER",
    "password": "YOUR_SQL_PASSWORD",
    "options": {
      "trustServerCertificate": true,
      "enableArithAbort": true
    }
  },
  "stockTake": {
    "reasonId": 99,
    "defaultStaffId": 27
  },
  "adminKey": "CHANGE_THIS_TO_A_STRONG_SECRET"
}
```

- `reasonId` — the ID returned from the SQL above
- `defaultStaffId` — StaffID written to Shrinkage rows (27 for test)
- `adminKey` — a secret string you choose, used to approve devices (keep it private)

### 3. Install Node.js

Download and install Node.js (LTS) from https://nodejs.org

Verify: `node --version`

### 4. Build the app

Run these commands on the pharmacy PC:

```bat
cd stock_take_app\frontend
npm install
npm run build

cd ..\backend
npm install
```

### 5. Test the server

```bat
cd stock_take_app\backend
node server.js
```

You should see: `Stock Take server running on port 3000`

Open `http://localhost:3000` in a browser to verify it loads.

### 6. Install as a Windows Service (auto-starts on reboot)

Run once in an **Administrator** command prompt:

```bat
cd stock_take_app\backend
node install-service.js
```

To uninstall the service later:

```bat
node install-service.js --uninstall
```

---

## Device Authorisation

Every Android device must be approved before it can use the app.
Devices self-register on first load — you then approve them using the commands below.

### Find the PC's IP address

```bat
ipconfig
```

Look for the IPv4 address on your network adapter (e.g. `192.168.1.50`).

### Step 1 — Open the app on the Android device

Navigate to `http://[PC-IP]:3000` in Chrome.
The device will show: **"This device is awaiting approval."**

### Step 2 — List pending devices

Run on the pharmacy PC (replace `YOUR_ADMIN_KEY` with the value from config.json):

**Windows:**
```bat
curl http://localhost:3000/api/devices -H "x-admin-key: YOUR_ADMIN_KEY"
```

**Mac/Linux:**
```bash
curl http://localhost:3000/api/devices \
  -H "x-admin-key: YOUR_ADMIN_KEY"
```

You will see a list like:
```json
[
  {
    "id": "a1b2c3d4-0000-0000-0000-000000000000",
    "token": "...",
    "name": "Android-1234567890",
    "approved": false,
    "registeredAt": "2026-03-15T02:00:00.000Z"
  }
]
```

### Step 3 — Approve a device

Copy the `id` from the list above:

**Windows:**
```bat
curl -X PATCH http://localhost:3000/api/devices/DEVICE-ID-HERE ^
  -H "x-admin-key: YOUR_ADMIN_KEY" ^
  -H "Content-Type: application/json" ^
  -d "{\"approved\": true}"
```

**Mac/Linux:**
```bash
curl -X PATCH http://localhost:3000/api/devices/DEVICE-ID-HERE \
  -H "x-admin-key: YOUR_ADMIN_KEY" \
  -H "Content-Type: application/json" \
  -d '{"approved": true}'
```

### Step 4 — Tap "Check Again" on the Android device

The device will now be granted access.

### Revoke a device

Same as approve, with `false`:

**Windows:**
```bat
curl -X PATCH http://localhost:3000/api/devices/DEVICE-ID-HERE ^
  -H "x-admin-key: YOUR_ADMIN_KEY" ^
  -H "Content-Type: application/json" ^
  -d "{\"approved\": false}"
```

---

## "Add to Home Screen" on Android

1. Open Chrome and navigate to `http://[PC-IP]:3000`
2. Tap the three-dot menu (top right)
3. Tap **"Add to Home screen"**
4. The app will open full-screen like a native app

---

## How It Works

### Scanning flow

1. Enter staff initials and start a new stock take (or tap a recent one to resume)
2. Point the camera at a 2D barcode — item loads automatically
3. Each scan of the same item increments the count by 1
4. Tap the counted number on screen to correct it manually
5. Tap **Review** when done

### Finalise

- Shows all counted items with System SOH / Counted / Variance
- Variances shown in red (loss) or green (gain)
- Two-step confirmation before anything is written to the database
- On confirm, writes to three tables in a single transaction:
  - `StockTake` — one header row per session
  - `StockTakeItems` — one row per counted item
  - `Shrinkage` — one adjustment row per counted item

### What gets written to Shrinkage

| Column | Value |
|---|---|
| StockId | Scanned item |
| DateTime | Time of finalise |
| QuantitySubtracted | SOH − Counted qty (negative = stock gain) |
| StaffID | `defaultStaffId` from config.json |
| ReasonID | "Mobile Stock Take" reason ID from config.json |
| SOHBeforeSubtractInUnits | SOH at time of scan |

---

## Updates

After any code change, rebuild the frontend then restart the service:

```bat
cd stock_take_app\frontend
npm run build

net stop StockTakeApp
net start StockTakeApp
```

---

## Troubleshooting

**"Cannot reach server" on device**
- Confirm the Android device is on the same WiFi as the PC
- Find the PC IP with `ipconfig` and use that address, not `localhost`
- Allow inbound connections on port 3000 through Windows Firewall:
  ```bat
  netsh advfirewall firewall add rule name="StockTakeApp" dir=in action=allow protocol=TCP localport=3000
  ```

**Barcode not found**
- Verify the PLU value in the database matches the number being scanned:
  ```sql
  SELECT StockID, TradeName, PLU FROM [LOTSSQL].[dbo].[Stock] WHERE PLU = 12345
  ```

**Service won't install**
- Must be run from an Administrator command prompt

**Database connection error**
- Check SQL Server allows remote connections
- Check SQL Server Authentication is enabled (not Windows-only auth)
- Verify `server`, `user`, and `password` in config.json
