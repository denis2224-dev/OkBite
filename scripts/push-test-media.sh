#!/usr/bin/env bash
set -euo pipefail
if [[ $# != 2 || ( "$1" != ios && "$1" != android ) ]]; then
  echo 'Usage: push-test-media.sh ios|android /absolute/path/to/test-media' >&2
  exit 2
fi
task_media_dir="$2"
files=()
for name in known-front.jpg known-barcode.jpg unknown-front.jpg unknown-ingredients.jpg unknown-nutrition.jpg; do
  file="$task_media_dir/$name"
  if [[ ! -f "$file" || ! -r "$file" ]]; then
    echo "Missing readable test photograph: $name" >&2
    exit 1
  fi
  files+=("$file")
done
if [[ "$1" == ios ]]; then
  xcrun simctl addmedia booted "${files[@]}"
else
  adb shell mkdir -p /sdcard/Pictures/OkBiteTests
  for file in "${files[@]}"; do
    remote="/sdcard/Pictures/OkBiteTests/${file##*/}"
    adb push "$file" "$remote"
    adb shell am broadcast -a android.intent.action.MEDIA_SCANNER_SCAN_FILE -d "file://$remote"
  done
fi
