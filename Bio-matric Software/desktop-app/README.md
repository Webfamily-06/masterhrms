# MasterHRMS Biometric Device Manager (Desktop Hub v2.5)

Modern cross-platform desktop application designed in **Apple macOS Sequoia Glassmorphism** for managing, diagnosing, and streaming real-time biometric attendance punches from **ZKTeco** and **eSSL** terminals to **MasterHRMS**.

---

## 🌟 Key Highlights & Why Option A (Electron Hub)

1. **Replaces Legacy 2017 `DeviceManager.exe`:**
   - The old `.NET Framework 4.7.2` executable relied on 32-bit/64-bit Windows COM ActiveX registrations (`zkemkeeper.dll`), which frequently fail on newer Windows 11 updates and cannot run on macOS or Linux.
   - This modern hub uses a **Pure Node.js TCP/UDP Socket Engine**, communicating directly over port `4370`. It runs seamlessly across **macOS, Windows 10/11, and Linux**.

2. **Apple macOS Sequoia Glassmorphism UI:**
   - Frosted vibrancy with real-time blur (`backdrop-filter: blur(48px)`), native macOS traffic lights (red, yellow, green), and glowing active indicators.
   - Official MasterHRMS branding, favicon, and dark nebula aesthetic.

3. **Multi-Tenant Organization Security:**
   - Strict tenant isolation using the organization's unique `x-biometric-key` header and machine hardware serial numbers (`serialNumber`).
   - Supports 5+ multi-vendor client companies without any cross-tenant data leakage.

4. **Zero Data Loss Offline Buffer:**
   - If the office internet connection drops, punches are buffered in local persistent storage.
   - Once connection is restored, the buffer automatically flushes to `https://masterhrms.com/api/biometric/push`.

---

## 📂 Project Architecture

```
Bio-matric Software/desktop-app/
├── assets/                  # Official MasterHRMS logo, favicon, and window icons
│   ├── favicon.ico
│   ├── favicon.svg
│   └── logo.png
├── public/                  # macOS Sequoia Glassmorphism Renderer
│   ├── index.html           # 5-page window shell
│   ├── styles.css           # Zero-dependency frosted glass CSS
│   └── app.js               # UI controller wired to window.electronAPI
├── src/                     # Core Backend & Socket Subsystems
│   ├── config-manager.js    # Persistent configuration manager (IP, Port, API Key)
│   ├── zklib-bridge.js      # Pure TCP/UDP socket driver for ZKTeco/eSSL (port 4370)
│   ├── cloud-sync.js        # MasterHRMS HTTP/HTTPS REST & ADMS gateway
│   └── test-cli.js          # Terminal diagnostics runner
├── main.js                  # Electron Main Process (Frameless, Vibrancy, Tray, IPC)
├── preload.js               # Secure ContextBridge IPC layer
└── package.json             # Build configurations & cross-platform packaging
```

---

## 🚀 Getting Started

### 1. Run in Development Mode
From within this directory:
```bash
npm install
npm start
```

Or run headless CLI diagnostics directly without opening the GUI:
```bash
npm run test:connection
```

---

## 📦 Building Standalone Installers

This application is pre-configured with `electron-builder` to produce native desktop installers:

### 🍎 For macOS (Apple Silicon & Intel)
```bash
npm run build:mac
```
- Output: `dist/MasterHRMS Device Manager-2.5.0.dmg` and `.zip`
- Native macOS vibrancy, dark mode titlebar, and dock icon.

### 🪟 For Windows (Windows 10 / 11)
```bash
npm run build:win
```
- Output: `dist/MasterHRMS Device Manager Setup 2.5.0.exe` (NSIS Installer) and `portable.exe`
- Auto-configures Windows firewall rules for port 4370.

### 🐧 For Linux (Ubuntu, Debian, Fedora)
```bash
npm run build:linux
```
- Output: `dist/MasterHRMS Device Manager-2.5.0.AppImage` and `.deb`

---

## 🛠️ Menu Views & Functionality

1. **Terminal Overview:**
   - Real-time LAN connection (IP, Port 4370).
   - Live telemetry console feed.
   - Quick punch simulator, clock synchronization, and terminal soft reboot.
2. **Cloud ADMS Setup:**
   - Production Cloud Push Target (`https://masterhrms.com/iclock`).
   - Tenant organization selection and API Key configuration.
   - Direct firmware parameter deployment.
3. **Employee Mapping:**
   - Biometric slot assignment (Face 3D, Fingerprint, RFID Card, PIN).
   - MasterHRMS cloud user sync to terminal EEPROM.
4. **Punch Audit Logs:**
   - High-precision raw attendance log browser with millisecond accuracy.
   - CSV / Excel export.
5. **Diagnostics & DLLs:**
   - Automated environment health checks (Firewall, Sockets, Gateway latency).
   - Maintenance utilities (Speaker buzzer test, memory integrity, cache purge).

