"""Reject missing/error-text captures before a native visual archive can pass."""
from pathlib import Path
import struct
import sys

root = Path(sys.argv[1])
for orientation in ('portrait', 'landscape'):
    path = root / f'draft-{orientation}.png'
    data = path.read_bytes()
    if len(data) < 1000 or data[:8] != b'\x89PNG\r\n\x1a\n' or data[12:16] != b'IHDR':
        raise SystemExit(f'Not an actual PNG screenshot: {path}')
    width, height = struct.unpack('>II', data[16:24])
    if min(width, height) < 300 or (width < height) != (orientation == 'portrait'):
        raise SystemExit(f'Wrong screenshot orientation/size: {path}: {width}x{height}')
    print(f'Actual Android {orientation} screenshot: {width}x{height}, {len(data)} bytes')
