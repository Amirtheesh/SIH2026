from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.v1.api import api_router
from app.api.v1.date_lookup import router as date_lookup_router
import asyncio
from contextlib import asynccontextmanager
from app.db.session import engine, Base
import app.models  # Register models with Base
from app.api.v1.ws import broadcast_live_updates
from app.tasks.scheduler import start_scheduler, scheduler

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure database tables exist
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    # Start background tasks
    task = asyncio.create_task(broadcast_live_updates())
    start_scheduler()
    yield
    task.cancel()
    scheduler.shutdown()


app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    description="Backend API for AI-Powered Electricity Demand Forecasting System",
    lifespan=lifespan
)


# CORS configuration for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Welcome to the GridForecaster API. Visit /docs for the interactive documentation."}

@app.get("/health")
async def health_check():
    return {"status": "ok"}

app.include_router(api_router, prefix=settings.API_V1_STR)
app.include_router(date_lookup_router, prefix="/api/date-lookup")
