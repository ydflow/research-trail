import os
from pathlib import Path
import subprocess
import sys


def test_offline_python_children_block_external_tcp_dns_and_udp():
    policy = Path(__file__).resolve().parents[3] / 'scripts' / 'offline'
    code = '''
import socket
assert socket.research_trail_offline
for action in [lambda: socket.getaddrinfo('api.openai.com', 443),
               lambda: socket.socket().connect(('203.0.113.1', 443)),
               lambda: socket.socket().connect_ex(('203.0.113.1', 443)),
               lambda: socket.socket(socket.AF_INET, socket.SOCK_DGRAM).sendto(b'x', ('203.0.113.1', 53))]:
    try:
        action()
        raise AssertionError('external network was permitted')
    except RuntimeError as error:
        assert 'Offline verification' in str(error)
assert socket.getaddrinfo('127.0.0.1', 443)
'''
    result = subprocess.run([sys.executable, '-c', code], capture_output=True, text=True,
                            env={**os.environ, 'RESEARCH_TRAIL_OFFLINE': '1', 'PYTHONPATH': str(policy)}, timeout=5)
    assert result.returncode == 0, result.stderr
