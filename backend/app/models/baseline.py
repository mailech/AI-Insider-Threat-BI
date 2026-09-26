from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, DateTime, Index
from backend.app.db.session import Base


class BehavioralBaseline(Base):
    __tablename__ = "behavioral_baselines"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(50), index=True, nullable=False)
    metric_name = Column(String(100), nullable=False)  # e.g. login_count, file_activity_count, etc.
    mean = Column(Float, default=0.0)
    std = Column(Float, default=1.0)
    median = Column(Float, default=0.0)
    q25 = Column(Float, default=0.0)
    q75 = Column(Float, default=0.0)
    min_val = Column(Float, default=0.0)
    max_val = Column(Float, default=0.0)
    normal_hours_start = Column(Float, default=8.0)
    normal_hours_end = Column(Float, default=18.0)
    sample_size = Column(Integer, default=0)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        Index("idx_baseline_user_metric", "user_id", "metric_name", unique=True),
    )
