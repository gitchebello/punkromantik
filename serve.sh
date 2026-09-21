#!/usr/bin/env bash
# Sobe o Punkromantik em http://localhost:8140 (use PORT=xxxx ./serve.sh para outra porta).
# server.py serve os arquivos estáticos e guarda o ranking online em scores.json.
PORT="${PORT:-8140}"
DIR="$(cd "$(dirname "$0")" && pwd)"
if ss -ltn 2>/dev/null | grep -q ":$PORT "; then echo "Porta $PORT já em uso — já está rodando? http://localhost:$PORT"; exit 0; fi
nohup python3 -u "$DIR/server.py" "$PORT" > "$DIR/.server.log" 2>&1 &
echo $! > "$DIR/.server.pid"
echo "Punkromantik no ar: http://localhost:$PORT  (pid $(cat "$DIR/.server.pid"))"
