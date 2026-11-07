"""Verify the deployed project subpath and every public runtime asset."""
import hashlib
import json
from pathlib import Path
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

root = Path(__file__).resolve().parent.parent
version = json.loads((root / 'package.json').read_text())['version']
proof = json.loads((root / f'artifacts/web/Ember-Courier-Web-v{version}-provenance.json').read_text())
base = sys.argv[1].rstrip('/') + '/'
if urllib.parse.urlparse(base).scheme != 'https':
    raise SystemExit('Pages must be served over HTTPS')
for attempt in range(12):
    try:
        checked = []
        for name, expected in proof['web_asset_sha256'].items():
            url = urllib.parse.urljoin(base, name) + '?verify=' + proof['commit']
            with urllib.request.urlopen(url, timeout=20) as response:
                body, content_type = response.read(), response.headers.get_content_type()
                if response.status != 200 or hashlib.sha256(body).hexdigest() != expected:
                    raise RuntimeError('Live Pages asset differs from validated source: ' + name)
                if name.endswith('.mjs') and content_type not in ('text/javascript', 'application/javascript'):
                    raise RuntimeError('Module served with incorrect MIME type: ' + name)
                checked.append(name)
        break
    except (OSError, RuntimeError, urllib.error.URLError):
        if attempt == 11:
            raise
        time.sleep(5)
report = {'status': 'passed', 'version': version, 'commit': proof['commit'], 'url': base,
          'verified_assets': checked, 'https': True, 'module_mime': True, 'relative_subpath': True}
folder = root / 'artifacts/pages'
folder.mkdir(parents=True, exist_ok=True)
(folder / 'pages-verification.json').write_text(json.dumps(report, indent=2) + '\n')
print(f'Live Pages verified: {base} · v{version} · {len(checked)} identical runtime assets')
