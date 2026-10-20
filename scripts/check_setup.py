"""Read-only readiness checks. Run with Python 3.12; no credentials required."""
from pathlib import Path
import importlib.util
import json
import shutil
import socket
import subprocess
import sys
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
failed = []

def report(label, ok, advice):
    print(f"{'PASS' if ok else 'ACTION NEEDED'}: {label}")
    if not ok:
        print(f"  {advice}")
        failed.append(label)

print('Hackathon workspace check — this does not change your files.\n')
report('Python 3.12', sys.version_info[:2] == (3, 12), 'Ask your facilitator to install Python 3.12, then run SETUP.bat.')
node = shutil.which('node')
node_ok = False
if node:
    try:
        version = subprocess.check_output([node, '--version'], text=True).strip().lstrip('v')
        major, minor = map(int, version.split('.')[:2])
        node_ok = major > 20 or (major == 20 and minor >= 18)
    except (OSError, ValueError, subprocess.SubprocessError):
        pass
report('Node.js available and supported', node_ok, 'Ask your facilitator to install Node.js 22 LTS.')
report('Frontend dependencies', (ROOT / 'frontend/node_modules/vite/bin/vite.js').is_file(), 'Run SETUP.bat from the repository folder.')
report('Backend dependencies', all(importlib.util.find_spec(name) for name in ('fastapi', 'uvicorn')), 'Run SETUP.bat; this check should use backend/.venv Python.')
report('Git available for checkpoints', shutil.which('git') is not None, 'Ask your facilitator to install Git before creating checkpoints.')
print('\nServer checks: a stopped app is normal before START.bat.')
for port, route, label in [(8000, '/healthz', 'Backend'), (5173, '/api/hello?name=Setup', 'Frontend-to-backend connection')]:
    with socket.socket() as sock:
        sock.settimeout(1)
        listening = sock.connect_ex(('127.0.0.1', port)) == 0
    if not listening:
        print(f'INFO: {label} is not running. Open START.bat, then run this check again.')
        continue
    try:
        with urllib.request.urlopen(f'http://127.0.0.1:{port}{route}', timeout=5) as response:
            data = json.load(response)
        ok = data.get('status') == 'ok' if port == 8000 else 'frontend and backend are connected' in data.get('message', '')
    except (OSError, ValueError):
        ok = False
    report(label, ok, f'Port {port} is occupied but the expected app did not respond. Show your facilitator the launcher output.')
print('\n' + ('Resolve the items above with your facilitator.' if failed else 'Installed prerequisites passed. If servers are stopped, start the app and check again.'))
print('Also verify GitHub and Copilot sign-in in VS Code. This script cannot verify account access or Azure readiness.')
sys.exit(1 if failed else 0)
