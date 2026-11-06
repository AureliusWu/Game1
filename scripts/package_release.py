"""Package a verified APK and the exact same web assets for GitHub Releases."""
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import zipfile

root = Path(__file__).resolve().parent.parent
version = json.loads((root / 'package.json').read_text())['version']
apk = Path(sys.argv[1]).resolve()
sdk = Path(os.environ.get('ANDROID_HOME') or os.environ['ANDROID_SDK_ROOT'])
tools = sdk / 'build-tools' / '35.0.0'
signature = subprocess.check_output([str(tools / 'apksigner'), 'verify', '--verbose', '--print-certs', str(apk)], text=True)
badging = subprocess.check_output([str(tools / 'aapt'), 'dump', 'badging', str(apk)], text=True)
if 'application-debuggable' in badging:
    raise RuntimeError('Refusing to publish a debuggable APK')
if "name='io.github.aureliuswu.embercourier'" not in badging or f"versionName='{version}'" not in badging:
    raise RuntimeError('APK identity/version does not match the source')
fingerprint = re.search(r'Signer #1 certificate SHA-256 digest: ([0-9a-f]+)', signature)
if not fingerprint:
    raise RuntimeError('No verified signing certificate')
if fingerprint.group(1) != 'd4f25dd8e0c470583dee2bd82944551b575b6e585addcc55b5242480fd3d5aa7':
    raise RuntimeError('Signing certificate differs from the existing upgrade identity')
major, minor, patch = (int(part) for part in version.split('.'))
if f"versionCode='{major * 10000 + minor * 100 + patch}'" not in badging:
    raise RuntimeError('APK versionCode does not match the source')
dist = root / 'dist'
runtime = {}
with zipfile.ZipFile(apk) as archive:
    for file in sorted(dist.iterdir()):
        data = file.read_bytes()
        if archive.read('assets/' + file.name) != data:
            raise RuntimeError('APK asset differs from web release: ' + file.name)
        runtime[file.name] = hashlib.sha256(data).hexdigest()

out = root / 'artifacts'
out.mkdir(exist_ok=True)
apk_target = out / f'Ember-Courier-v{version}.apk'
shutil.copyfile(apk, apk_target)
web = out / f'Ember-Courier-web-v{version}.zip'
with zipfile.ZipFile(web, 'w', zipfile.ZIP_DEFLATED) as archive:
    for file in sorted(dist.iterdir()):
        archive.write(file, file.name)
commit = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=root, text=True).strip()
provenance = out / f'Ember-Courier-v{version}-provenance.json'
provenance.write_text(json.dumps({'version': version, 'commit': commit,
    'application_id': 'io.github.aureliuswu.embercourier', 'min_android_api': 26,
    'signing_certificate_sha256': fingerprint.group(1), 'web_asset_sha256': runtime}, indent=2) + '\n')
checks = out / 'SHA256SUMS.txt'
checks.write_text(''.join(hashlib.sha256(file.read_bytes()).hexdigest() + '  ' + file.name + '\n'
    for file in (apk_target, web, provenance)))
print(f'Verified release signature, package/version and all {len(runtime)} embedded assets.')
print(f'Packaged {apk_target.name} ({apk_target.stat().st_size:,} bytes), web ZIP and checksums.')
