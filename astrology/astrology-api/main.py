from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from astro.chart import calculate_chart
from astro.dasha import calculate_dasha_at_birth
from astro.divisional import calculate_divisionals
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
    
    return chart

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
