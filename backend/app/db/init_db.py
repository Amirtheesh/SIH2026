"""
Database seeder: creates default Admin and Operator accounts for development.

Run inside the Docker container or locally:
    docker exec -it sih2026-api-1 python -m app.db.init_db

Or locally (with the virtualenv active):
    python -m app.db.init_db
"""
import asyncio
from sqlalchemy.future import select
from app.db.session import AsyncSessionLocal
from app.models.user import User
from app.core.security import get_password_hash

SEED_USERS = [
    {
        "name": "Admin User",
        "email": "admin@grid.com",
        "password": "Admin@123",
        "role": "admin",
    },
    {
        "name": "Operator User",
        "email": "operator@grid.com",
        "password": "Operator@123",
        "role": "operator",
    },
]

async def seed():
    async with AsyncSessionLocal() as db:
        for user_data in SEED_USERS:
            result = await db.execute(select(User).where(User.email == user_data["email"]))
            existing = result.scalars().first()
            if existing:
                print(f"[seed] User already exists: {user_data['email']} — skipping.")
                continue

            user = User(
                name=user_data["name"],
                email=user_data["email"],
                password_hash=get_password_hash(user_data["password"]),
                role=user_data["role"],
            )
            db.add(user)
            print(f"[seed] Created user: {user_data['email']} (role={user_data['role']})")

        await db.commit()
        print("[seed] Done.")

if __name__ == "__main__":
    asyncio.run(seed())
