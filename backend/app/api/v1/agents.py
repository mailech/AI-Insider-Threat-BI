"""
ITBIS — Endpoint agent enrollment & credential management.

Routes:
  POST   /api/v1/agents/enroll           Issue a device API key (ADMIN)
  GET    /api/v1/agents                  List enrolled devices (no secrets)
  DELETE /api/v1/agents/{device_id}      Revoke a device credential
  POST   /api/v1/agents/{device_id}/rotate  Replace the device API key
"""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_roles
from app.core.security import generate_agent_api_key, hash_agent_api_key
from app.models.domain import EnrolledAgent, RoleEnum, User
from app.schemas.agents import (
    AgentEnrollRequest,
    AgentEnrollResponse,
    AgentListResponse,
    EnrolledDeviceRead,
)
from app.services.agent_ingestion import link_employee_for_device

router = APIRouter(prefix="/agents", tags=["Endpoint Agents"])

_ADMIN = require_roles([RoleEnum.ADMINISTRATOR])


def _to_device_read(agent: EnrolledAgent) -> EnrolledDeviceRead:
    emp = agent.employee
    return EnrolledDeviceRead(
        device_id=agent.device_id,
        device_name=agent.device_name,
        device_type=agent.device_type,
        operating_system=agent.operating_system,
        is_active=agent.is_active,
        api_key_hint=agent.api_key_hint,
        employee_emp_id=emp.emp_id if emp else None,
        last_seen_at=agent.last_seen_at,
        created_at=agent.created_at,
        updated_at=agent.updated_at,
    )


def _issue_key(agent: EnrolledAgent) -> str:
    raw_key = generate_agent_api_key()
    agent.api_key_hash = hash_agent_api_key(raw_key)
    agent.api_key_hint = raw_key[:16]
    agent.is_active = True
    agent.updated_at = datetime.now(tz=timezone.utc)
    return raw_key


@router.post(
    "/enroll",
    response_model=AgentEnrollResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Enroll an endpoint agent and issue an API key",
)
def enroll_agent(
    payload: AgentEnrollRequest,
    db: Session = Depends(get_db),
    _: User = Depends(_ADMIN),
) -> AgentEnrollResponse:
    device_id = payload.device_id.strip()
    now = datetime.now(tz=timezone.utc)
    employee = link_employee_for_device(db, device_id)

    agent = db.query(EnrolledAgent).filter(EnrolledAgent.device_id == device_id).first()
    if agent is None:
        agent = EnrolledAgent(
            device_id=device_id,
            device_name=payload.device_name.strip(),
            device_type=payload.device_type,
            operating_system=payload.operating_system,
            api_key_hash="",
            api_key_hint="",
            is_active=True,
            employee_id=employee.id if employee else None,
            created_at=now,
            updated_at=now,
        )
        db.add(agent)
    else:
        agent.device_name = payload.device_name.strip()
        agent.device_type = payload.device_type
        agent.operating_system = payload.operating_system
        if employee is not None:
            agent.employee_id = employee.id

    raw_key = _issue_key(agent)
    db.commit()
    db.refresh(agent)

    return AgentEnrollResponse(
        device=_to_device_read(agent),
        api_key=raw_key,
    )


@router.get(
    "",
    response_model=AgentListResponse,
    summary="List enrolled endpoint devices",
)
def list_agents(
    db: Session = Depends(get_db),
    _: User = Depends(_ADMIN),
) -> AgentListResponse:
    rows = db.query(EnrolledAgent).order_by(EnrolledAgent.created_at.desc()).all()
    return AgentListResponse(
        items=[_to_device_read(row) for row in rows],
        total=len(rows),
    )


@router.delete(
    "/{device_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Revoke an enrolled device credential",
)
def revoke_agent(
    device_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(_ADMIN),
) -> None:
    agent = db.query(EnrolledAgent).filter(EnrolledAgent.device_id == device_id).first()
    if agent is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device is not enrolled.")
    agent.is_active = False
    agent.updated_at = datetime.now(tz=timezone.utc)
    db.commit()


@router.post(
    "/{device_id}/rotate",
    response_model=AgentEnrollResponse,
    summary="Rotate the API key for an enrolled device",
)
def rotate_agent_key(
    device_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(_ADMIN),
) -> AgentEnrollResponse:
    agent = db.query(EnrolledAgent).filter(EnrolledAgent.device_id == device_id).first()
    if agent is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device is not enrolled.")
    raw_key = _issue_key(agent)
    db.commit()
    db.refresh(agent)
    return AgentEnrollResponse(device=_to_device_read(agent), api_key=raw_key)
