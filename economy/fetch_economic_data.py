#!/usr/bin/env python3
"""
Economy & Debt Simulator — World Bank Data Fetcher v2
Fetches 30+ indicators across 6 groups for all countries, all available years.
Output: economy/economic_data.json

Groups:
  economic    — GDP growth, inflation, unemployment, debt, trade, spending, tax, per capita
  population  — total pop, growth, urbanization, dependency ratio, migration
  health      — life expectancy, child mortality, hospital beds, physicians, health spend
  education   — literacy, primary/secondary/tertiary enrollment, edu spend
  environment — CO2, forest area, energy use, freshwater, PM2.5
  governance  — transparency, effectiveness, corruption control, rule of law, gini
"""

import json, time, urllib.request, os

INDICATOR_GROUPS = {
    "economic": {
        "NY.GDP.MKTP.KD.ZG":  "gdp_growth",
        "FP.CPI.TOTL.ZG":     "inflation",
        "SL.UEM.TOTL.ZS":     "unemployment",
        "GC.DOD.TOTL.GD.ZS":  "debt_gdp",
        "NE.TRD.GNFS.ZS":     "trade_gdp",
        "GC.XPN.TOTL.GD.ZS":  "govt_spending",
        "GC.TAX.TOTL.GD.ZS":  "tax_rate",
        "NY.GDP.PCAP.KD":     "gdp_per_capita",
    },
    "population": {
        "SP.POP.TOTL":        "population",
        "SP.POP.GROW":        "pop_growth",
        "SP.URB.TOTL.IN.ZS":  "urbanization",
        "SP.POP.DPND":        "dependency_ratio",
        "SM.POP.NETM":        "net_migration",
    },
    "health": {
        "SP.DYN.LE00.IN":     "life_expectancy",
        "SH.DYN.MORT":        "child_mortality",
        "SH.MED.BEDS.ZS":     "hospital_beds",
        "SH.MED.PHYS.ZS":     "physicians_per1000",
        "SH.XPD.CHEX.GD.ZS":  "health_expenditure",
    },
    "education": {
        "SE.ADT.LITR.ZS":     "literacy_rate",
        "SE.PRM.ENRR":        "primary_enrollment",
        "SE.SEC.ENRR":        "secondary_enrollment",
        "SE.XPD.TOTL.GD.ZS":  "education_expenditure",
        "SE.TER.ENRR":        "tertiary_enrollment",
    },
    "environment": {
        "EN.ATM.CO2E.PC":     "co2_per_capita",
        "AG.LND.FRST.ZS":     "forest_area",
        "EG.USE.PCAP.KG.OE":  "energy_use_per_capita",
        "ER.H2O.FWTL.ZS":     "freshwater_use",
        "EN.ATM.PM25.MC.M3":  "pm25_air_pollution",
    },
    "governance": {
        "IQ.CPA.TRAN.XQ":     "govt_transparency",
        "GE.EST":             "govt_effectiveness",
        "CC.EST":             "control_of_corruption",
        "RL.EST":             "rule_of_law",
        "SI.POV.GINI":        "gini_index",
    },
}

GROUP_NAMES = list(INDICATOR_GROUPS.keys())
AGGREGATES = {
    'WLD','HIC','LMC','LIC','MIC','UMC','LMY','EAP','ECA','LAC','MNA','NAC',
    'SAS','SSA','EAS','ECS','LCN','MEA','SSF','ARB','CSS','CEB','EAR','EMU',
    'EUU','FCS','HPC','IBD','IBT','IDA','IDB','IDX','LTE','OED','OSS','PRE',
    'PSS','PST','TEA','TEC','TLA','TMN','TSA','TSS','INX',
}

def is_aggregate(iso2, iso3):
    return iso3 in AGGREGATES or not iso2 or len(iso2) != 2

