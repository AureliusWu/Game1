#!/usr/bin/env bash
set -euo pipefail
sdk_root="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-/usr/local/lib/android/sdk}}"
if [ ! -x "$sdk_root/cmdline-tools/latest/bin/sdkmanager" ]; then
  curl -fsSL https://dl.google.com/android/repository/commandlinetools-linux-13114758_latest.zip -o /tmp/android-commandline-tools.zip
  echo "7ec965280a073311c339e571cd5de778b9975026cfcbe79f2b1cdcb1e15317ee  /tmp/android-commandline-tools.zip" | sha256sum -c -
  mkdir -p "$sdk_root/cmdline-tools"
  unzip -q /tmp/android-commandline-tools.zip -d /tmp/ember-commandline-tools
  mv /tmp/ember-commandline-tools/cmdline-tools "$sdk_root/cmdline-tools/latest"
fi
export ANDROID_HOME="$sdk_root" ANDROID_SDK_ROOT="$sdk_root"
export PATH="$sdk_root/cmdline-tools/latest/bin:$sdk_root/platform-tools:$PATH"
echo "ANDROID_HOME=$sdk_root" >> "$GITHUB_ENV"
echo "ANDROID_SDK_ROOT=$sdk_root" >> "$GITHUB_ENV"
echo "$sdk_root/platform-tools" >> "$GITHUB_PATH"
sudo apt-get update -qq
sudo apt-get install -y --no-install-recommends libpulse0 libx11-6 libx11-xcb1 libxcb1 libxcb-cursor0 libgl1 libegl1 libnss3 libxkbcommon0 >/dev/null
sudo chmod 666 /dev/kvm
export ANDROID_AVD_HOME="$RUNNER_TEMP/ember-avd"
export ANDROID_USER_HOME="$RUNNER_TEMP/ember-android"
mkdir -p "$ANDROID_AVD_HOME" "$ANDROID_USER_HOME"
trap 'tail -100 /tmp/ember-emulator.log 2>/dev/null || true' ERR
{ yes || true; } | sdkmanager --licenses >/dev/null
sdkmanager 'emulator' 'system-images;android-35;google_apis;x86_64' >/dev/null
echo no | avdmanager create avd --name ember --package 'system-images;android-35;google_apis;x86_64' --force
"$ANDROID_HOME/emulator/emulator" -accel-check
"$ANDROID_HOME/emulator/emulator" -avd ember -no-window -no-audio -no-boot-anim -no-snapshot -gpu software -feature -Vulkan -camera-back none -camera-front none -memory 2048 > /tmp/ember-emulator.log 2>&1 &
emulator_pid=$!
adb start-server
booted=false
for attempt in $(seq 1 120); do
  kill -0 "$emulator_pid" || { cat /tmp/ember-emulator.log; exit 1; }
  if [ "$(adb -e shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" = "1" ]; then booted=true; break; fi
  sleep 2
done
if [ "$booted" != true ]; then cat /tmp/ember-emulator.log; exit 1; fi
adb shell input keyevent 82
adb shell settings put secure immersive_mode_confirmations confirmed
adb shell settings put global window_animation_scale 0
adb shell settings put global transition_animation_scale 0
adb shell settings put global animator_duration_scale 0
