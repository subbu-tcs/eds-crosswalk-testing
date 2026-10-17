"""Builds the Universal Editor pilot content package (pages + DAM images) for Package Manager.

Usage, from the repository root: python3 tools/ue-pilot/build-package.py
Needs Node.js (md2jcr runs through npx) and current component-*.json (npm run build:json).
"""
import glob
import os
import re
import shutil
import subprocess
import tempfile
import zipfile

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(HERE))
# MD2JCR can point at a local md2jcr.js; otherwise the published package runs through npx
MD2JCR = ['node', os.environ['MD2JCR']] if os.environ.get('MD2JCR') \
    else ['npx', '-y', '-p', '@adobe/helix-md2jcr@1.5.10', 'md2jcr']
WORK = tempfile.TemporaryDirectory(prefix='ue-pilot-')  # removed when the script exits
MD = f'{WORK.name}/md'
BUILD = f'{WORK.name}/build'
ROOT = f'{BUILD}/jcr_root'
SITE = 'content/eds-crosswalk-testing/en-th/pilot'
DAM = 'content/dam/eds-crosswalk-testing/pilot'
NAME, GROUP, VERSION = 'eds-crosswalk-testing-ue-pilot', 'eds-crosswalk-testing', '1.0.0'
OUT = f'{HERE}/{NAME}-{VERSION}.zip'

# multiselect fields: Universal Editor stores them as String[]
MULTI = {'accordion', 'booking-widget', 'cards', 'carousel', 'hero', 'listing', 'table', 'tabs'}
BLOCK_TAGS = r'h[1-6]|ul|ol|table|blockquote|pre'

# --- 1. markdown -> JCR ---------------------------------------------------------------------
subprocess.run(['python3', f'{HERE}/make-md.py', MD], check=True)
ue = f'{WORK.name}/ue'
os.makedirs(ue, exist_ok=True)
for f in ('component-models.json', 'component-filters.json', 'component-definition.json'):
    shutil.copy(f'{REPO}/{f}', ue)
for md in glob.glob(f'{MD}/**/*.md', recursive=True):
    subprocess.run([*MD2JCR, md, '-ue', ue], check=True, capture_output=True)


def fix(xml):
    # rich text: md2jcr wraps headings and lists in <p>; lists come out loose
    xml = re.sub(rf'&lt;p&gt;(&lt;(?:{BLOCK_TAGS})&gt;)', r'\1', xml)
    xml = re.sub(rf'(&lt;/(?:{BLOCK_TAGS})&gt;)&lt;/p&gt;', r'\1', xml)
    xml = re.sub(r'&lt;li&gt; &lt;p&gt;(.*?)&lt;/p&gt; &lt;/li&gt;', r'&lt;li&gt;\1&lt;/li&gt;', xml)
    xml = re.sub(r'&lt;/li&gt; &lt;li&gt;', '&lt;/li&gt;&lt;li&gt;', xml)
    xml = re.sub(r'(&lt;[uo]l&gt;) ', r'\1', xml)
    xml = re.sub(r' (&lt;/[uo]l&gt;)', r'\1', xml)
    # a leading inline link (accent button) left without its paragraph
    xml = re.sub(r'text="((?:&lt;(?:em|strong)&gt;)+&lt;a .*?&lt;/a&gt;(?:&lt;/(?:em|strong)&gt;)+)',
                 r'text="&lt;p&gt;\1&lt;/p&gt;', xml)

    # multiselect values as String[] (blocks and columns)
    def multi(m):
        tag = m.group(0)
        model = re.search(r' model="([^"]+)"', tag)
        is_multi = 'columns/v1/columns' in tag or (model and model.group(1) in MULTI)
        if not is_multi:
            return tag
        return re.sub(r' classes="([^"\[]+)"',
                      lambda c: ' classes="[%s]"' % ','.join(v.strip() for v in c.group(1).split(',')), tag)
    xml = re.sub(r'<(?:block|columns) [^>]*>', multi, xml)

    # typed values as Universal Editor writes them
    xml = re.sub(r' (date|validfrom|validto)="(\d{4}-\d\d-\d\d)"', r' \1="{Date}\2T00:00:00.000+07:00"', xml)
    xml = xml.replace(' hidebreadcrumb="true"', ' hidebreadcrumb="{Boolean}true"')
    xml = re.sub(r'( model="listing"[^>]*?| )limit="(\d+)"', r'\1limit="{Long}\2"', xml) \
        if 'model="listing"' in xml else xml
    # F2: Book link left empty (md2jcr fills in the component template default)
    xml = re.sub(r'(<block [^>]*)link="/en-th/book/book-flight" ([^>]*model="fare-widget")', r'\1\2', xml)
    return xml


# --- 2. pages ----------------------------------------------------------------------------------
images = set()
for xml_file in glob.glob(f'{MD}/**/*.xml', recursive=True):
    rel = os.path.relpath(xml_file, MD)[:-4]
    rel = '' if rel == 'index' else rel[:-6] if rel.endswith('/index') else rel
    xml = fix(open(xml_file).read())
    images.update(re.findall(rf'/{DAM}/([\w.-]+)', xml))
    target = os.path.join(ROOT, SITE, rel, '.content.xml')
    os.makedirs(os.path.dirname(target), exist_ok=True)
    open(target, 'w').write(xml)

