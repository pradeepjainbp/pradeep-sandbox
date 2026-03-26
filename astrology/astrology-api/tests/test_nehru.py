import pytest
import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from astro.chart import calculate_chart

def test_nehru_chart_basic():
    # Nehru's chart: 14 Nov 1889, 11:00 PM IST, Allahabad (25.4358°N, 81.8463°E)
    year = 1889
    month = 11
    day = 14
    hour = 23
    minute = 0
    lat = 25.4358
    lon = 81.8463
    tz = 'Asia/Kolkata'
    
    chart = calculate_chart(year, month, day, hour, minute, lat, lon, tz)
    
    # 1. Lagna: Karka (Cancer)
    assert chart['lagna']['rashi'] == 'Cancer', f"Lagna expected Cancer, got {chart['lagna']['rashi']}"
    
    # 2. Moon: Makara (Capricorn), Nakshatra: Shravana
    assert chart['planets']['Moon']['rashi'] == 'Capricorn', f"Moon expected Capricorn, got {chart['planets']['Moon']['rashi']}"
    assert chart['planets']['Moon']['nakshatra'] == 'Shravana', f"Moon Nakshatra expected Shravana, got {chart['planets']['Moon']['nakshatra']}"
    
    # 3. Sun: Vrishchika (Scorpio)
    assert chart['planets']['Sun']['rashi'] == 'Scorpio', f"Sun expected Scorpio, got {chart['planets']['Sun']['rashi']}"
    
    # Dasha expected: Moon Mahadasha (will test in a separate file or function once dasha.py is written)
