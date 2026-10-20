"""Start both dev servers, open a browser, and stop child processes on exit."""
import os
from pathlib import Path
import shutil
import signal
import socket
import subprocess
import sys
import time
import urllib.request
import webbrowser

ROOT = Path(__file__).resolve().parents[1]
processes = []

def port_available(port):
    with socket.socket() as sock:
        sock.settimeout(0.5)
        # Probe listeners rather than bind: recently stopped sockets may be in TIME_WAIT.
        return sock.connect_ex(('127.0.0.1', port)) != 0

def stop_all():
    for process in reversed(processes):
        if os.name == 'nt':
            subprocess.run(['taskkill', '/PID', str(process.pid), '/T', '/F'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        else:
            try:
                os.killpg(process.pid, signal.SIGTERM)
            except ProcessLookupError:
                pass
    for process in processes:
        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            process.kill()

def main():
    for port in (8000, 5173):
        if not port_available(port):
            print(f'Port {port} is already in use. Close the previous app window, then try again.', flush=True)
            return 1
    node = shutil.which('node')
    if not node:
        print('Node.js is missing. Ask your facilitator to run setup.')
        return 1
    options = {'creationflags': subprocess.CREATE_NEW_PROCESS_GROUP} if os.name == 'nt' else {'start_new_session': True}
    commands = [([sys.executable, '-m', 'uvicorn', 'app.main:app', '--reload', '--host', '127.0.0.1', '--port', '8000'], ROOT / 'backend'), ([node, 'node_modules/vite/bin/vite.js'], ROOT / 'frontend')]
    try:
        for command, directory in commands:
            processes.append(subprocess.Popen(command, cwd=directory, **options))
        print('\nKeep this window open. Press Ctrl+C here to stop the app.\n', flush=True)
        for attempt in range(60):
            if any(process.poll() is not None for process in processes):
                raise RuntimeError('A server stopped. Read the error above or ask your facilitator.')
            try:
                for url in ('http://127.0.0.1:8000/healthz', 'http://127.0.0.1:5173'):
                    with urllib.request.urlopen(url, timeout=1) as response:
                        if response.status != 200:
                            raise OSError('Server not ready')
                break
            except OSError:
                time.sleep(0.5)
        else:
            raise RuntimeError('The app took too long to start. Ask your facilitator to check the output above.')
        print('Your app: http://127.0.0.1:5173', flush=True)
        webbrowser.open('http://127.0.0.1:5173')
        while all(process.poll() is None for process in processes):
            time.sleep(0.5)
        raise RuntimeError('A server stopped. Read the output above, then restart START.bat.')
    except KeyboardInterrupt:
        print('\nStopping your app…')
        return 0
    except Exception as error:
        print(str(error), flush=True)
        return 1
    finally:
        stop_all()

if __name__ == '__main__':
    raise SystemExit(main())
