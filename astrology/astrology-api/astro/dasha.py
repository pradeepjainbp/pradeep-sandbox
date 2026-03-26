# astro/dasha.py

DASHA_SEQUENCE = [
    ("Ketu", 7), ("Venus", 20), ("Sun", 6), ("Moon", 10), 
    ("Mars", 7), ("Rahu", 18), ("Jupiter", 16), ("Saturn", 19), ("Mercury", 17)
]

def calculate_dasha_at_birth(moon_longitude):
    nak_len = 360 / 27 
    nak_num = int(moon_longitude / nak_len)
    deg_in_nak = moon_longitude % nak_len
    fraction_remaining = 1.0 - (deg_in_nak / nak_len)
    
    dasha_idx = nak_num % 9
    lord, period = DASHA_SEQUENCE[dasha_idx]
    years_remaining = fraction_remaining * period
    
    return {
        "lord": lord,
        "total_period_years": period,
        "years_remaining_at_birth": years_remaining
    }
