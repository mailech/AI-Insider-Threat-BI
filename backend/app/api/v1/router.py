from fastapi import APIRouter

from app.api.v1 import activities, auth, dashboard, departments, devices, employees, users

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(departments.router)
api_router.include_router(employees.router)
api_router.include_router(devices.router)
api_router.include_router(activities.router)
api_router.include_router(dashboard.router)
