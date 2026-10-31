#!/usr/bin/env bash
# Generates a throwaway self-signed certificate for localhost + 127.0.0.1
# into a fresh temp directory and prints that directory. The certificate
# never enters the repository.
set -euo pipefail
dir="$(mktemp -d -t tecken-tls-XXXXXX)"
openssl req -x509 -newkey rsa:2048 -nodes -days 2 \
    -subj "/CN=localhost" \
    -addext "subjectAltName=DNS:localhost,IP:127.0.0.1" \
    -keyout "$dir/key.pem" -out "$dir/cert.pem" >/dev/null 2>&1
echo "$dir"
