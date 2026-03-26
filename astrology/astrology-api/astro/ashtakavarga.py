# astro/ashtakavarga.py
# Full Ashtakavarga implementation per Brihat Parashara Hora Shastra
# Each planet's favorable houses are counted FROM each voter's natal position.
# Voters: Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn, Lagna (8 voters)
# Rahu and Ketu do NOT participate as voters or receive standard BAV.

# For each planet (key), for each voter (inner key):
# The list of house offsets (1-indexed from voter's position) that are FAVORABLE.
# offset 1 = same house as voter, offset 2 = next house, etc.

BAV_RULES = {
    'Sun': {
        'Sun':     [1, 2, 4, 7, 8, 9, 10, 11],
        'Moon':    [3, 6, 10, 11],
        'Mars':    [1, 2, 4, 7, 8, 9, 10, 11],
        'Mercury': [3, 5, 6, 9, 10, 11, 12],
        'Jupiter': [5, 6, 9, 11],
        'Venus':   [6, 7, 12],
        'Saturn':  [1, 2, 4, 7, 8, 9, 10, 11],
        'Lagna':   [3, 4, 6, 10, 11, 12],
    },
    'Moon': {
        'Sun':     [3, 6, 7, 8, 10, 11],
        'Moon':    [1, 3, 6, 7, 10, 11],
        'Mars':    [2, 3, 5, 6, 9, 10, 11],
        'Mercury': [1, 3, 4, 5, 7, 8, 10, 11],
        'Jupiter': [1, 4, 7, 8, 10, 11, 12],
        'Venus':   [3, 4, 5, 7, 9, 10, 11],
        'Saturn':  [3, 5, 6, 11],
        'Lagna':   [3, 6, 10, 11],
    },
    'Mars': {
        'Sun':     [3, 5, 6, 10, 11],
        'Moon':    [3, 6, 11],
        'Mars':    [1, 2, 4, 7, 8, 10, 11],
        'Mercury': [3, 5, 6, 11],
        'Jupiter': [6, 10, 11, 12],
        'Venus':   [6, 8, 11, 12],
        'Saturn':  [1, 4, 7, 8, 9, 10, 11],
        'Lagna':   [1, 3, 6, 10, 11],
    },
    'Mercury': {
        'Sun':     [5, 6, 9, 11, 12],
        'Moon':    [2, 4, 6, 8, 10, 11],
        'Mars':    [1, 2, 4, 7, 8, 9, 10, 11],
        'Mercury': [1, 3, 5, 6, 9, 10, 11, 12],
        'Jupiter': [6, 8, 11, 12],
        'Venus':   [1, 2, 3, 4, 5, 8, 9, 11],
        'Saturn':  [1, 2, 4, 7, 8, 9, 10, 11],
        'Lagna':   [1, 2, 4, 6, 8, 10, 11],
    },
    'Jupiter': {
        'Sun':     [1, 2, 3, 4, 7, 8, 9, 10, 11],
        'Moon':    [2, 5, 7, 9, 11],
        'Mars':    [1, 2, 4, 7, 8, 10, 11],
        'Mercury': [1, 2, 4, 5, 6, 9, 10, 11],
        'Jupiter': [1, 2, 3, 4, 7, 8, 10, 11],
        'Venus':   [2, 5, 6, 9, 10, 11],
        'Saturn':  [3, 5, 6, 12],
        'Lagna':   [1, 2, 4, 5, 6, 7, 9, 10, 11],
    },
    'Venus': {
        'Sun':     [8, 11, 12],
        'Moon':    [1, 2, 3, 4, 5, 8, 9, 11, 12],
        'Mars':    [3, 4, 6, 9, 11, 12],
        'Mercury': [3, 5, 6, 9, 11],
        'Jupiter': [5, 8, 9, 10, 11],
        'Venus':   [1, 2, 3, 4, 5, 8, 9, 10, 11],
        'Saturn':  [3, 4, 5, 8, 9, 10, 11],
        'Lagna':   [1, 2, 3, 4, 5, 8, 9, 11],
    },
    'Saturn': {
        'Sun':     [1, 2, 4, 7, 8, 10, 11],
        'Moon':    [3, 6, 11],
        'Mars':    [3, 5, 6, 10, 11, 12],
        'Mercury': [6, 8, 9, 10, 11, 12],
        'Jupiter': [5, 6, 11, 12],
        'Venus':   [6, 11, 12],
        'Saturn':  [3, 5, 6, 11],
        'Lagna':   [1, 3, 4, 6, 10, 11],
    },
}

CLASSICAL_PLANETS = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn']


def calculate_bhinna_ashtakavarga(chart_data):
    """
    Computes Bhinna Ashtakavarga (BAV) for the 7 classical planets.
    Returns dict: { planet: [score_h1, score_h2, ... score_h12] }
    Scores are indexed 0-11 for houses 1-12.
    """
    # Get voter positions (rashi_num, 0-indexed 0=Aries...11=Pisces)
    voter_positions = {}
    for p in CLASSICAL_PLANETS:
        voter_positions[p] = chart_data['planets'][p]['rashi_num']
    voter_positions['Lagna'] = chart_data['lagna']['rashi_num']

    bav = {}
    for planet in CLASSICAL_PLANETS:
        scores = [0] * 12
        rules = BAV_RULES[planet]
        for voter, offsets in rules.items():
            voter_pos = voter_positions[voter]
            for offset in offsets:
                # offset is 1-indexed: offset 1 = voter's own house
                target = (voter_pos + offset - 1) % 12
                scores[target] += 1
        bav[planet] = scores

    return bav


def calculate_sarvashtakavarga(bav_data):
    """
    Sarvashtakavarga: sum of all 7 planets' BAV scores per house.
    Returns list of 12 integers (max 56 per house).
    """
    sav = [0] * 12
    for planet in CLASSICAL_PLANETS:
        for i in range(12):
            sav[i] += bav_data[planet][i]
    return sav


def get_planet_score_for_house(bav_data, planet, house_num):
    """
    Returns a planet's BAV score for a given house (1-indexed).
    """
    return bav_data[planet][house_num - 1]


def get_ashtakavarga_summary(bav_data, sav_data):
    """
    Returns a human-readable summary: strongest and most challenged houses.
    """
    max_score = max(sav_data)
    min_score = min(sav_data)
    strongest_house = sav_data.index(max_score) + 1
    weakest_house = sav_data.index(min_score) + 1
    return {
        'strongest_house': strongest_house,
        'strongest_score': max_score,
        'weakest_house': weakest_house,
        'weakest_score': min_score,
    }
