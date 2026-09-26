from typing import List, Dict, Any, Optional
from pydantic import BaseModel


class MLTrainRequest(BaseModel):
    data_path: Optional[str] = None
    model_type: str = "all"  # isolation_forest, xgboost, or all
    contamination: float = 0.05
    n_estimators: int = 150
    time_split_ratio: float = 0.8


class MLPredictionRequest(BaseModel):
    user_id: str
    date: str
    feature_vector: Dict[str, float]


class MLMetricsResponse(BaseModel):
    isolation_forest: Dict[str, Any]
    xgboost: Dict[str, Any]
    feature_importance: List[Dict[str, Any]]
    model_metadata: Dict[str, Any]


class MLTrainResponse(BaseModel):
    status: str
    message: str
    metrics: Dict[str, Any]
    trained_at: str
