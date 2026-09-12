from fastapi import APIRouter, Depends, HTTPException
from app.auth import get_current_user
import pandas as pd
import os

router = APIRouter(
    prefix="/api/v1/analytics",
    tags=["Dataset Risk"]
)

BASE_DIR = os.path.dirname(
    os.path.dirname(
        os.path.dirname(
            os.path.abspath(__file__)
        )
    )
)

CSV_PATH = os.path.join(
    BASE_DIR,
    "data",
    "cert_r4_2",
    "behavioral_features.csv"
)


@router.get("/dataset-risk")
def get_dataset_risk(
    current_user: dict = Depends(get_current_user)
):

    if not os.path.exists(CSV_PATH):
        raise HTTPException(
            status_code=404,
            detail="Behavioral feature file not found"
        )

    df = pd.read_csv(CSV_PATH)

    df = df.fillna(0)

    records = df.to_dict(
        orient="records"
    )

    return {
        "total_users": len(records),
        "users": records
    }