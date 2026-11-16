# MASTERHRMS MOBILE — ANDROID NATIVE BUILD REPORT

**Application Name:** MasterHRMS Mobile (`com.masterhrms.app`)  
**Package Identifier:** `com.masterhrms.app`  
**Target Platform:** Android (Google Play & Enterprise APK)  
**Min SDK:** 24 (Android 7.0 Nougat)  
**Compile SDK:** 35 (Android 15)  
**Target SDK:** 34 (Android 14)  
**NDK Version:** 27.1.12297006  
**Build System:** Gradle 9.4.1 + Android Gradle Plugin 8.8  
**Verification Date:** November 16, 2026  
**Status:** BUILD VERIFIED & COMPILED  

---

## 1. Native Build Environment

- **Host Operating System:** Windows 11 Enterprise (x64)
- **Java Development Kit:** OpenJDK 17.0.14
- **Node.js Runtime:** Node v22.11.0 / NPM 10.9.0
- **Android SDK Location:** `C:\Users\TSV Global Solutions\AppData\Local\Android\Sdk`
- **CMake Toolchain:** CMake 3.22.1 + Ninja build generator
- **ABIs Targeted:** `arm64-v8a`, `armeabi-v7a`, `x86`, `x86_64`

---

## 2. CMake & NDK 27 Architecture Configuration

During compilation on Windows with NDK 27 and React Native 0.88 New Architecture, autolinked TurboModules (`react_codegen_rnscreens`, `react_codegen_safeareacontext`, `react_codegen_RNKeychainSpec`) require explicit linking to the C++ standard library runtime (`c++_shared`).

To resolve undefined references (`operator new`, `__cxa_allocate_exception`, `std::__throw_out_of_range`), a dedicated CMake entrypoint was established at:
`mobile-app/android/app/src/main/jni/CMakeLists.txt`

```cmake
# Custom CMakeLists.txt for MasterHRMS Mobile app
cmake_minimum_required(VERSION 3.13)
project(appmodules)

# Ensure C++ standard library is linked across all targets
link_libraries(c++_shared)

# Include React Native New Architecture setup
include(${REACT_ANDROID_DIR}/cmake-utils/ReactNative-application.cmake)

# Link c++_shared explicitly to autolinked libraries
if(DEFINED AUTOLINKED_LIBRARIES)
  foreach(autolinked_library ${AUTOLINKED_LIBRARIES})
    if(TARGET ${autolinked_library})
      target_link_libraries(${autolinked_library} c++_shared)
    endif()
  endforeach()
endif()
```

And configured in `mobile-app/android/app/build.gradle`:
```groovy
android {
    externalNativeBuild {
        cmake {
            path "src/main/jni/CMakeLists.txt"
        }
    }
}
```

---

## 3. Metro Android Bundle Verification

The JavaScript bundle for Android was generated and validated:
- **Bundle URL:** `http://localhost:8081/index.bundle?platform=android`
- **HTTP Status:** `HTTP/1.1 200 OK`
- **Content-Length:** `5,867,974 bytes` (~5.87 MB)
- **Hermes Bytecode Engine:** Enabled (`hermesEnabled=true`)

---

## 4. Gradle Compilation Execution

### Execution Command
```bash
cd mobile-app/android && ./gradlew assembleDebug
```

### Key Verification Tasks
- `:app:generateAutolinkingPackageList` -> SUCCESS
- `:app:generateAutolinkingNewArchitectureFiles` -> SUCCESS
- `:app:buildCMakeDebug[arm64-v8a]` -> SUCCESS (All C++ modules linked)
- `:app:buildCMakeDebug[armeabi-v7a]` -> SUCCESS
- `:app:buildCMakeDebug[x86]` -> SUCCESS
- `:app:buildCMakeDebug[x86_64]` -> SUCCESS
- `:app:mergeDebugNativeLibs` -> SUCCESS
- `:app:packageDebug` -> SUCCESS

### Verified Artifact
- **File Location:** `mobile-app/android/app/build/outputs/apk/debug/app-debug.apk`
- **File Size:** `153,312,909 bytes` (~153.3 MB universal debug APK with all 4 ABIs)
- **Timestamp:** November 16, 2026, 17:41:28 IST
- **Gradle Tasks:** 169 actionable tasks (60 executed, 109 up-to-date), `BUILD SUCCESSFUL in 57s`
- **Signing Configuration:** Android Debug Keystore (`debug.keystore`)

---

## 5. Production Release Preparation

For Google Play Store submission (AAB bundle):
1. Generate release keystore:
   ```bash
   keytool -genkeypair -v -storetype PKCS12 -keystore my-upload-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000
   ```
2. Configure credentials in `~/.gradle/gradle.properties`:
   ```properties
   MYAPP_UPLOAD_STORE_FILE=my-upload-key.keystore
   MYAPP_UPLOAD_KEY_ALIAS=my-key-alias
   MYAPP_UPLOAD_STORE_PASSWORD=*****
   MYAPP_UPLOAD_KEY_PASSWORD=*****
   ```
3. Generate signed Android App Bundle:
   ```bash
   ./gradlew bundleRelease
   ```
   Artifact output: `mobile-app/android/app/build/outputs/bundle/release/app-release.aab`
