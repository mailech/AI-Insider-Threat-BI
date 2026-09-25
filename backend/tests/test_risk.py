from types import SimpleNamespace
from app.services.risk import RiskEngine

class DB:
    def scalar(self, query): return 4

def test_risk_weighting_produces_level():
    e=SimpleNamespace(event_type="usb_file_copy",timestamp=SimpleNamespace(hour=23),bytes_transferred=100_000_000,file_count=20,is_remote=True,risk_indicators=[],user_id="u1")
    r=RiskEngine(); score,level,indicators,anomaly=r.score(DB(),e)
    assert 0 <= score <= 100
    assert level in {"low","medium","high","critical"}
    assert "data_activity" in indicators and "high_data_volume" in indicators and "unusual_activity_time" in indicators
