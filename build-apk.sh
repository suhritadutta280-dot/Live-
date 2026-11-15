#!/usr/bin/env bash
set -euo pipefail

# LiveQueen Debug APK Builder (for Linux/macOS/WSL/Termux with JDK 17+ & Android SDK)
# Run from the exported project root directory: bash build-apk.sh
# Output: ./app-debug.apk

echo "==> Checking required build tools..."
command -v node >/dev/null 2>&1 || { echo "Error: Node.js is required."; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "Error: npm is required."; exit 1; }
command -v java >/dev/null 2>&1 || { echo "Error: Java JDK 17+ is required."; exit 1; }

if [ -z "${ANDROID_HOME:-}" ] && [ -z "${ANDROID_SDK_ROOT:-}" ]; then
  echo "Error: ANDROID_HOME or ANDROID_SDK_ROOT must point to your Android SDK."
  exit 1
fi

echo "==> Installing npm dependencies..."
npm install

echo "==> Building Vite web bundle..."
npm run build

if [ ! -d "node_modules/@capacitor/android" ]; then
  echo "==> Installing Capacitor Android tooling..."
  npm install @capacitor/core @capacitor/cli @capacitor/android
fi

if [ ! -f "capacitor.config.ts" ] && [ ! -f "capacitor.config.json" ]; then
  echo "==> Initializing Capacitor configuration..."
  npx cap init "LiveQueen" "com.livequeen.app" --web-dir dist
fi

if [ ! -d "android" ]; then
  echo "==> Creating Android Gradle project..."
  npx cap add android
fi

echo "==> Syncing web assets to Android project..."
npx cap sync android

echo "==> Compiling Debug APK via Gradle..."
(
  cd android
  chmod +x gradlew
  ./gradlew assembleDebug
)

APK_SOURCE="android/app/build/outputs/apk/debug/app-debug.apk"
if [ ! -f "$APK_SOURCE" ]; then
  echo "Error: Expected APK not found at $APK_SOURCE"
  exit 1
fi

cp "$APK_SOURCE" "./app-debug.apk"
echo "==> Done! Debug APK copied to $(pwd)/app-debug.apk"
