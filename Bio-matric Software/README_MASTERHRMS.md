# MasterHRMS — Biometric Device Setup & Configuration Guide
## ZKTeco, eSSL, Realtime & BioMax Terminal Integration

---

## 1. Quick Configuration Parameters (MasterHRMS Cloud)

| Parameter | Value to Enter in Device / Software | Notes |
| :--- | :--- | :--- |
| **Production Domain** | `masterhrms.com` | Primary application domain |
| **ADMS Cloud Server URL** | `https://masterhrms.com/iclock` | Native ZKTeco ADMS push route |
| **ADMS Push Endpoint** | `/iclock/cdata` | Live attendance push receiver |
| **ADMS Port** | `443` (HTTPS) or `80` (HTTP) | Standard web port |
| **Public JSON Webhook** | `https://masterhrms.com/api/public/biometric/push` | Secondary JSON webhook route |
| **LAN Communication Port**| `4370` | Default hardware socket port |

---

## 2. Option A: Setup Directly on Physical Biometric Machine (Recommended)

You can configure the machine directly through its keypad/touchscreen:

1. Press **`Menu`** on the Biometric Machine (Authenticate with Admin Finger/PIN).
2. Go to **`Comm.`** (Communication Settings).
3. Select **`Cloud Server Setting`** (or **`ADMS`** / **`Webserver Setting`** depending on firmware).
4. Configure the following fields:
   - **Server Mode:** `ADMS` / `Cloud Server`
   - **Enable Cloud Server / Push:** `ON`
   - **Server Address (Domain / IP):** `masterhrms.com`
   - **Server Port:** `443` (or `80` if machine doesn't support TLS)
   - **Enable HTTPS:** `ON` (if supported)
5. Save and restart the machine.
6. The machine will display a globe / cloud icon with a checkmark indicating active connection to **MasterHRMS**.

---

## 3. Option B: Setup Using `DeviceManager.exe` (Windows Utility)

1. **Register Drivers (One-time):**
   - Right-click `dlls\64bit.bat` (or `32bit.bat`) and select **Run as Administrator**.
   - This registers `zkemkeeper.dll` into Windows System.
2. **Launch Application:**
   - Double-click `DeviceManager.exe`.
3. **Connect to Device:**
   - Enter your Device Local LAN IP (e.g. `192.168.1.201`) and Port `4370`.
   - Click **`Fetch Comm Info`**.
4. **Configure ADMS Push URL:**
   - In the **`ADMS Push URL`** input box, enter:
     `https://masterhrms.com/iclock`
   - Click **`Update Device Info`**.
5. **Restart Device:**
   - Click **`Restart Device`** to apply settings.

---

## 4. Attendance Flow in MasterHRMS

- Whenever an employee punches on the machine:
  1. The machine sends `POST https://masterhrms.com/iclock/cdata?SN=...&table=ATTLOG`.
  2. MasterHRMS matches the Employee ID (`employeeCode`).
  3. First punch of the day automatically records **Check-In** (`status: present`).
  4. Subsequent punches log into `BiometricPunchLog`.
  5. Last punch of the day records **Check-Out** and computes working hours.
  6. Live attendance updates instantly appear on the HR and Employee Dashboards via WebSockets.

