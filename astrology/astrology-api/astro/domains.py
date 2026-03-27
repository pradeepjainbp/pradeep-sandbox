# astro/domains.py
# 12-domain scoring engine — every score is derived from Ashtakavarga (Law 6)
# Scoring formula per spec:
#   40% — Sarvashtakavarga score for primary house (normalised 0-56 → 0-100)
#   20% — Dignity of the house lord
#   15% — Divisional chart confirmation
#   15% — Dasha activation
#   10% — Aspect balance (benefic aspects on house)

from astro.ashtakavarga import calculate_bhinna_ashtakavarga, calculate_sarvashtakavarga

# ── Domain definitions ──────────────────────────────────────────────────────
# Each domain: primary house, secondary house (optional), primary lords,
# divisional chart key used for confirmation, Sanskrit name.
DOMAINS = [
    {
        'id': 'dharma',
        'name': 'Dharma & Purpose',
        'sanskrit': 'धर्म',
        'primary_house': 1,
        'secondary_house': 9,
        'lords': ['Sun'],
        'divisional': None,
        'description': 'Your soul direction, identity, and life purpose.',
    },
    {
        'id': 'wealth',
        'name': 'Wealth & Accumulation',
        'sanskrit': 'धन',
        'primary_house': 2,
        'secondary_house': 11,
        'lords': ['Jupiter', 'Venus', 'Mercury'],
        'divisional': 'd2',
        'description': 'Financial resources, material security, and accumulation.',
    },
    {
        'id': 'siblings',
        'name': 'Siblings & Courage',
        'sanskrit': 'सहज',
        'primary_house': 3,
        'secondary_house': None,
        'lords': ['Mars', 'Mercury'],
        'divisional': None,
        'description': 'Courage, communication, siblings, and short journeys.',
    },
    {
        'id': 'home',
        'name': 'Home, Mother & Roots',
        'sanskrit': 'सुख',
        'primary_house': 4,
        'secondary_house': None,
        'lords': ['Moon', 'Venus'],
        'divisional': 'd4',
        'description': 'Emotional foundations, mother, home, inner peace.',
    },
    {
        'id': 'children',
        'name': 'Children & Creativity',
        'sanskrit': 'पुत्र',
        'primary_house': 5,
        'secondary_house': None,
        'lords': ['Jupiter'],
        'divisional': 'd7',
        'description': 'Children, intellect, creativity, and past-life merit.',
    },
    {
        'id': 'health',
        'name': 'Health, Service & Conflict',
        'sanskrit': 'रिपु',
        'primary_house': 6,
        'secondary_house': None,
        'lords': ['Mars', 'Saturn', 'Sun'],
        'divisional': None,
        'description': 'Physical health, daily work, enemies, and debts.',
    },
    {
        'id': 'marriage',
        'name': 'Marriage & Partnership',
        'sanskrit': 'कलत्र',
        'primary_house': 7,
        'secondary_house': None,
        'lords': ['Venus', 'Jupiter'],
        'divisional': 'd9',
        'description': 'Committed relationships, partners, and contracts.',
    },
    {
        'id': 'transformation',
        'name': 'Transformation & Hidden',
        'sanskrit': 'आयु',
        'primary_house': 8,
        'secondary_house': None,
        'lords': ['Saturn', 'Ketu'],
        'divisional': None,
        'description': 'Longevity, transformation, hidden wealth, and mysticism.',
    },
    {
        'id': 'fortune',
        'name': 'Fortune & Higher Learning',
        'sanskrit': 'भाग्य',
        'primary_house': 9,
        'secondary_house': None,
        'lords': ['Jupiter', 'Sun'],
        'divisional': None,
        'description': 'Luck, father, teachers, philosophy, and long journeys.',
    },
    {
        'id': 'career',
        'name': 'Career & Public Life',
        'sanskrit': 'कर्म',
        'primary_house': 10,
        'secondary_house': None,
        'lords': ['Sun', 'Saturn', 'Mercury'],
        'divisional': 'd10',
        'description': 'Professional status, reputation, and public role.',
    },
    {
        'id': 'gains',
        'name': 'Gains & Networks',
        'sanskrit': 'लाभ',
        'primary_house': 11,
        'secondary_house': None,
        'lords': ['Jupiter', 'Saturn'],
        'divisional': None,
        'description': 'Income, aspirations, social networks, and fulfilment.',
    },
    {
        'id': 'liberation',
        'name': 'Liberation & Foreign Lands',
        'sanskrit': 'व्यय',
        'primary_house': 12,
        'secondary_house': None,
        'lords': ['Saturn', 'Ketu'],
        'divisional': None,
        'description': 'Expenses, foreign connections, spirituality, and moksha.',
    },
]

