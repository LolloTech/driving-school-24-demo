"""Read-only checks against real frontend/Authelia listeners; no credentials printed."""
from urllib.request import urlopen
from urllib.parse import urljoin
from pathlib import Path
import re
from environment import load_environment

config = load_environment(Path.cwd())
prefix = config.get('APP_BASE_PATH', '')
frontend = 'http://127.0.0.1:' + config['FRONTEND_PORT']
auth = 'http://127.0.0.1:' + config['AUTHELIA_PORT']

def get(url):
    with urlopen(url, timeout=10) as response:
        return response.read().decode(), response.headers

public, headers = get(frontend + prefix + '/')
assert headers['Cache-Control'] == 'public, max-age=300'
office, headers = get(frontend + prefix + '/login')
assert office != public, 'Login must use the isolated backoffice HTML'
assert headers['Cache-Control'] == 'public, max-age=300'
for route in ['/register', '/backoffice', '/backoffice/quizzes', '/backoffice/exams']:
    assert get(frontend + prefix + route)[0] == office, route
assert get(frontend + prefix + '/faq')[0] == public
assert get(frontend + prefix + '/contatti')[0] == public
for html in [public, office]:
    assets = re.findall(r'(?:src|href)="(' + re.escape(prefix) + r'/assets/[^"]+)"', html)
    assert assets
    for path in assets:
        _, asset_headers = get(frontend + path)
        assert asset_headers['Cache-Control'] == 'public, max-age=300'
auth_path = re.sub(r'^https?://[^/]+', '', config['AUTH_ORIGIN']).rstrip('/')
portal, _ = get(auth + auth_path + '/')
assert '<html' in portal.lower()
# Authelia keeps root API endpoints for internal backend communication.
get(auth + '/api/health')
if auth_path:
    get(auth + auth_path + '/api/health')
for asset in re.findall(r'(?:src|href)="([^"?]+\.(?:js|css))(?:\?[^\"]*)?"', portal):
    if not asset.startswith(('https://', 'http://', '//')):
        get(urljoin(auth + auth_path + '/', asset))
print('PASS: real public/backoffice routes, 300-second static caching, referenced assets and Authelia portal/API paths.')
