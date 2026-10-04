"""Resolve the same dotenv layers for Compose, without requiring host Node.js.

Files use KEY=value, optionally single/double quoted. Runtime overrides win.
Only the destination path is printed; never configuration values.
"""
import json
import os
from pathlib import Path
import re
import sys

def load_environment(directory, overrides=None):
    values = {}
    for name in ('.env.dev', '.env.staging', '.env.prod'):
        path = Path(directory) / name
        if not path.exists():
            continue
        for number, line in enumerate(path.read_text().splitlines(), 1):
            line = line.strip()
            if not line or line.startswith('#'):
                continue
            match = re.fullmatch(r'(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)', line)
            if not match:
                raise ValueError(f'{name}:{number}: expected KEY=value')
            key, value = match.groups()
            if value.startswith('"'):
                value = json.loads(value)
            elif value.startswith("'") and value.endswith("'"):
                value = value[1:-1]
            else:
                value = value.split('#', 1)[0].strip()
            values[key] = value
    for key in values:
        if key in (overrides if overrides is not None else os.environ):
            values[key] = (overrides if overrides is not None else os.environ)[key]
    return values

if __name__ == '__main__':
    values = load_environment(Path.cwd())
    target = Path('.deploy/environment.env')
    target.parent.mkdir(mode=0o700, exist_ok=True)
    # Compose single-quoted values preserve literal dollars and hashes.
    if any('\n' in v or "'" in v for v in values.values()):
        raise ValueError('Environment values must be single-line and contain no single quotes')
    descriptor = os.open(target, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(descriptor, 'w') as output:
        for key, value in values.items():
            output.write(f"{key}='{value}'\n")
    print(target)
