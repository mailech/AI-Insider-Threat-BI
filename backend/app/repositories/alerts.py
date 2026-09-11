from abc import ABC, abstractmethod
from app.schemas.alert import Alert


class AlertRepository(ABC):
    @abstractmethod
    def list_open(self) -> list[Alert]: ...

    @abstractmethod
    def acknowledge(self, alert_id: str) -> Alert | None: ...


class InMemoryAlertRepository(AlertRepository):
    def __init__(self) -> None:
        self._alerts = {
            "ALT-1842": Alert(id="ALT-1842", employee_id="EMP-2001", employee_name="Eleanor Pena", department="Finance", issue="Abnormal data download", detail="3.4 GB downloaded from restricted finance storage outside the established baseline.", score=91, severity="Critical", time="8 min ago"),
            "ALT-1841": Alert(id="ALT-1841", employee_id="EMP-2002", employee_name="Cameron Williamson", department="Engineering", issue="Unusual access pattern", detail="New access to source-control projects outside the assigned peer group.", score=76, severity="High", time="22 min ago"),
            "ALT-1839": Alert(id="ALT-1839", employee_id="EMP-2003", employee_name="Brooklyn Simmons", department="Operations", issue="Off-hours privileged login", detail="Privileged session initiated at 02:14 from a recognized endpoint.", score=64, severity="Medium", time="41 min ago"),
        }

    def list_open(self) -> list[Alert]:
        return [alert for alert in self._alerts.values() if not alert.acknowledged]

    def acknowledge(self, alert_id: str) -> Alert | None:
        alert = self._alerts.get(alert_id)
        if alert is None:
            return None
        alert.acknowledged = True
        return alert
