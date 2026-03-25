"""
Fetch World Bank economic indicators for all countries, all available years.
Output: economy/economic_data.json
Run again any time to refresh data.
"""

import json, time, urllib.request, urllib.parse
from collections import defaultdict

INDICATORS = {
    'NY.GDP.MKTP.KD.ZG': 'gdp_growth',
    'FP.CPI.TOTL.ZG':    'inflation',
    'SL.UEM.TOTL.ZS':    'unemployment',
    'GC.DOD.TOTL.GD.ZS': 'debt_gdp',
    'GC.XPN.TOTL.GD.ZS': 'govt_spending',
    'GC.TAX.TOTL.GD.ZS': 'tax_rate',
}

BASE = 'https://api.worldbank.org/v2'

def fetch_indicator(code, field):
    print(f'Fetching {field}...', end=' ', flush=True)
    url = f'{BASE}/country/all/indicator/{code}?format=json&per_page=20000&mrv=70'
    try:
        with urllib.request.urlopen(url, timeout=60) as r:
            raw = json.loads(r.read())
    except Exception as e:
        print(f'ERROR: {e}')
        return {}

    if not isinstance(raw, list) or len(raw) < 2 or not raw[1]:
        print('no data')
        return {}

    result = {}
    for row in raw[1]:
        if not row or not row.get('country') or not row.get('date'):
            continue
        iso3 = row['countryiso3code']
        if not iso3 or len(iso3) != 3:
            continue
        name = row['country']['value']
        yr   = row['date']
        val  = row['value']  # keep None as None

        if iso3 not in result:
            result[iso3] = {'name': name, 'years': {}}
        if yr not in result[iso3]['years']:
            result[iso3]['years'][yr] = {}
        result[iso3]['years'][yr][field] = val

    count = len(result)
    print(f'done ({count} countries)')
    return result


def main():
    # master dict: iso3 -> {name, iso2, years: {yr: {indicators}}}
    master = {}

    for code, field in INDICATORS.items():
        data = fetch_indicator(code, field)
        for iso3, info in data.items():
            if iso3 not in master:
                master[iso3] = {'name': info['name'], 'years': {}}
            for yr, vals in info['years'].items():
                if yr not in master[iso3]['years']:
                    master[iso3]['years'][yr] = {}
                master[iso3]['years'][yr].update(vals)
        time.sleep(0.3)

    # fetch iso2 codes from country metadata
    print('Fetching country metadata (ISO2 codes)...', end=' ', flush=True)
    try:
        url = f'{BASE}/country/all?format=json&per_page=500'
        with urllib.request.urlopen(url, timeout=30) as r:
            meta = json.loads(r.read())
        if isinstance(meta, list) and len(meta) > 1:
            for c in meta[1]:
                iso3 = c.get('id','')
                iso2 = c.get('iso2Code','')
                if iso3 in master and iso2:
                    master[iso3]['iso2'] = iso2
        print('done')
    except Exception as e:
        print(f'skipped ({e})')

    # fill missing iso2 with empty string
    for iso3 in master:
        master[iso3].setdefault('iso2', '')
        # sort years
        master[iso3]['years'] = dict(sorted(master[iso3]['years'].items()))

    # remove aggregate regions (no iso2, or known aggregate codes)
    AGGREGATES = {
        'WLD','HIC','LMC','LIC','MIC','UMC','LMY','EAP','ECA','LAC',
        'MNA','NAC','SAS','SSA','EAS','ECS','LCN','MEA','SSF','ARB',
        'CSS','CEB','EAR','EMU','EUU','FCS','HPC','IBD','IBT','IDA',
        'IDB','IDX','LTE','OED','OSS','PRE','PSS','PST','TEA','TEC',
        'TLA','TMN','TSA','TSS','INX',
    }
    cleaned = {k: v for k, v in master.items()
               if k not in AGGREGATES and v.get('iso2')}

    out_path = 'economic_data.json'
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(cleaned, f, separators=(',', ':'))

    # summary
    all_years = []
    for v in cleaned.values():
        all_years.extend(int(y) for y in v['years'])
    yr_min = min(all_years) if all_years else '?'
    yr_max = max(all_years) if all_years else '?'

    print(f'\n✓ Done. {len(cleaned)} countries · years {yr_min}–{yr_max}')
    print(f'✓ Saved to {out_path}')

    # quick validation
    usa = cleaned.get('USA')
    if usa:
        yrs = sorted(usa['years'].keys())
        print(f'✓ USA: {len(yrs)} years ({yrs[0]}–{yrs[-1]})')
        if '1980' in usa['years']:
            print(f'  1980 sample: {usa["years"]["1980"]}')
    else:
        print('⚠ USA not found in output')


if __name__ == '__main__':
    main()
