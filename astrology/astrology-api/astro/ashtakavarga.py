# astro/ashtakavarga.py

# Ashtakavarga rules based on Brihat Parashara Hora Shastra

def calculate_bhinna_ashtakavarga(chart_data):
    """
    Computes Bhinna Ashtakavarga (BAV) for the 7 classical planets.
    Returns a dict with planets as keys and lists of 12 integers representing the score per house.
    """
    bav = {}
    planets = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn']

    # For now, we stub this out with a neutral 4/8 across the board
    # True implementation requires the 336-rule matrix mappings.
    for current_planet in planets:
        bav[current_planet] = [4] * 12

    return bav

def calculate_sarvashtakavarga(bav_data):
    """
    Computes Sarvashtakavarga (SAV) by summing the BAV scores for each house.
    Returns a list of 12 integers mapping to Houses 1-12.
    """
    sav = [0] * 12
    planets = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn']
    
    for p in planets:
        for house_idx in range(12):
            sav[house_idx] += bav_data[p][house_idx]
            
    return sav
