"""Checks content packages built by build-package.mjs before they go to AEM.

    python3 tools/aem-package/check-package.py tools/aem-package/dist/<name>-<version>.zip [more.zip...]

Several zips (a split build) are checked together. Reports:
- XML that doesn't parse;
- values FileVault would misread (a leading "{" that isn't a JCR type);
- properties that aren't fields of their component's model, and options that aren't model options;
- image references without an asset in the package(s), and assets whose declared type
  doesn't match the file's content;
- per zip, filter roots that aren't in it and assets its filters don't cover.
Exits 1 when anything is found.
"""
import json
import os
import re
import sys
import tempfile
import xml.etree.ElementTree as ET
import zipfile

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
JCR = '{http://www.jcp.org/jcr/1.0}'
TYPES = {'String', 'Binary', 'Long', 'Double', 'Date', 'Boolean', 'Name', 'Path', 'Reference', 'WeakReference', 'URI', 'Decimal'}
SYS = {'model', 'modelFields', 'name', 'filter', 'key-value'}
SIGNATURES = {b'\x89PNG': 'image/png', b'\xff\xd8\xff': 'image/jpeg', b'GIF8': 'image/gif'}

models = {m['id']: m for m in json.load(open(os.path.join(REPO, 'component-models.json')))}
fields = {k: {f['name'] for f in m['fields']} for k, m in models.items()}
options = {k: {o['value'] for f in m['fields'] if f['name'] == 'classes' for o in f.get('options', [])}
           for k, m in models.items()}

zips = sys.argv[1:]
if not zips:
    sys.exit(__doc__)
problems = []
root = tempfile.mkdtemp(prefix='check-package-')
for z in zips:
    zf = zipfile.ZipFile(z)
    bad = zf.testzip()
    if bad:
        problems.append(f'{os.path.basename(z)}: corrupt entry {bad}')
    members = [n for n in zf.namelist() if n.startswith('jcr_root/')]
    filters = [f.get('root') for f in ET.fromstring(zf.read('META-INF/vault/filter.xml')).findall('filter')]
    present = {('/' + m[len('jcr_root/'):]).rsplit('/.content.xml', 1)[0] for m in members if m.endswith('/.content.xml')}
    problems += [f'{os.path.basename(z)}: filter root not in the package: {r}' for r in filters if r not in present]
    assets = {m.split('/_jcr_content/')[0][len('jcr_root'):] for m in members if m.endswith('/_jcr_content/renditions/original')}
    problems += [f'{os.path.basename(z)}: asset not covered by a filter: {a}' for a in assets if a not in filters]
    zf.extractall(root)

pages = assets = values = 0
refs = set()
for folder, _, names in os.walk(os.path.join(root, 'jcr_root')):
    for name in names:
        path = os.path.join(folder, name)
        if name == 'original' and folder.endswith('/renditions'):
            head = open(path, 'rb').read(8)
            actual = next((t for s, t in SIGNATURES.items() if head.startswith(s)), None)
            declared = open(os.path.join(folder, 'original.dir', '.content.xml')).read()
            if actual and f'jcr:mimeType="{actual}"' not in declared:
                problems.append(f'declared type differs from content: {path[len(root):]}')
            continue
        if name != '.content.xml':
            continue
        try:
            tree = ET.parse(path)
        except ET.ParseError as e:
            problems.append(f'XML does not parse: {path[len(root):]}: {e}')
            continue
        kind = tree.getroot().get(f'{JCR}primaryType')
        pages += kind == 'cq:Page'
        assets += kind == 'dam:Asset'
        for el in tree.iter():
            m = el.get('model')
            if m and m not in models:
                problems.append(f'unknown model {m} in {path[len(root):]}')
            for k, v in el.attrib.items():
                values += 1
                if v.startswith('{') and v[1:v.index('}')] not in TYPES:
                    problems.append(f'value read as an unknown type: {k}="{v[:40]}" in {path[len(root):]}')
                if m in fields and '}' not in k and k not in SYS and k not in fields[m]:
                    problems.append(f'not a field of {m}: {k} in {path[len(root):]}')
                if k == 'classes' and options.get(m) and any(x not in options[m] for x in v.strip('[]').split(',')):
                    problems.append(f'not an option of {m}: {v} in {path[len(root):]}')
                refs.update(re.findall(r'/content/dam/eds-crosswalk-testing/[\w/.-]+\.(?:png|jpe?g|gif|webp|svg)', v, re.I))
problems += [f'image reference without an asset: {r}' for r in sorted(refs)
             if not os.path.exists(os.path.join(root, 'jcr_root' + r, '_jcr_content/renditions/original'))]

print(f'{len(zips)} package(s): {pages} pages, {assets} images, {values} values, {len(refs)} image references')
for p in problems:
    print(f'  {p}')
print('OK' if not problems else f'{len(problems)} problem(s)')
sys.exit(1 if problems else 0)
