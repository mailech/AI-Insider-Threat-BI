from sqlalchemy import Column, Integer, String

from app.database import Base


class PsychometricProfile(Base):
    __tablename__ = "psychometric_profiles"

    # Internal Primary Key
    id = Column(Integer, primary_key=True, index=True)

    # Employee Details
    employee_name = Column(String(255), nullable=False)

    user_id = Column(String(20), unique=True, nullable=False, index=True)

    # Big Five Personality Traits
    openness = Column(Integer, nullable=False)

    conscientiousness = Column(Integer, nullable=False)

    extraversion = Column(Integer, nullable=False)

    agreeableness = Column(Integer, nullable=False)

    neuroticism = Column(Integer, nullable=False)