"""Import every model so that Base.metadata is fully populated."""
from app.db.session import Base  # noqa: F401
from app.models.user import User  # noqa: F401
from app.models.employee import Department, Employee, Asset  # noqa: F401
from app.models.activity import ActivityEvent  # noqa: F401
from app.models.behavior import BehaviorBaseline, PeerGroupStat  # noqa: F401
from app.models.anomaly import Anomaly  # noqa: F401
from app.models.risk import RiskScore  # noqa: F401
from app.models.incident import Incident, Evidence, TimelineEntry, IncidentNote  # noqa: F401
from app.models.alert import Alert  # noqa: F401
from app.models.notification import Notification  # noqa: F401
from app.models.audit import AuditLog  # noqa: F401
