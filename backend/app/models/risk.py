from sqlalchemy import Column, Integer, String

from app.database import Base


class Risk(Base):
    __tablename__ = "risks"

    id = Column(Integer, primary_key=True, index=True)

    # CERT user ID
    employee_id = Column(String(50), nullable=False, unique=True, index=True)

    # Calculated risk score: 0 - 100
    risk_score = Column(Integer, nullable=False)

    # LOW / MEDIUM / HIGH / CRITICAL
    risk_level = Column(String(20), nullable=False, index=True)