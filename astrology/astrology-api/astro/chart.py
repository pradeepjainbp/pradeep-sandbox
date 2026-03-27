import os
import math
from datetime import datetime
import pytz
import swisseph as swe

# Constants for Grahas (the 9 planets)
PLANETS = {
    'Sun': swe.SUN,
    'Moon': swe.MOON,
    'Mars': swe.MARS,
    'Mercury': swe.MERCURY,
    'Jupiter': swe.JUPITER,
    'Venus': swe.VENUS,
    'Saturn': swe.SATURN,
    'Rahu': swe.TRUE_NODE, # Must use TRUE_NODE as per Master Prompt
    'Ketu': None # Computed as Rahu + 180
}

RASHI_NAMES = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
               "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"]

# ── Dignity tables ─────────────────────────────────────────────────────────────
# Exaltation rashi (0-indexed)
_EXALTATION = {'Sun': 0, 'Moon': 1, 'Mars': 9, 'Mercury': 5, 'Jupiter': 3, 'Venus': 11, 'Saturn': 6}
# Debilitation rashi
_DEBILITATION = {'Sun': 6, 'Moon': 7, 'Mars': 3, 'Mercury': 11, 'Jupiter': 9, 'Venus': 5, 'Saturn': 0}
# Own signs (swakshetra)
_OWN = {'Sun': [4], 'Moon': [3], 'Mars': [0, 7], 'Mercury': [2, 5], 'Jupiter': [8, 11], 'Venus': [1, 6], 'Saturn': [9, 10]}
# Rashi lords (for friendship determination)
_RASHI_LORDS = ['Mars','Venus','Mercury','Moon','Sun','Mercury','Venus','Mars','Jupiter','Saturn','Saturn','Jupiter']
# Natural permanent friendships
_FRIENDS  = {'Sun': {'Moon','Mars','Jupiter'}, 'Moon': {'Sun','Mercury'}, 'Mars': {'Sun','Moon','Jupiter'},
             'Mercury': {'Sun','Venus'}, 'Jupiter': {'Sun','Moon','Mars'}, 'Venus': {'Mercury','Saturn'}, 'Saturn': {'Mercury','Venus'}}
_ENEMIES  = {'Sun': {'Venus','Saturn'}, 'Moon': set(), 'Mars': {'Mercury'}, 'Mercury': {'Moon'},
             'Jupiter': {'Mercury','Venus'}, 'Venus': {'Sun','Moon'}, 'Saturn': {'Sun','Moon','Mars'}}

def _compute_dignity(planet_name: str, rashi_num: int) -> str:
    if planet_name in ('Rahu', 'Ketu'):
        return 'neutral'
    if rashi_num == _EXALTATION.get(planet_name):
        return 'exalted'
    if rashi_num in _OWN.get(planet_name, []):
        return 'own'
    if rashi_num == _DEBILITATION.get(planet_name):
        return 'debilitated'
    lord = _RASHI_LORDS[rashi_num]
    if lord == planet_name:
        return 'own'
    if lord in _FRIENDS.get(planet_name, set()):
        return 'friend'
    if lord in _ENEMIES.get(planet_name, set()):
        return 'enemy'
    return 'neutral'

RASHI_SANSKRIT = ["Mesha", "Vrishabha", "Mithuna", "Karka", "Simha", "Kanya",
                  "Tula", "Vrishchika", "Dhanu", "Makara", "Kumbha", "Meena"]

NAKSHATRAS = [
    "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra", 
    "Punarvasu", "Pushya", "Ashlesha", "Magha", "Purva Phalguni", "Uttara Phalguni", 
    "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha", 
    "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishta", "Shatabhisha", 
    "Purva Bhadrapada", "Uttara Bhadrapada", "Revati"
]

def init_ephe():
    """Initialize Swiss Ephemeris configuration."""
    ephe_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'ephe')
    if os.path.exists(ephe_path):
        swe.set_ephe_path(ephe_path)
    
    # CRITICAL: Always use Lahiri Ayanamsha for Vedic calculations
    swe.set_sid_mode(swe.SIDM_LAHIRI)