def fetch_all_pages(code):
    base = (f"https://api.worldbank.org/v2/country/all/indicator/{code}"
            f"?format=json&per_page=20000&mrv=70")
    rows = []
    try:
        with urllib.request.urlopen(base, timeout=30) as r:
            raw = json.loads(r.read())
        if not raw or len(raw) < 2 or not raw[1]:
            return rows
        meta, data = raw[0], raw[1]
        rows.extend(data)
        for page in range(2, meta.get("pages", 1) + 1):
            try:
                with urllib.request.urlopen(base + f"&page={page}", timeout=30) as r2:
                    rd = json.loads(r2.read())
                    if rd and len(rd) > 1 and rd[1]:
                        rows.extend(rd[1])
            except Exception as e:
                print(f"    page {page} err: {e}")
            time.sleep(0.2)
    except Exception as e:
        print(f"    FETCH ERROR {code}: {e}")
    return rows

def main():
    db = {}
    group_stats = {g: {"total": 0, "null": 0} for g in GROUP_NAMES}

    for g_idx, (group_name, indicators) in enumerate(INDICATOR_GROUPS.items()):
        print(f"\nFetching GROUP {g_idx+1} {group_name.upper()} ({len(indicators)} indicators)...")

        for code, field in indicators.items():
            print(f"  {code} -> {field}...", end=" ", flush=True)
            rows = fetch_all_pages(code)
            written = 0

            for row in rows:
                if not row:
                    continue
                iso3  = (row.get("countryiso3code") or "").strip()
                iso2  = ((row.get("country") or {}).get("id") or "").strip()
                name  = (row.get("country") or {}).get("value", "")
                year_s = row.get("date", "")
                value = row.get("value")

                if is_aggregate(iso2, iso3) or not iso3 or not year_s:
                    continue
                try:
                    year = int(year_s)
                except ValueError:
                    continue

                if iso3 not in db:
                    db[iso3] = {"name": name, "iso2": iso2, "region": "", "years": {}}
                if not db[iso3].get("iso2"):
                    db[iso3]["iso2"] = iso2

                ystr = str(year)
                if ystr not in db[iso3]["years"]:
                    db[iso3]["years"][ystr] = {g: {} for g in GROUP_NAMES}

                db[iso3]["years"][ystr][group_name][field] = value
                written += 1
                group_stats[group_name]["total"] += 1
                if value is None:
                    group_stats[group_name]["null"] += 1

            print(f"done ({written} rows)")
            time.sleep(0.3)

        s = group_stats[group_name]
        pct = round(s["null"] / s["total"] * 100, 1) if s["total"] else 0
        print(f"  >> {group_name.upper()} done — null rate: {pct}%")

    # Fill missing group/field keys with None
    all_fields = {g: list(v.values()) for g, v in INDICATOR_GROUPS.items()}
    for cdata in db.values():
        for ydata in cdata["years"].values():
            for g, fields in all_fields.items():
                if g not in ydata:
                    ydata[g] = {}
                for f in fields:
                    ydata[g].setdefault(f, None)

    # Sort years
    for cdata in db.values():
        cdata["years"] = dict(sorted(cdata["years"].items()))

    # Summary
    all_years = set()
    for cdata in db.values():
        all_years.update(cdata["years"].keys())

    print(f"\n{'='*55}")
    print(f"Total countries : {len(db)}")
    if all_years:
        int_years = sorted(int(y) for y in all_years)
        print(f"Year range      : {int_years[0]} - {int_years[-1]}")
    for g, s in group_stats.items():
        pct = round(s["null"] / s["total"] * 100, 1) if s["total"] else 0
        print(f"  {g:12s}  {s['total']:8,} points   null: {pct:5.1f}%")
    print(f"{'='*55}")

    out_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "economic_data.json")
    print(f"Writing {out_path} ...")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(db, f, ensure_ascii=False, separators=(",", ":"))

    size_mb = os.path.getsize(out_path) / 1_048_576
    print(f"Done. File size: {size_mb:.1f} MB")

    usa = db.get("USA")
    if usa and "1980" in usa["years"]:
        print(f"USA 1980 sample: {usa['years']['1980']['economic']}")

if __name__ == "__main__":
    main()
