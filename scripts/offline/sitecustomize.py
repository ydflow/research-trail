"""Verification-only: Python children inherit PYTHONPATH and the offline flag."""
import os
import socket
import ipaddress


if os.environ.get("RESEARCH_TRAIL_OFFLINE") == "1":
    def assert_local(host):
        if host == "localhost":
            return
        try:
            if ipaddress.ip_address(host).is_loopback:
                return
        except ValueError:
            pass
        raise RuntimeError("Offline verification forbids external network connections.")

    def guard_address(address):
        if isinstance(address, tuple):
            assert_local(address[0])

    original_connect = socket.socket.connect
    original_connect_ex = socket.socket.connect_ex
    original_sendto = socket.socket.sendto
    original_lookup = socket.getaddrinfo

    def connect(self, address):
        guard_address(address)
        return original_connect(self, address)

    def connect_ex(self, address):
        guard_address(address)
        return original_connect_ex(self, address)

    def sendto(self, data, *args):
        guard_address(args[-1])
        return original_sendto(self, data, *args)

    def lookup(host, *args, **kwargs):
        if host is not None:
            assert_local(host)
        return original_lookup(host, *args, **kwargs)

    socket.socket.connect = connect
    socket.socket.connect_ex = connect_ex
    socket.socket.sendto = sendto
    socket.getaddrinfo = lookup
    socket.research_trail_offline = True
