from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
from astro.chart import calculate_chart
from astro.dasha import calculate_dasha_at_birth, calculate_full_dasha_timeline
from astro.divisional import calculate_divisionals
from astro.domains import score_all_domains
from astro.council import planet_speak, planet_debate
from geopy.geocoders import Nominatim
from timezonefinder import TimezoneFinder

app = FastAPI(title="Jyotish API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChartRequest(BaseModel):
    year: int
    month: int
    day: int
    hour: int
    minute: int
    lat: float
    lon: float
    timezone: str

@app.post("/api/chart/compute")
def compute_chart(req: ChartRequest):
    chart = calculate_chart(req.year, req.month, req.day, req.hour, req.minute, req.lat, req.lon, req.timezone)
    chart = calculate_divisionals(chart)

    moon_lon = chart['planets']['Moon']['longitude']
    chart['dasha'] = calculate_dasha_at_birth(moon_lon)
    chart['dasha_timeline'] = calculate_full_dasha_timeline(
        moon_lon, req.year, req.month, req.day
    )

    # Score all 12 domains + compute full Ashtakavarga tables
    domain_results = score_all_domains(chart, chart['dasha'])
    chart['domains'] = domain_results['domains']
    chart['bav'] = domain_results['bav']
    chart['sav'] = domain_results['sav']
    chart['bav_summary'] = domain_results['bav_summary']

    return chart

class SpeakRequest(BaseModel):
    planet: str
    chart: dict
    domain: str
    question: Optional[str] = None

class DebateRequest(BaseModel):
    planet_a: str
    planet_b: str
    chart: dict
    domain: str
    question: Optional[str] = None

@app.post("/api/planet/speak")
def speak(req: SpeakRequest):
    bav = req.chart.get('bav')
    def generate():
        for chunk in planet_speak(req.planet, req.chart, req.domain, req.question or '', bav):
            yield chunk
    return StreamingResponse(generate(), media_type="text/plain")

@app.post("/api/planet/debate")
def debate(req: DebateRequest):
    bav = req.chart.get('bav')
    resp_a, resp_b = planet_debate(req.planet_a, req.planet_b, req.chart, req.domain, req.question or '', bav)
    return {"planet_a": req.planet_a, "response_a": resp_a, "planet_b": req.planet_b, "response_b": resp_b}

@app.get("/api/geocode")
def geocode_city(city: str):
    try:
        geolocator = Nominatim(user_agent="jyotish_dashboard_app_pradeep")
        location = geolocator.geocode(city, timeout=10)
        if not location:
            return {"error": "City not found"}
        
        tf = TimezoneFinder()
        tz_str = tf.timezone_at(lng=location.longitude, lat=location.latitude)
        return {
            "lat": location.latitude,
            "lon": location.longitude,
            "timezone": tz_str
        }
    except Exception as e:
        import traceback
        return {"error": "Server exception", "details": str(e), "trace": traceback.format_exc()}
    
@app.get("/health")
def health_check():
    return {"status": "healthy"}
