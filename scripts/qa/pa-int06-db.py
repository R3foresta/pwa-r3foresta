"""Cotejo READ ONLY de los comandos del QA contra el clúster sintético INT02C."""
import argparse
import json
import os
from pathlib import Path
import re
import shutil
import subprocess

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--socket', required=True, type=Path)
parser.add_argument('--evidence', type=Path, default=Path('docs/qa/pa-int06/resultados.json'))
parser.add_argument('--output', type=Path, default=Path('docs/qa/pa-int06/db.json'))
args = parser.parse_args()
socket = args.socket.resolve()
if not re.fullmatch(r'/private/tmp/pa-int02c-preview-[a-z0-9_]+/socket', str(socket)) or not socket.is_dir():
    parser.error('Sólo se admite el socket privado del launcher sintético INT02C.')
evidence = json.loads(args.evidence.read_text())
if evidence.get('entorno') != 'SINTETICO_LOCAL_INT02C':
    parser.error('La evidencia no corresponde al entorno sintético.')
commands = evidence['commands']
keys = [item['body']['comando_id'] for item in commands]
if not keys or len(set(keys)) != len(keys) or any(not re.fullmatch(r'[0-9a-f-]{36}', key) for key in keys):
    parser.error('Identidades de comandos incompatibles o repetidas.')
sql = """
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL statement_timeout = '10s';
SELECT jsonb_agg(jsonb_build_object(
  'comando_id', c.comando_id::text, 'actor_id', c.actor_id::text,
  'operacion', c.operacion, 'estado', c.estado, 'resultado', c.resultado,
  'error_codigo', c.error->>'codigo',
  'eventos', (SELECT count(*) FROM public.subcampania_historial h WHERE h.participacion_comando_id=c.id)
) ORDER BY c.id)
FROM public.participacion_comando c WHERE c.comando_id IN (KEYS);
COMMIT;
""".replace('KEYS', ','.join("'" + key + "'::uuid" for key in keys))
environment = {key: value for key, value in os.environ.items() if not key.startswith('PG')}
psql = shutil.which('psql')
if not psql:
    parser.error('Falta psql local.')
result = subprocess.run([psql, '-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '-h', str(socket), '-p', '55435', '-U', 'postgres', '-d', 'pa_int02c_preview'], input=sql, text=True, capture_output=True, env=environment, check=True, timeout=15)
rows = json.loads(result.stdout.strip())
assert len(rows) == len(keys), 'Cada envío debe tener exactamente un comando durable.'
by_key = {row['comando_id']: row for row in rows}
checks = ['Una fila durable por identidad enviada desde el navegador']
for item in commands:
    row = by_key[item['body']['comando_id']]
    if row['estado'] == 'RECHAZADO':
        assert row['eventos'] == 0 and row['resultado'] is None
    else:
        assert row['estado'] == 'CONFIRMADO'
        changed = sum(any(user['cambio'] == 'CAMBIO_APLICADO' for user in scope['usuarios']) for scope in row['resultado']['cambios'])
        assert row['eventos'] == changed, 'Historial duplicado o ausente para el comando.'
checks.append('Un evento por ámbito con cambios reales; ningún evento para rechazos')
lost = next(row for row in rows if row['operacion'] == 'RETIRAR_PLANTADOR')
assert lost['estado'] == 'CONFIRMADO' and lost['eventos'] == 2
assert all(user['revision_anterior'] == '1' and user['revision_nueva'] == '2' for scope in lost['resultado']['cambios'] for user in scope['usuarios'])
checks.append('Respuesta perdida: un retiro durable, dos ámbitos, una revisión por persona/ámbito')
assert {row['error_codigo'] for row in rows if row['estado'] == 'RECHAZADO'} == {'REVISION_OBSOLETA', 'ULTIMO_ADMINISTRADOR_CONTEXTUAL'}
checks.append('Rechazos durables por revisión y continuidad, sin historial parcial')
args.output.parent.mkdir(parents=True, exist_ok=True)
args.output.write_text(json.dumps({'entorno': evidence['entorno'], 'solo_lectura': True, 'checks': checks, 'comandos': rows}, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'comandos': len(rows), 'checks': len(checks), 'output': str(args.output)}, ensure_ascii=False))
