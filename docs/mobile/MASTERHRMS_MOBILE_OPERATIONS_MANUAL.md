# MasterHRMS Mobile — Operations, Build & Deployment Manual

**Application:** MasterHRMS Unified Mobile App  
**Target OS:** Android & iOS  
**Framework:** React Native CLI 0.88 + TypeScript  
**Package:** `com.masterhrms.app`  

---

## 1. Local Development Setup

### 1.1 Prerequisites
- **Node.js:** v20.x or v22.x
- **Package Manager:** `npm` or `yarn`
- **JDK:** OpenJDK 17
- **Android Studio:** Android SDK (API 34 / 35), Android SDK Command-line Tools, CMake, NDK
- **Xcode (macOS only):** Xcode 15+ and CocoaPods

### 1.2 Running Development Server
From the root directory:
```bash
# Start the Metro Bundler
cd mobile-app
npx expo start --clear
# or standard Metro:
npm start -- --reset-cache
```

### 1.3 Running on Android Device / Emulator
Connect your physical device via USB with USB Debugging enabled, or launch an Android Virtual Device (AVD):
```bash
cd mobile-app
npm run android
```

### 1.4 Running on iOS Simulator (macOS)
```bash
cd mobile-app/ios
pod install
cd ..
npm run ios
```

---

## 2. Production Build Execution

### 2.1 Generating Android Release APK
1. Configure keystore in `mobile-app/android/gradle.properties`:
   ```properties
   MYAPP_UPLOAD_STORE_FILE=my-upload-key.keystore
   MYAPP_UPLOAD_KEY_ALIAS=my-key-alias
   MYAPP_UPLOAD_STORE_PASSWORD=*****
   MYAPP_UPLOAD_KEY_PASSWORD=*****
   ```
2. Assemble release APK:
   ```bash
   cd mobile-app/android
   ./gradlew assembleRelease
   ```
3. Output artifact location:
   `mobile-app/android/app/build/outputs/apk/release/app-release.apk`

### 2.2 Generating Android App Bundle (AAB for Google Play)
```bash
cd mobile-app/android
./gradlew bundleRelease
```
Output artifact location:  
`mobile-app/android/app/build/outputs/bundle/release/app-release.aab`

### 2.3 Generating iOS Archive (macOS)
1. Open `mobile-app/ios/masterhrms.xcworkspace` in Xcode.
2. Select target **masterhrms** and set your Apple Developer Team for signing.
3. Select **Product > Archive**.
4. In the Organizer window, click **Distribute App** to upload to App Store Connect or export for Ad-Hoc/Enterprise testing.

---

## 3. Environment & Network Configuration

The mobile application dynamically configures API connection parameters in `mobile-app/src/config/environment.ts`:
- **Development API:** `http://192.168.1.176:4000` (Local Wi-Fi IP of Express host)
- **Production API:** `https://api.masterhrms.com`
- **Reverse Proxy Host:** Headers attach `x-forwarded-host: localhost` to ensure multi-tenant domain resolution operates correctly behind reverse proxies.

---

## 4. Multi-Tenant Navigation & Security Matrix

- **Tenant Resolution:** Handled via `TenantService.resolveTenant(slug)` hitting `/api/v1/auth/public/tenant/resolve`.
- **Session Keystore:** Tokens (`accessToken`, `refreshToken`, `biometricKey`) stored securely using hardware-backed Android Keystore / iOS Keychain.
- **Fail-Closed Isolation:** Persona switcher and tenant switcher purge TanStack Query cache and cancel in-flight Axios requests to prevent cross-tenant data retention.
