from apscheduler.schedulers.asyncio import AsyncIOScheduler
from app.services.weather_service import weather_service
from app.services.prediction_service import prediction_service

scheduler = AsyncIOScheduler()

async def fetch_weather_task():
    """Periodically cache weather data for regions"""
    regions = ["northern", "southern", "western", "eastern", "national"]
    for region in regions:
        # get_current_weather caches internally if called
        await weather_service.get_current_weather(region)
        print(f"[Scheduler] Fetched weather for {region}")

async def retrain_model_task():
    """Triggered weekly to retrain model on new data"""
    from app.services.admin_service import admin_service
    from app.db.session import AsyncSessionLocal
    
    async with AsyncSessionLocal() as db:
        await admin_service.trigger_retrain(db)
        print("[Scheduler] Automated weekly retrain completed")

def start_scheduler():
    if not scheduler.running:
        # Weather every 15 mins
        scheduler.add_job(fetch_weather_task, 'interval', minutes=15)
        # Retrain every week on Sunday night
        scheduler.add_job(retrain_model_task, 'cron', day_of_week='sun', hour=2, minute=0)
        scheduler.start()
        print("[Scheduler] APScheduler started.")
