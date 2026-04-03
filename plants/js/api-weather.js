/* ═══════════════════════════════════════════════════════
   api-weather.js
   Open-Meteo ERA5 climate normals fetcher
   Returns structured 12-month climate averages
   Free API, no key required
   ═══════════════════════════════════════════════════════ */

'use strict';

const WeatherAPI = (() => {

  // ERA5 historical archive endpoint (correct API for past data)
  const BASE_URL = 'https://archive-api.open-meteo.com/v1/archive';

  // Valid ERA5 daily variables (relative_humidity not available as daily aggregate)
  const VARIABLES = [
    'temperature_2m_mean',
    'temperature_2m_max',
    'temperature_2m_min',
    'precipitation_sum',
    'et0_fao_evapotranspiration',
  ].join(',');

  // ─── Main fetch function ───────────────────────────────
  async function getClimateData(lat, lon) {
    // Use 2 recent years — enough for monthly averages, small enough to be fast
    const params = new URLSearchParams({
      latitude:   lat,
      longitude:  lon,
      start_date: '2022-01-01',
      end_date:   '2023-12-31',
      daily:      VARIABLES,
      timezone:   'auto',
    });

    const res = await fetch(`${BASE_URL}?${params}`);
    if (!res.ok) throw new Error(`Open-Meteo error: ${res.status}`);

    const raw = await res.json();
    return processClimateData(raw);
  }

  // ─── Process raw daily data into monthly averages ──────
  function processClimateData(raw) {
    if (!raw?.daily?.time) return buildFallbackClimate();

    const { time, ...vars } = raw.daily;
    const months = Array.from({ length: 12 }, () => ({}));

    // Accumulate daily values by month
    time.forEach((dateStr, i) => {
      const month = parseInt(dateStr.slice(5, 7), 10) - 1; // 0-indexed
      for (const [key, values] of Object.entries(vars)) {
        if (values[i] == null) return;
        if (!months[month][key]) months[month][key] = { sum: 0, count: 0 };
        months[month][key].sum   += values[i];
        months[month][key].count += 1;
      }
    });

    // Build monthly averages / sums
    const result = {};
    for (const [key, _] of Object.entries(vars)) {
      result[key] = months.map(m => {
        if (!m[key] || m[key].count === 0) return null;
        const avg = m[key].sum / m[key].count;
        // precipitation and ET are sums per day — multiply by ~days in month (30.4)
        if (key === 'precipitation_sum' || key === 'et0_fao_evapotranspiration') {
          return parseFloat((avg * 30.4).toFixed(1));
        }
        return parseFloat(avg.toFixed(1));
      });
    }

    // Derived fields
    result.annual_rainfall_mm = result.precipitation_sum
      ?.reduce((a, b) => a + (b || 0), 0)?.toFixed(0) ?? null;

    return result;
  }

  // ─── Fallback if API fails (rough global average) ──────
  function buildFallbackClimate() {
    return {
      temperature_2m_mean:        Array(12).fill(25),
      temperature_2m_max:         Array(12).fill(30),
      temperature_2m_min:         Array(12).fill(20),
      precipitation_sum:          [20,20,30,40,60,100,120,110,80,50,30,20],
      et0_fao_evapotranspiration: Array(12).fill(110),
      annual_rainfall_mm:         '680',
      _fallback: true,
    };
  }

  // ─── Public API ───────────────────────────────────────
  return { getClimateData };

})();
