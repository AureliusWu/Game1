"""Cross-check web/APK/EXE provenance before exposing an immutable release."""
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import zipfile

root = Path(__file__).resolve().parent.parent
version = json.loads((root / 'package.json').read_text())['version']
commit = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=root, text=True).strip()
hashes = {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted((root / 'dist').iterdir())}
platforms = {}
out = root / 'artifacts/release'
out.mkdir(parents=True, exist_ok=True)
for platform in ('web', 'android', 'windows'):
    folder = root / 'artifacts' / platform
    proofs = list(folder.glob('*-provenance.json'))
    if len(proofs) != 1:
        raise RuntimeError(f'Expected one {platform} provenance file')
    proof = json.loads(proofs[0].read_text())
    if proof['version'] != version or proof['commit'] != commit or proof['web_asset_sha256'] != hashes:
        raise RuntimeError(f'{platform} was not built from the validated source')
    if platform == 'windows':
        if not all(proof['smoke_test'].get(k) is True for k in ('landscape', 'portraitGate', 'saveResume', 'sandboxed')):
            raise RuntimeError('Packaged Windows renderer smoke test is incomplete')
        exe = folder / f'Ember-Courier-v{version}-Windows-x64.exe'
        if hashlib.sha256(exe.read_bytes()).hexdigest() != proof['exe_sha256']:
            raise RuntimeError('Portable EXE changed after verification')
    platforms[platform] = proof
    for file in folder.iterdir():
        if file.is_file():
            if (out / file.name).exists():
                raise RuntimeError('Duplicate release filename: ' + file.name)
            shutil.copyfile(file, out / file.name)
with zipfile.ZipFile(out / f'Ember-Courier-web-v{version}.zip') as archive:
    if set(archive.namelist()) != set(hashes):
        raise RuntimeError('Web archive file set differs from the source')
    for name, digest in hashes.items():
        if hashlib.sha256(archive.read(name)).hexdigest() != digest:
            raise RuntimeError('Web ZIP differs from the source: ' + name)
(out / f'Ember-Courier-v{version}-provenance.json').write_text(json.dumps({
    'version': version, 'commit': commit, 'web_asset_sha256': hashes,
    'platforms': platforms,
}, indent=2) + '\n')
files = sorted(out.iterdir())
(out / 'SHA256SUMS.txt').write_text(''.join(
    hashlib.sha256(file.read_bytes()).hexdigest() + '  ' + file.name + '\n' for file in files))
print(f'Verified {len(hashes)} identical assets across web/APK/EXE; assembled {len(files)} release files.')
