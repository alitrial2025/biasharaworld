#!/usr/bin/env bash
set -euo pipefail
cd /workspace/biasharaworld
source tools/cloud-env.sh
if adb devices | awk '$1 ~ /^emulator-/ && $2 == "device" {found=1} END {exit !found}'; then
    echo 'An Android emulator is already connected.'
    exit 0
fi
# Software rendering supports cloud machines without /dev/kvm.
exec emulator -avd Biashara_UI -no-window -no-audio -no-boot-anim \
    -no-snapshot -accel off -gpu swiftshader -cores 2 -memory 2048 \
    -feature -Vulkan \
    -camera-back none -camera-front none -no-metrics
