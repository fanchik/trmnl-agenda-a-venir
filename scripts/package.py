"""Build a clean TRMNL import ZIP; no account IDs or private field values.
Usage: python3 scripts/package.py /absolute/path/coming-up.zip
"""
from pathlib import Path
import sys, zipfile
root = Path(__file__).resolve().parents[1]
if len(sys.argv) != 2:
    raise SystemExit(__doc__)
output = Path(sys.argv[1]).resolve()
settings = """---
strategy: polling
no_screen_padding: 'no'
dark_mode: 'no'
static_data: ''
polling_verb: get
framework_version: 3.4.0
serverless_language: node
polling_url: https://trmnl.com/custom_plugin_example_data.json
polling_headers: ''
polling_body: ''
oauth_enabled: 'false'
name: Agenda à venir
description: Agenda français multi-calendriers
refresh_interval: 15
custom_fields:
""" + (root / 'settings.yml').read_text()
files = {'settings.yml': settings, 'transform.js': (root / 'dist/serverless.js').read_text()}
for name in ['full', 'half_vertical', 'half_horizontal', 'quadrant', 'shared']:
    files[name + '.liquid'] = (root / 'layouts' / (name + '.html')).read_text()
assert len(files['transform.js'].encode()) < 100000
assert len('Agenda français multi-calendriers') <= 35
assert 'keyname: time_zone' not in settings
assert 'custom_fields_values:' not in settings
output.parent.mkdir(parents=True, exist_ok=True)
with zipfile.ZipFile(output, 'w', zipfile.ZIP_DEFLATED) as archive:
    for name, content in files.items():
        archive.writestr(name, content)
with zipfile.ZipFile(output) as archive:
    assert archive.testzip() is None
    assert set(archive.namelist()) == set(files)
print(output)
