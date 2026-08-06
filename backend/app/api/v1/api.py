from fastapi import APIRouter
from app.api.v1 import auth, forecast, weather, events, alerts, ws, admin

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(forecast.router, prefix="/forecast", tags=["forecast"])
api_router.include_router(weather.router, prefix="/weather", tags=["weather"])
api_router.include_router(events.router, prefix="/events", tags=["events"])
api_router.include_router(alerts.router, prefix="/alerts", tags=["alerts"])
api_router.include_router(ws.router, prefix="/ws", tags=["websocket"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
