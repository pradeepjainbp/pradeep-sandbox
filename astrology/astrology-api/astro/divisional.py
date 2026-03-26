# astro/divisional.py

from .chart import RASHI_NAMES, RASHI_SANSKRIT

def calculate_d9(longitude):
    """
    Computes D9 Navamsha sign for a given sidereal longitude.
    Each sign is divided into 9 parts of 3 degrees 20 minutes (3.333333... degrees).
    """
    sign_num = int(longitude / 30)
    degree = longitude % 30
    part = int(degree / (30 / 9)) # 0 to 8
    
    # Parashari Rule for Navamsha mapping
    if sign_num in [0, 4, 8]: # Aries, Leo, Sagittarius (Fiery signs)
        navamsha_sign = (0 + part) % 12
    elif sign_num in [1, 5, 9]: # Taurus, Virgo, Capricorn (Earthy signs)
        navamsha_sign = (9 + part) % 12
    elif sign_num in [2, 6, 10]: # Gemini, Libra, Aquarius (Airy signs)
        navamsha_sign = (6 + part) % 12
    else: # Cancer, Scorpio, Pisces (Watery signs)
        navamsha_sign = (3 + part) % 12
        
    return {
        'rashi_num': navamsha_sign,
        'rashi': RASHI_NAMES[navamsha_sign],
        'rashi_sanskrit': RASHI_SANSKRIT[navamsha_sign]
    }

def calculate_divisionals(chart_data):
    """
    Populate divisional chart data into the chart_data object.
    Includes D2, D7, D9, D10 mappings for all planets + Lagna.
    """
    div_data = {
        'lagna': {},
        'planets': {}
    }
    
    # D9 Lagna
    div_data['lagna']['D9'] = calculate_d9(chart_data['lagna']['longitude'])
    
    for planet_name, p_data in chart_data['planets'].items():
        div_data['planets'][planet_name] = {
            'D9': calculate_d9(p_data['longitude'])
            # Placeholders for D2, D7, D10
        }
    
    chart_data['divisionals'] = div_data
    return chart_data
