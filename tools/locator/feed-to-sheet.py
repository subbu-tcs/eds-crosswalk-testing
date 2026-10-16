"""Converts the current AEM locator feeds into the flat sheet rows the locator block reads.

usage: python3 feed-to-sheet.py airports <feed.json> <out.json> [CITYCODE ...]
       python3 feed-to-sheet.py offices <feed.json> <out.json> [COUNTRYCODE ...]
Writes an EDS sheet JSON ({"data": [...]}); the same rows can be pasted into a spreadsheet.
"""
import json
import re
import sys


def pretty(key):
    words = re.sub(r'([a-z])([A-Z])', r'\1 \2', key).replace('_', ' ').strip().lower()
    return words[:1].upper() + words[1:]


def airports(feed, only):
    rows = []
    for country in feed['countryItems']:
        for city in country['cityDetails']:
            if only and city['cityCode'] not in only:
                continue
            base = {'Country': country['country'], 'Country code': country['countryCode'],
                    'City': city['city'], 'City code': city['cityCode'], 'Airport': city.get('airportInfo', '')}
            rows.append({**base, 'Image': city.get('bannerImage', ''), 'Section': '', 'Group': '', 'Label': '', 'Value': ''})
            for tab in city.get('tabItems', []):
                section = tab.get('loungeTitle') or tab.get('basicFactTitle') or tab['tab']
                for key, value in tab.items():
                    if key in ('tab', 'loungeTitle', 'basicFactTitle'):
                        continue
                    if key in ('loungeDesc', 'basicFactDesc'):
                        rows.append({**base, 'Section': section, 'Group': '', 'Label': '', 'Value': value})
                    elif key == 'imagesList':
                        for lounge in value:
                            group = lounge.get('loungeTitle', '')
                            for label, field in (('Type', 'loungeType'), ('Location', 'loungeText'), ('', 'loungeDescription')):
                                if lounge.get(field):
                                    rows.append({**base, 'Section': section, 'Group': group, 'Label': label, 'Value': lounge[field],
                                                 'Image': lounge.get('imagePath', ''), 'Link': lounge.get('ctaredirectionurl', ''),
                                                 'Link text': lounge.get('ctabuttontext', '')})
                    elif isinstance(value, dict):
                        for label, field in value.items():
                            if str(field).strip():
                                rows.append({**base, 'Section': section, 'Group': key, 'Label': pretty(label), 'Value': field})
    return rows


def offices(feed, only):
    rows = []
    for country in feed['countryList']:
        if only and country['countryCode'] not in only:
            continue
        for city in country['cityDetails']:
            for item in city['categoryItems']:
                for office in item['officeDetails']:
                    row = {'Country': country['country'], 'Country code': country['countryCode'], 'City': city['city'],
                           'Category': item['category'], 'Name': office.get('address', '')}
                    for key, value in office.items():
                        if key != 'address':
                            row[pretty(key)] = value
                    rows.append(row)
    return rows


kind, src, out, *only = sys.argv[1:]
feed = json.load(open(src))
data = airports(feed, only) if kind == 'airports' else offices(feed, only)
json.dump({'total': len(data), 'offset': 0, 'limit': len(data), 'data': data, ':type': 'sheet'}, open(out, 'w'), ensure_ascii=False, indent=1)
print(kind, len(data), 'rows')
