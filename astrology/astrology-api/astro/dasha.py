# astro/dasha.py
# Vimshottari Dasha system — 120 year cycle, 9 Mahadashas, 9 Antardashas each

from datetime import date, timedelta

DASHA_SEQUENCE = [
    ("Ketu", 7), ("Venus", 20), ("Sun", 6), ("Moon", 10),
    ("Mars", 7), ("Rahu", 18), ("Jupiter", 16), ("Saturn", 19), ("Mercury", 17)
]
TOTAL_YEARS = 120
DAYS_PER_YEAR = 365.25


def calculate_dasha_at_birth(moon_longitude):
    """Returns the active Mahadasha lord and years remaining at birth.
    Used by domain scoring to weight dasha activation."""
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


def calculate_full_dasha_timeline(moon_longitude, birth_year, birth_month, birth_day):
    """
    Returns the full Vimshottari Dasha timeline as a list of 9 Mahadashas,
    each containing 9 Antardashas with real calendar dates.

    Timeline covers from the start of the birth Mahadasha to ~120 years later.
    Dates are ISO strings (YYYY-MM-DD).
    """
    nak_len = 360 / 27
    nak_num = int(moon_longitude / nak_len)
    deg_in_nak = moon_longitude % nak_len
    fraction_remaining = 1.0 - (deg_in_nak / nak_len)

    dasha_idx = nak_num % 9
    lord, period = DASHA_SEQUENCE[dasha_idx]
    years_elapsed = (1.0 - fraction_remaining) * period

    birth_date = date(birth_year, birth_month, birth_day)

    # Start of the first (active at birth) Mahadasha
    first_maha_start = birth_date - timedelta(days=years_elapsed * DAYS_PER_YEAR)

    mahadashas = []
    current_start = first_maha_start

    for i in range(9):
        idx = (dasha_idx + i) % 9
        m_lord, m_years = DASHA_SEQUENCE[idx]
        m_days = m_years * DAYS_PER_YEAR
        m_end = current_start + timedelta(days=m_days)

        # Build 9 Antardashas within this Mahadasha
        antardashas = []
        antar_start = current_start
        for j in range(9):
            a_idx = (idx + j) % 9
            a_lord, a_years = DASHA_SEQUENCE[a_idx]
            # Antardasha duration = (maha_years × antar_years) / 120
            a_duration_years = (m_years * a_years) / TOTAL_YEARS
            a_days = a_duration_years * DAYS_PER_YEAR
            a_end = antar_start + timedelta(days=a_days)

            antardashas.append({
                "lord": a_lord,
                "start": antar_start.isoformat(),
                "end": a_end.isoformat(),
                "years": round(a_duration_years, 2),
            })
            antar_start = a_end

        mahadashas.append({
            "lord": m_lord,
            "start": current_start.isoformat(),
            "end": m_end.isoformat(),
            "years": m_years,
            "antardashas": antardashas,
        })
        current_start = m_end

    return mahadashas
