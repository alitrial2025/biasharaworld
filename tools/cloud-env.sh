#!/usr/bin/env bash
# Source this only in the Codex cloud environment.
export BIASHARA_TOOLS=/workspace/.toolchains
export JAVA_HOME="$BIASHARA_TOOLS/jdk/jdk-21.0.9+10"
export ANDROID_HOME="$BIASHARA_TOOLS/android-sdk"
export ANDROID_USER_HOME="$BIASHARA_TOOLS/.android"
export ANDROID_EMULATOR_HOME="$ANDROID_USER_HOME"
export ANDROID_AVD_HOME="$BIASHARA_TOOLS/avd"
export GRADLE_USER_HOME="$BIASHARA_TOOLS/gradle-cache"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"
