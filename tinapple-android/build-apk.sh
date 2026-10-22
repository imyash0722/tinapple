#!/bin/bash
set -e

SDK_DIR="/home/pineapple/Android/Sdk"
BUILD_TOOLS="$SDK_DIR/build-tools/34.0.0"
PLATFORM="$SDK_DIR/platforms/android-34"
JAVA_HOME="/home/pineapple/.local/share/mise/installs/java/temurin-17.0.18+8"
export PATH="$JAVA_HOME/bin:$BUILD_TOOLS:$PATH"

PROJECT_DIR="/mnt/shared/projects/tinapple/tinapple-android"
BUILD_DIR="$PROJECT_DIR/build"
OUT_DIR="/mnt/shared/projects/tinapple/out"

mkdir -p "$BUILD_DIR/gen" "$BUILD_DIR/obj" "$BUILD_DIR/apk" "$OUT_DIR"

echo "=== 1. Compiling Android Resources with AAPT2 ==="
"$BUILD_TOOLS/aapt2" compile --dir "$PROJECT_DIR/res" -o "$BUILD_DIR/resources.zip"

echo "=== 2. Linking APK with AAPT2 ==="
"$BUILD_TOOLS/aapt2" link \
    -I "$PLATFORM/android.jar" \
    --manifest "$PROJECT_DIR/AndroidManifest.xml" \
    --java "$BUILD_DIR/gen" \
    -o "$BUILD_DIR/unaligned.apk" \
    "$BUILD_DIR/resources.zip" \
    --auto-add-overlay

echo "=== 3. Compiling Java Source Files ==="
javac -encoding UTF-8 \
    -cp "$PLATFORM/android.jar" \
    -d "$BUILD_DIR/obj" \
    "$BUILD_DIR/gen/org/tinapple/client/R.java" \
    "$PROJECT_DIR/src/org/tinapple/client/MainActivity.java"

echo "=== 4. Dexing Bytecode with D8 ==="
"$BUILD_TOOLS/d8" \
    --lib "$PLATFORM/android.jar" \
    --release \
    --output "$BUILD_DIR/apk" \
    $(find "$BUILD_DIR/obj" -name "*.class")

echo "=== 5. Adding classes.dex to APK ==="
cp "$BUILD_DIR/unaligned.apk" "$BUILD_DIR/app-unsigned-unaligned.apk"
cd "$BUILD_DIR/apk"
zip -uj "$BUILD_DIR/app-unsigned-unaligned.apk" classes.dex
cd "$PROJECT_DIR"

echo "=== 6. Aligning APK with zipalign ==="
"$BUILD_TOOLS/zipalign" -v -p 4 \
    "$BUILD_DIR/app-unsigned-unaligned.apk" \
    "$BUILD_DIR/app-unsigned-aligned.apk"

echo "=== 7. Creating Keystore & Signing APK with apksigner ==="
KEYSTORE="$BUILD_DIR/tinapple.keystore"
if [ ! -f "$KEYSTORE" ]; then
    keytool -genkeypair -v \
        -keystore "$KEYSTORE" \
        -storepass tinapple123 \
        -alias tinapple \
        -keypass tinapple123 \
        -keyalg RSA \
        -keysize 2048 \
        -validity 10000 \
        -dname "CN=Tinapple Hub, OU=Tinapple, O=Tinapple, L=Bangalore, S=Karnataka, C=IN"
fi

"$BUILD_TOOLS/apksigner" sign \
    --ks "$KEYSTORE" \
    --ks-pass pass:tinapple123 \
    --ks-key-alias tinapple \
    --key-pass pass:tinapple123 \
    --out "$OUT_DIR/tinapple-client.apk" \
    "$BUILD_DIR/app-unsigned-aligned.apk"

echo "=== 8. Verifying APK Signature ==="
"$BUILD_TOOLS/apksigner" verify -v "$OUT_DIR/tinapple-client.apk"

echo "SUCCESS: $OUT_DIR/tinapple-client.apk is ready!"
ls -lh "$OUT_DIR/tinapple-client.apk"