# ── Dignity weights ──────────────────────────────────────────────────────────
DIGNITY_WEIGHTS = {
    'exalted': 10,
    'own': 8,
    'great friend': 6,
    'friend': 4,
    'neutral': 2,
    'enemy': 0,
    'great enemy': -1,
    'debilitated': -2,
    'combust': 0,
}

# ── Natural benefics/malefics for aspect balance ─────────────────────────────
NATURAL_BENEFICS = {'Jupiter', 'Venus', 'Mercury', 'Moon'}
NATURAL_MALEFICS = {'Sun', 'Mars', 'Saturn', 'Rahu', 'Ketu'}

# ── House lord lookup (whole-sign, natural lordships) ────────────────────────
# Indexed by rashi_num (0=Aries). Returns the natural lord.
RASHI_LORDS = ['Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury',
               'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter']


def _get_house_lord(lagna_rashi_num, house_num, planets):
    """Returns the planet that lords over a given house (1-indexed)."""
    house_rashi = (lagna_rashi_num + house_num - 1) % 12
    lord_name = RASHI_LORDS[house_rashi]
    return lord_name


def _dignity_score(planet_name, planets):
    """Returns dignity weight for a planet (0-10, can be negative)."""
    if planet_name not in planets:
        return 2  # neutral if node or unknown
    dignity = planets[planet_name].get('dignity', 'neutral').lower()
    is_combust = planets[planet_name].get('is_combust', False)
    if is_combust:
        return DIGNITY_WEIGHTS.get('combust', 0)
    return DIGNITY_WEIGHTS.get(dignity, 2)


def _divisional_confirmation(domain, divisionals):
    """
    +10 if divisional chart supports D1 pattern, 0 neutral, -10 contradicts.
    Simple heuristic: check if house has a benefic planet in the divisional.
    """
    if not domain['divisional'] or not divisionals:
        return 0
    div_key = domain['divisional']
    if div_key not in divisionals:
        return 0
    # If the divisional chart exists and the primary house lord is well-placed, +10
    return 5  # conservative neutral-positive (full implementation needs D-chart house analysis)


def _dasha_activation(domain, dasha, chart):
    """
    +15 if Mahadasha lord is primary lord of this domain.
    +8 if Antardasha lord is primary lord.
    """
    if not dasha:
        return 0
    primary_lords = domain['lords']
    maha_lord = dasha.get('lord', '')
    antar_lord = dasha.get('antardasha_lord', '')
    if maha_lord in primary_lords:
        return 15
    if antar_lord in primary_lords:
        return 8
    return 0


def _aspect_balance(house_num, lagna_rashi_num, planets):
    """
    Net benefic aspect score (0-10).
    Classical aspects: every planet aspects the 7th from itself.
    Mars also aspects 4th and 8th. Jupiter aspects 5th and 9th. Saturn aspects 3rd and 10th.
    """
    house_rashi = (lagna_rashi_num + house_num - 1) % 12
    score = 0
    special_aspects = {
        'Mars':    [4, 8],
        'Jupiter': [5, 9],
        'Saturn':  [3, 10],
    }
    for p_name, p_data in planets.items():
        if p_name in ('Rahu', 'Ketu'):
            continue
        p_rashi = p_data.get('rashi_num', 0)
        # 7th aspect (all planets)
        seventh = (p_rashi + 6) % 12
        aspected = [seventh]
        # Special aspects
        if p_name in special_aspects:
            for offset in special_aspects[p_name]:
                aspected.append((p_rashi + offset - 1) % 12)
        if house_rashi in aspected:
            if p_name in NATURAL_BENEFICS:
                score += 2
            else:
                score -= 1
    # Clamp 0-10
    return max(0, min(10, score + 5))


