#!/usr/bin/env bash
# Reuses the verified toolchains retained in the cloud environment snapshot.
set -euo pipefail
cd /workspace/biasharaworld
source tools/cloud-env.sh
test -x "$JAVA_HOME/bin/javac"
test -f "$ANDROID_HOME/platforms/android-35/android.jar"
./gradlew --no-daemon :app:assembleDebug :app:testDebugUnitTest :app:lintDebug
