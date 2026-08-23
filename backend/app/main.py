from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="AI Insider Threat Detection System",
    version="1.0.0"
)

# React frontend ko backend se connect karne ke liye
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {
        "message": "ITBIS Backend is running"
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy"
    }