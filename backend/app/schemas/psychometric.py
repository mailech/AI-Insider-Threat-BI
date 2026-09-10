from pydantic import BaseModel


class PsychometricBase(BaseModel):
    employee_name: str
    user_id: str
    openness: int
    conscientiousness: int
    extraversion: int
    agreeableness: int
    neuroticism: int


class PsychometricCreate(PsychometricBase):
    pass


class PsychometricResponse(PsychometricBase):
    id: int

    class Config:
        from_attributes = True