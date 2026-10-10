#!/usr/bin/env python3
"""Servidor do Punkromantik: arquivos estáticos + ranking online.

    python3 server.py [porta]        (padrão 8140; use ./serve.sh)

API (mesma origem, sem dependências):
    GET  /api/scores?limit=30   -> {"top": [{"rank","name","score","tiles","perfects","quests","ts"}...], "total": N}
    GET  /api/scores?daily=AAAA-MM-DD  -> só as partidas do desafio daquele dia
    POST /api/scores            <- {"name","score","tiles","perfects","quests"[, "daily": "AAAA-MM-DD"]}
                                -> {"rank": posição desta partida, "total": N, "top": [...]}
                                   (com "daily", posição e lista são as do desafio do dia)
Os resultados ficam em scores.json ao lado deste arquivo (gravação atômica, com trava).
"""
import json
import os
import re
import sys
import threading
import time
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else int(os.environ.get('PORT', 8140))
DIR = os.path.dirname(os.path.abspath(__file__))
DB = os.path.join(DIR, 'scores.json')
LOCK = threading.Lock()
MAX_KEEP = 2000          # partidas guardadas (as melhores)
MAX_BODY = 4096
DAILY_RE = re.compile(r'^\d{4}-\d{2}-\d{2}$')
DAILY_KEEP_S = 30 * 86400  # partidas de desafio diário ficam 30 dias, além das MAX_KEEP melhores
NAME_RE = re.compile(r'[^\w \-\.\'!?@#áàâãéêíóôõúçÁÀÂÃÉÊÍÓÔÕÚÇñÑüÜ]', re.UNICODE)
HIDDEN = ('server.py', 'serve.sh', 'scores.json', 'README.md')


def load():
    try:
        with open(DB, encoding='utf-8') as f:
            rows = json.load(f)
        return rows if isinstance(rows, list) else []
    except (OSError, ValueError):
        return []


def save(rows):
    tmp = DB + '.tmp'
    with open(tmp, 'w', encoding='utf-8') as f:
        json.dump(rows, f, ensure_ascii=False, separators=(',', ':'))
    os.replace(tmp, DB)


def clean_name(raw):
    name = NAME_RE.sub('', str(raw or '')).strip()
    name = re.sub(r'\s+', ' ', name)
    return name[:16]


def clamp_int(v, lo, hi):
    try:
        return max(lo, min(hi, int(v)))
    except (TypeError, ValueError):
        return lo


def ranked(rows):
    rows.sort(key=lambda r: (-r['score'], -r.get('tiles', 0), r['ts']))
    return rows


def trimmed(rows):
    rows = ranked(rows)
    keep, now = set(id(r) for r in rows[:MAX_KEEP]), time.time()
    return [r for r in rows if id(r) in keep or (r.get('daily') and now - r['ts'] < DAILY_KEEP_S)]


def clean_daily(raw):
    raw = str(raw or '')
    return raw if DAILY_RE.match(raw) else None


class Handler(SimpleHTTPRequestHandler):
    server_version = 'Punkromantik/1.0'

    def __init__(self, *a, **kw):
        super().__init__(*a, directory=DIR, **kw)

    # ----- estáticos -----
    def do_GET(self):
        url = urlparse(self.path)
        if url.path == '/api/scores':
            return self.api_get(parse_qs(url.query))
        if url.path == '/api/health':
            return self.send_json({'ok': True, 'time': time.time()})
        base = os.path.basename(url.path)
        if base.startswith('.') or base in HIDDEN:
            return self.send_error(404)
        return super().do_GET()

    def end_headers(self):
        # no-cache em TUDO (inclusive .js/.css): o navegador revalida a cada carga (304 se nada mudou).
        # Sem isso ele guardava os módulos por horas e podia rodar main.js novo com tilegen.js velho,
        # o que quebrava o turno no meio (peça fantasma duplicada sobre a recém-colocada, 10/10).
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()

    # ----- API -----
    def api_get(self, qs):
        limit = clamp_int((qs.get('limit') or ['30'])[0], 1, 100)
        daily = clean_daily((qs.get('daily') or [''])[0])
        with LOCK:
            rows = ranked([r for r in load() if not daily or r.get('daily') == daily])
            top = [dict(r, rank=i + 1) for i, r in enumerate(rows[:limit])]
            total = len(rows)
        self.send_json({'top': top, 'total': total})

    def do_POST(self):
        if urlparse(self.path).path != '/api/scores':
            return self.send_error(404)
        length = clamp_int(self.headers.get('Content-Length', 0), 0, MAX_BODY + 1)
        if length <= 0 or length > MAX_BODY:
            return self.send_json({'error': 'corpo inválido'}, 400)
        try:
            data = json.loads(self.rfile.read(length).decode('utf-8'))
        except (ValueError, UnicodeDecodeError):
            return self.send_json({'error': 'JSON inválido'}, 400)
        name = clean_name(data.get('name'))
        if not name:
            return self.send_json({'error': 'nome obrigatório'}, 400)
        row = {
            'name': name,
            'score': clamp_int(data.get('score'), 0, 999999),
            'tiles': clamp_int(data.get('tiles'), 0, 9999),
            'perfects': clamp_int(data.get('perfects'), 0, 9999),
            'quests': clamp_int(data.get('quests'), 0, 9999),
            'ts': int(time.time()),
        }
        daily = clean_daily(data.get('daily'))
        if daily:
            row['daily'] = daily
        with LOCK:
            rows = load()
            rows.append(row)
            rows = trimmed(rows)
            save(rows)
            if daily:
                rows = [r for r in rows if r.get('daily') == daily]
            rank = 1 + sum(1 for r in rows if r['score'] > row['score'])
            top = [dict(r, rank=i + 1) for i, r in enumerate(rows[:30])]
            total = len(rows)
        self.send_json({'rank': rank, 'total': total, 'top': top})

    def send_json(self, obj, status=200):
        body = json.dumps(obj, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, fmt, *args):  # só API e erros no log
        if self.path.startswith('/api/') or (args and str(args[1:2]) not in ("('200',)", "('304',)")):
            super().log_message(fmt, *args)


if __name__ == '__main__':
    httpd = ThreadingHTTPServer(('0.0.0.0', PORT), Handler)
    print(f'Punkromantik em http://0.0.0.0:{PORT}  (ranking em {DB})', flush=True)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
