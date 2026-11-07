"""Build the one canonical web archive consumed by every platform job."""
import hashlib
import json
from pathlib import Path
import subprocess
import zipfile

root = Path(__file__).resolve().parent.parent
version = json.loads((root / 'package.json').read_text())['version']
commit = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=root, text=True).strip()
out = root / 'artifacts/web'
out.mkdir(parents=True, exist_ok=True)
hashes = {}
with zipfile.ZipFile(out / f'Ember-Courier-web-v{version}.zip', 'w', zipfile.ZIP_DEFLATED) as archive:
    for file in sorted((root / 'dist').iterdir()):
        data = file.read_bytes()
        hashes[file.name] = hashlib.sha256(data).hexdigest()
        entry = zipfile.ZipInfo(file.name, (2026, 1, 1, 0, 0, 0))
        entry.compress_type = zipfile.ZIP_DEFLATED
        entry.external_attr = 0o100644 << 16
        archive.writestr(entry, data)
(out / f'Ember-Courier-Web-v{version}-provenance.json').write_text(json.dumps({
    'version': version, 'commit': commit, 'web_asset_sha256': hashes,
}, indent=2) + '\n')
print(f'Canonical web archive: v{version}, {commit}, {len(hashes)} assets')