# ancestor: the market page, created only when missing (outside the filter, never overwritten)
market = os.path.join(ROOT, os.path.dirname(SITE), '.content.xml')
open(market, 'w').write('''<?xml version="1.0" encoding="UTF-8"?>
<jcr:root xmlns:jcr="http://www.jcp.org/jcr/1.0" xmlns:cq="http://www.day.com/jcr/cq/1.0" xmlns:sling="http://sling.apache.org/jcr/sling/1.0" jcr:primaryType="cq:Page">
  <jcr:content cq:template="/libs/core/franklin/templates/page" sling:resourceType="core/franklin/components/page/v1/page" jcr:primaryType="cq:PageContent" jcr:title="English (Thailand)"/>
</jcr:root>
''')

# --- 3. DAM assets -----------------------------------------------------------------------------
MIME = {'.webp': 'image/webp', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg'}
open_dir = os.path.join(ROOT, os.path.dirname(DAM))
os.makedirs(open_dir, exist_ok=True)
open(os.path.join(open_dir, '.content.xml'), 'w').write('''<?xml version="1.0" encoding="UTF-8"?>
<jcr:root xmlns:jcr="http://www.jcp.org/jcr/1.0" xmlns:sling="http://sling.apache.org/jcr/sling/1.0" jcr:primaryType="sling:OrderedFolder" jcr:title="eds-crosswalk-testing"/>
''')
pilot_dir = os.path.join(ROOT, DAM)
os.makedirs(pilot_dir, exist_ok=True)
open(os.path.join(pilot_dir, '.content.xml'), 'w').write('''<?xml version="1.0" encoding="UTF-8"?>
<jcr:root xmlns:jcr="http://www.jcp.org/jcr/1.0" xmlns:sling="http://sling.apache.org/jcr/sling/1.0" jcr:primaryType="sling:OrderedFolder" jcr:title="UE pilot"/>
''')
for name in sorted(images):
    src = f'{REPO}/content/images/{name}'
    mime = MIME[os.path.splitext(name)[1]]
    asset = os.path.join(pilot_dir, name)
    renditions = os.path.join(asset, '_jcr_content', 'renditions')
    os.makedirs(os.path.join(renditions, 'original.dir'), exist_ok=True)
    open(os.path.join(asset, '.content.xml'), 'w').write(f'''<?xml version="1.0" encoding="UTF-8"?>
<jcr:root xmlns:jcr="http://www.jcp.org/jcr/1.0" xmlns:dam="http://www.day.com/dam/1.0" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:nt="http://www.jcp.org/jcr/nt/1.0" jcr:primaryType="dam:Asset">
  <jcr:content jcr:primaryType="dam:AssetContent">
    <metadata jcr:primaryType="nt:unstructured" dc:format="{mime}"/>
    <related jcr:primaryType="nt:unstructured"/>
    <renditions jcr:primaryType="nt:folder"/>
  </jcr:content>
</jcr:root>
''')
    shutil.copy(src, os.path.join(renditions, 'original'))
    open(os.path.join(renditions, 'original.dir', '.content.xml'), 'w').write(f'''<?xml version="1.0" encoding="UTF-8"?>
<jcr:root xmlns:jcr="http://www.jcp.org/jcr/1.0" xmlns:nt="http://www.jcp.org/jcr/nt/1.0" jcr:primaryType="nt:file">
  <jcr:content jcr:primaryType="nt:resource" jcr:mimeType="{mime}"/>
</jcr:root>
''')

# --- 4. vault metadata -------------------------------------------------------------------------
vault = f'{BUILD}/META-INF/vault'
os.makedirs(vault, exist_ok=True)
open(f'{vault}/filter.xml', 'w').write(f'''<?xml version="1.0" encoding="UTF-8"?>
<workspaceFilter version="1.0">
    <filter root="/{SITE}"/>
    <filter root="/{DAM}"/>
</workspaceFilter>
''')
open(f'{vault}/properties.xml', 'w').write(f'''<?xml version="1.0" encoding="utf-8" standalone="no"?>
<!DOCTYPE properties SYSTEM "http://java.sun.com/dtd/properties.dtd">
<properties>
<comment>FileVault Package Properties</comment>
<entry key="name">{NAME}</entry>
<entry key="group">{GROUP}</entry>
<entry key="version">{VERSION}</entry>
<entry key="description">Universal Editor pilot pages (docs/ue-pilot-checklist.md) under /{SITE}, with their images under /{DAM}.</entry>
<entry key="packageType">content</entry>
<entry key="requiresRoot">false</entry>
<entry key="allowIndexDefinitions">false</entry>
</properties>
''')
open(f'{vault}/config.xml', 'w').write('''<?xml version="1.0" encoding="UTF-8"?>
<vaultfs version="1.1"/>
''')

# --- 5. zip ------------------------------------------------------------------------------------
if os.path.exists(OUT):
    os.remove(OUT)
with zipfile.ZipFile(OUT, 'w', zipfile.ZIP_DEFLATED) as z:
    for folder, _, files in os.walk(BUILD):
        for f in sorted(files):
            path = os.path.join(folder, f)
            z.write(path, os.path.relpath(path, BUILD))
print(os.path.relpath(OUT, REPO), len(images), 'images')