def calculate_chart(year: int, month: int, day: int, hour: int, minute: int, lat: float, lon: float, timezone_str: str):
    init_ephe()
    
    # Sub-arcsecond accuracy step: Convert local time to UTC first using pytz
    local_tz = pytz.timezone(timezone_str)
    local_dt = datetime(year, month, day, hour, minute)
    utc_dt = local_tz.localize(local_dt).astimezone(pytz.utc)
    
    # Calculate Julian Day in UT
    jd_ut = swe.julday(utc_dt.year, utc_dt.month, utc_dt.day, utc_dt.hour + utc_dt.minute/60.0)
    
    # Calculate Ascendant (Lagna) - Using Placidus 'P' for Bhava Chalit
    cusps, ascmc = swe.houses(jd_ut, lat, lon, b'P')
    ayanamsa = swe.get_ayanamsa(jd_ut)
    asc_tropical = ascmc[0]
    asc_sidereal = (asc_tropical - ayanamsa) % 360
    asc_rashi_num = int(asc_sidereal / 30)
    
    # Check if Lagna is within 3 degrees of a sign boundary (Lagna Sensitivity Flag)
    degree_in_rashi_asc = asc_sidereal % 30
    lagna_sensitivity = (degree_in_rashi_asc < 3.0) or (degree_in_rashi_asc > 27.0)
    
    chart_data = {
        'metadata': {
            'jd': jd_ut,
            'ayanamsa': ayanamsa,
            'lagna_sensitivity_flag': lagna_sensitivity
        },
        'lagna': {
            'longitude': asc_sidereal,
            'rashi_num': asc_rashi_num,
            'rashi': RASHI_NAMES[asc_rashi_num],
            'rashi_sanskrit': RASHI_SANSKRIT[asc_rashi_num],
            'degree': degree_in_rashi_asc
        },
        'planets': {}
    }
    
    flags = swe.FLG_SIDEREAL | swe.FLG_SPEED
    
    for name, swe_id in PLANETS.items():
        if name == 'Ketu':
            rahu_lon = chart_data['planets']['Rahu']['longitude']
            ketu_lon = (rahu_lon + 180) % 360
            speed = chart_data['planets']['Rahu']['speed']
            rashi_num = int(ketu_lon / 30)
            deg_in_rashi = ketu_lon % 30
            nakshatra_num = int(ketu_lon / (360/27))
            pada = int((ketu_lon % (360/27)) / (360/108)) + 1
            
            chart_data['planets']['Ketu'] = {
                'longitude': ketu_lon,
                'speed': speed,
                'is_retrograde': speed < 0,
                'rashi_num': rashi_num,
                'rashi': RASHI_NAMES[rashi_num],
                'rashi_sanskrit': RASHI_SANSKRIT[rashi_num],
                'degree': deg_in_rashi,
                'nakshatra': NAKSHATRAS[nakshatra_num],
                'nakshatra_num': nakshatra_num,
                'pada': pada,
                'dignity': 'neutral',
            }
            continue

        pos, ret = swe.calc_ut(jd_ut, swe_id, flags)
        longitude = pos[0]
        speed = pos[3]
        rashi_num = int(longitude / 30)
        deg_in_rashi = longitude % 30
        nakshatra_num = int(longitude / (360/27))
        pada = int((longitude % (360/27)) / (360/108)) + 1
        
        chart_data['planets'][name] = {
            'longitude': longitude,
            'speed': speed,
            'is_retrograde': speed < 0,
            'rashi_num': rashi_num,
            'rashi': RASHI_NAMES[rashi_num],
            'rashi_sanskrit': RASHI_SANSKRIT[rashi_num],
            'degree': deg_in_rashi,
            'nakshatra': NAKSHATRAS[nakshatra_num],
            'nakshatra_num': nakshatra_num,
            'pada': pada,
            'dignity': _compute_dignity(name, rashi_num),
        }
        
    sun_lon = chart_data['planets']['Sun']['longitude']
    combust_orbs = {'Moon': 12, 'Mars': 17, 'Mercury': 14, 'Jupiter': 11, 'Venus': 10, 'Saturn': 15}
    for name in combust_orbs.keys():
        p_lon = chart_data['planets'][name]['longitude']
        dist = abs(sun_lon - p_lon)
        if dist > 180: dist = 360 - dist
        chart_data['planets'][name]['is_combust'] = (dist <= combust_orbs[name])
        
    for name in ['Sun', 'Rahu', 'Ketu']:
        chart_data['planets'][name]['is_combust'] = False

    for name in PLANETS.keys():
        p_rashi = chart_data['planets'][name]['rashi_num']
        chart_data['planets'][name]['house'] = (p_rashi - asc_rashi_num) % 12 + 1
        
    return chart_data
