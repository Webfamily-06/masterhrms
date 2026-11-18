# MasterHRMS Mobile — Environment Configuration & Network Architecture

This document defines the authoritative environment configuration, local backend connectivity, network architecture, and development workflows for the MasterHRMS Mobile Application (Expo / React Native).

---

## 1. Architectural Principles

1. **Development First**: MasterHRMS mobile development connects to the existing local MasterHRMS Express backend (`server/`) during active development (`__DEV__ === true`).
2. **No Duplicated Servers**: The mobile app reuses the existing backend endpoints, authentication middleware, database configuration, and API contracts.
3. **No Automatic Production Routing**: Development builds never route to production by default. Production configuration (`https://www.masterhrms.com`) is only selected for an explicitly configured production release build.
4. **No Hardcoded Private IPs**: No fixed private IP is baked into the runtime. The development API origin is resolved dynamically from `EXPO_PUBLIC_API_BASE_URL` or `EXPO_PUBLIC_DEV_LAN_IP`, with fallback to the local LAN address.
5. **No Metro Host Couplings**: The app does not assume that Metro's script host is the backend host and does not parse Metro's `scriptURL`.
6. **No Fabricated Proxy Headers**: Axios interceptors do not inject fake headers like `x-forwarded-host: localhost` and never overwrite `config.baseURL`.

---

## 2. Environment Strategy

MasterHRMS Mobile supports three explicit environments:

| Environment | Default Condition | API Base URL | Description |
|---|---|---|---|
| **Development** | `__DEV__ === true` or `EXPO_PUBLIC_APP_ENV=development` | Physical: `http://<LAN_IP>:4000`<br>Android Emulator: `http://10.0.2.2:4000`<br>iOS Simulator: `http://localhost:4000` | Local Express backend running on development workstation. |
| **Staging** | `EXPO_PUBLIC_APP_ENV=staging` | `EXPO_PUBLIC_STAGING_API_BASE_URL` | Separately configured pre-production environment. Requires explicit configuration value. |
| **Production** | `EXPO_PUBLIC_APP_ENV=production` or Release Build | `https://www.masterhrms.com` | Deployed production infrastructure. Never used in development. |

---

## 3. Local Backend Setup

The MasterHRMS Express backend runs on port `4000` and binds to `0.0.0.0` to permit connections from mobile devices over the local network.

### Start the Backend
From the workspace root:
```bash
npm run dev
# or inside server/
cd server
npm run dev
```

### Verify Backend Health
Verify the health endpoint from your development machine:
```bash
# Local loopback
curl http://localhost:4000/api/health

# LAN IPv4 (example: 192.168.1.176)
curl http://192.168.1.176:4000/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "service": "Master HRMS API"
}
```

---

## 4. Device Configurations

### A. Physical Android & iOS Devices (Expo Go / Development Client)

Physical devices running on your local Wi-Fi cannot resolve `localhost` or `127.0.0.1` back to your development workstation. They must use your workstation's actual Wi-Fi IPv4 address.

1. **Find your development computer's LAN IPv4**:
   - Windows: `ipconfig` (look for IPv4 Address under *Wireless LAN adapter Wi-Fi*)
   - macOS / Linux: `ifconfig` or `ip a`
2. **Configure `mobile-app/.env`**:
   ```env
   EXPO_PUBLIC_APP_ENV=development
   EXPO_PUBLIC_API_BASE_URL=http://192.168.1.176:4000
   ```
3. **Verify Local Wi-Fi Firewall**:
   Ensure Windows Defender Firewall or macOS firewall permits inbound TCP connections on port `4000` for your local private network.
4. **Ensure Device and Workstation are on the Same Wi-Fi Network**:
   Both the phone and the development computer must be on the same subnet (e.g. `192.168.1.x`).

### B. Android Emulator (Android Studio)
Android emulators run inside a virtual network where `10.0.2.2` routes directly to the host machine's loopback (`127.0.0.1`):
- Automatic fallback: `http://10.0.2.2:4000`
- Or explicitly in `.env`:
  ```env
  EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:4000
  ```

### C. iOS Simulator (macOS Xcode)
iOS simulators share the host machine's network stack directly:
- Automatic fallback: `http://localhost:4000`
- Or explicitly in `.env`:
  ```env
  EXPO_PUBLIC_API_BASE_URL=http://localhost:4000
  ```

---

## 5. Staging Environment Configuration

To target a dedicated staging deployment:
```env
EXPO_PUBLIC_APP_ENV=staging
EXPO_PUBLIC_STAGING_API_BASE_URL=https://staging.masterhrms.com
```

> **Important**: Do not invent staging domains. If `EXPO_PUBLIC_APP_ENV=staging` is specified without `EXPO_PUBLIC_STAGING_API_BASE_URL`, the application logs a warning and falls back to development.

---

## 6. Production Build Configuration

Production builds must be explicitly built with production environment flags:
```env
EXPO_PUBLIC_APP_ENV=production
```

When `EXPO_PUBLIC_APP_ENV=production`, `Config.API_BASE_URL` resolves to:
```
https://www.masterhrms.com
```

---

## 7. How to Switch Environments Safely

1. **Switch to Local Development**:
   ```env
   EXPO_PUBLIC_APP_ENV=development
   EXPO_PUBLIC_API_BASE_URL=http://192.168.1.176:4000
   ```
2. **Restart Expo with Clean Cache**:
   ```bash
   cd mobile-app
   npm run expo:clear
   ```
3. **Verify Active Configuration in App**:
   Navigate to the **System Diagnostics** screen in the app (`SuperAdminNavigator` -> `SystemDiagnostics`).
   - Active Environment: `DEVELOPMENT`
   - Selected API Base URL: `http://192.168.1.176:4000`
   - Connection Status: `HEALTHY` (green badge)

---

## 8. Development Data & Credentials

Use pre-seeded development accounts during mobile development. Do not use production user records.

| Role | Email | Password | Scope |
|---|---|---|---|
| **Employee** | `employee@masterhrms.com` | `admin123` | Employee ESS portal, attendance, leave, payslips, chat |
| **HR Admin** | `hr@masterhrms.com` | `admin123` | HR approvals, employee directory, org attendance |
| **Tenant Admin** | `tenantadmin@masterhrms.com` | `admin123` | Tenant settings, user access, security overview |