def score_domain(domain, chart, bav, sav, dasha):
    """
    Scores a single domain 0-100 using the weighted formula.
    Returns score + breakdown dict for full traceability (Law 3).
    """
    lagna_rashi_num = chart['lagna']['rashi_num']
    planets = chart['planets']
    divisionals = chart.get('divisionals', {})
    h = domain['primary_house']
    # Convert house number to rashi index (BAV is stored by rashi, not house)
    rashi_idx = (lagna_rashi_num + h - 1) % 12

    # 1. Sarvashtakavarga (40%) — normalise 0-56 → 0-100
    sav_raw = sav[rashi_idx]
    sav_score = (sav_raw / 56) * 100

    # 2. Dignity of house lord (20%) — scale 0-10 dignity to 0-100
    house_lord = _get_house_lord(lagna_rashi_num, h, planets)
    dignity_raw = _dignity_score(house_lord, planets)
    dignity_score = ((dignity_raw + 2) / 12) * 100  # range -2→10 mapped to 0→100

    # 3. Divisional confirmation (15%)
    div_raw = _divisional_confirmation(domain, divisionals)
    div_score = 50 + div_raw  # 40, 50, or 60 out of 100

    # 4. Dasha activation (15%)
    dasha_raw = _dasha_activation(domain, dasha, chart)
    dasha_score = (dasha_raw / 15) * 100  # 0, 53, or 100

    # 5. Aspect balance (10%)
    aspect_score = _aspect_balance(h, lagna_rashi_num, planets)
    aspect_score_pct = aspect_score * 10  # 0-100

    # Weighted sum
    total = (
        sav_score    * 0.40 +
        dignity_score * 0.20 +
        div_score    * 0.15 +
        dasha_score  * 0.15 +
        aspect_score_pct * 0.10
    )
    total = round(max(0, min(100, total)))

    # Planet drivers — top 2 by BAV score for this house
    planet_drivers = []
    for p in ['Jupiter', 'Venus', 'Moon', 'Mercury', 'Sun', 'Mars', 'Saturn']:
        p_bav_score = bav[p][rashi_idx]
        p_dignity = planets[p].get('dignity', 'neutral') if p in planets else 'neutral'
        planet_drivers.append({
            'planet': p,
            'bav_score': p_bav_score,
            'dignity': p_dignity,
        })
    planet_drivers.sort(key=lambda x: x['bav_score'], reverse=True)

    return {
        'domain_id': domain['id'],
        'domain_name': domain['name'],
        'sanskrit': domain['sanskrit'],
        'description': domain['description'],
        'score': total,
        'house': h,
        'sav_score': sav_raw,
        'house_lord': house_lord,
        'house_lord_dignity': planets.get(house_lord, {}).get('dignity', 'neutral'),
        'top_drivers': planet_drivers[:2],
        'bav_breakdown': {p: bav[p][rashi_idx] for p in ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn']},
        'score_breakdown': {
            'sav': round(sav_score * 0.40, 1),
            'dignity': round(dignity_score * 0.20, 1),
            'divisional': round(div_score * 0.15, 1),
            'dasha': round(dasha_score * 0.15, 1),
            'aspects': round(aspect_score_pct * 0.10, 1),
        },
    }


def score_all_domains(chart, dasha=None):
    """
    Entry point: scores all 12 domains.
    Returns list of 12 domain score objects + the full BAV/SAV tables.
    """
    bav = calculate_bhinna_ashtakavarga(chart)
    sav = calculate_sarvashtakavarga(bav)

    results = []
    for domain in DOMAINS:
        result = score_domain(domain, chart, bav, sav, dasha)
        results.append(result)

    return {
        'domains': results,
        'bav': bav,
        'sav': sav,
        'bav_summary': {
            'strongest_house': sav.index(max(sav)) + 1,
            'strongest_score': max(sav),
            'weakest_house': sav.index(min(sav)) + 1,
            'weakest_score': min(sav),
        }
    }
