from datetime import datetime

from sqlalchemy.orm import Session

from app.models.investigation import Investigation


class InvestigationWorkflowService:

    @staticmethod
    def create_investigation(
        db: Session,
        employee_id: str,
        alert_id: int | None,
        title: str,
        description: str | None,
        severity: str,
    ):
        investigation = Investigation(
            investigation_id=f"INV-{datetime.utcnow().strftime('%Y%m%d%H%M%S%f')}",
            employee_id=employee_id,
            alert_id=alert_id,
            title=title,
            description=description,
            severity=severity,
            status="Open",
        )

        db.add(investigation)
        db.commit()
        db.refresh(investigation)

        return investigation

    @staticmethod
    def get_all_investigations(db: Session):
        return (
            db.query(Investigation)
            .order_by(Investigation.created_at.desc())
            .all()
        )

    @staticmethod
    def get_investigation_by_id(
        db: Session,
        investigation_id: str
    ):
        return (
            db.query(Investigation)
            .filter(
                Investigation.investigation_id == investigation_id
            )
            .first()
        )

    @staticmethod
    def assign_analyst(
        db: Session,
        investigation_id: str,
        assigned_analyst: str
    ):
        investigation = (
            db.query(Investigation)
            .filter(
                Investigation.investigation_id == investigation_id
            )
            .first()
        )

        if not investigation:
            return None

        investigation.assigned_analyst = assigned_analyst
        investigation.updated_at = datetime.utcnow()

        db.commit()
        db.refresh(investigation)

        return investigation

    @staticmethod
    def update_status(
        db: Session,
        investigation_id: str,
        status: str
    ):
        allowed_statuses = [
            "Open",
            "In Progress",
            "Resolved"
        ]

        if status not in allowed_statuses:
            raise ValueError(
                f"Invalid status. Allowed values: {allowed_statuses}"
            )

        investigation = (
            db.query(Investigation)
            .filter(
                Investigation.investigation_id == investigation_id
            )
            .first()
        )

        if not investigation:
            return None

        investigation.status = status
        investigation.updated_at = datetime.utcnow()

        if status == "Resolved":
            investigation.resolved_at = datetime.utcnow()
        else:
            investigation.resolved_at = None

        db.commit()
        db.refresh(investigation)

        return investigation
    @staticmethod
    def resolve_investigation(
        db: Session,
        investigation_id: str,
        resolution_notes: str
    ):
        investigation = (
            db.query(Investigation)
            .filter(
                Investigation.investigation_id == investigation_id
            )
            .first()
        )

        if not investigation:
            return None

        investigation.resolution_notes = resolution_notes
        investigation.status = "Resolved"
        investigation.updated_at = datetime.utcnow()
        investigation.resolved_at = datetime.utcnow()

        db.commit()
        db.refresh(investigation)

        return investigation
    