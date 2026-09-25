from datetime import datetime, timezone, timedelta
import csv, io
from pathlib import Path
from fastapi import FastAPI, Depends, Header, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy import select, func, desc, and_, or_
from sqlalchemy.orm import Session
from .db import Base, engine, get_db
from .models import SecurityEvent, Alert, Incident, User, Employee, Device, AuditLog, Notification
from .schemas import EventBatch, LoginRequest, AlertUpdate, IncidentCreate, IncidentUpdate, EmployeeCreate, UserCreate, EnrollRequest
from .settings import settings
from .security import hash_secret, verify_secret, make_password, verify_password, create_token, decode_token, new_agent_key
from .services.risk import RiskEngine

app=FastAPI(title='ITBIS Insider Threat Behavioral Intelligence API',version='1.1.0')
app.add_middleware(CORSMiddleware,allow_origins=[x.strip() for x in settings.cors_origins.split(',') if x.strip()],allow_credentials=True,allow_methods=['*'],allow_headers=['*'])
risk_engine=RiskEngine()

def now(): return datetime.now(timezone.utc)
def audit(db,actor,action,target=None,details=None): db.add(AuditLog(actor=actor,action=action,target=target,created_at=now(),details=details))

def notify(db, recipient, title, message, severity='medium', kind='alert'):
    db.add(Notification(recipient=recipient, title=title, message=message, severity=severity, kind=kind, read=False, created_at=now()))

def auth_user(authorization:str|None=Header(None),db:Session=Depends(get_db)):
    if not authorization or not authorization.startswith('Bearer '): raise HTTPException(401,'authentication required')
    try: p=decode_token(authorization[7:]); u=db.get(User,int(p['sub']))
    except Exception: raise HTTPException(401,'invalid token')
    if not u or not u.active: raise HTTPException(401,'inactive user')
    return u

def require_roles(*roles):
    def dep(user=Depends(auth_user)):
        if user.role not in roles and user.role != 'admin': raise HTTPException(403,'insufficient permissions')
        return user
    return dep

def authenticate_agent(authorization,x_api_key,agent_id,db):
    token=authorization[7:] if authorization and authorization.startswith('Bearer ') else x_api_key
    if not token: raise HTTPException(401,'agent credential required')
    device=db.scalar(select(Device).where(Device.device_id==agent_id,Device.active==True))
    if device and verify_secret(token,device.api_key_hash): return device
    if token==settings.ingestion_api_key: return None
    raise HTTPException(403,'invalid agent credential')

@app.on_event('startup')
def startup():
    Base.metadata.create_all(engine)
    db=next(get_db())
    try:
        demo_roles = [
            (settings.bootstrap_admin_username, settings.bootstrap_admin_password, 'admin'),
            ('analyst', 'ChangeMe123!', 'analyst'),
            ('engineer', 'ChangeMe123!', 'engineer'),
            ('manager', 'ChangeMe123!', 'manager'),
        ]
        for uname, pwd, r in demo_roles:
            if not db.scalar(select(User).where(User.username==uname)):
                db.add(User(username=uname, password_hash=make_password(pwd), role=r, created_at=now(), active=True))
        db.commit()
    finally: db.close()

@app.get('/health')
def health(): return {'status':'ok','service':'itbis-backend','version':'1.1.0','time':now()}

@app.get('/api/v1/system/status')
def system_status(db:Session=Depends(get_db),user=Depends(auth_user)):
    return {
        'api':'operational',
        'database':'connected',
        'ml_model':'isolation_forest' if risk_engine.model is not None else 'fallback',
        'events':db.scalar(select(func.count()).select_from(SecurityEvent)) or 0,
        'alerts':db.scalar(select(func.count()).select_from(Alert)) or 0,
        'employees':db.scalar(select(func.count()).select_from(Employee)) or 0,
        'agents':db.scalar(select(func.count()).select_from(Device).where(Device.active==True)) or 0,
        'time':now(),
    }

@app.post('/api/v1/auth/login')
def login(req:LoginRequest,db:Session=Depends(get_db)):
    clean_username = req.username.split('@')[0] if '@' in req.username else req.username
    u=db.scalar(select(User).where(or_(User.username==req.username, User.username==clean_username)))
    if not u or not verify_password(req.password,u.password_hash) or not u.active: raise HTTPException(401,'invalid credentials')
    return {'access_token':create_token(u.id,u.username,u.role),'token_type':'bearer','role':u.role,'username':u.username}

@app.get('/api/v1/auth/me')
def me(user=Depends(auth_user)): return {'id':user.id,'username':user.username,'role':user.role,'employee_id':user.employee_id,'active':user.active}


@app.post('/api/v1/auth/register')
def register(req:UserCreate,db:Session=Depends(get_db)):
    if req.role != 'analyst': raise HTTPException(400,'public registration is limited to analyst role')
    if len(req.password) < 10: raise HTTPException(400,'password must be at least 10 characters')
    if db.scalar(select(User).where(User.username==req.username)): raise HTTPException(409,'user exists')
    x=User(username=req.username,password_hash=make_password(req.password),role='analyst',employee_id=req.employee_id,created_at=now(),active=True)
    db.add(x); db.commit(); db.refresh(x)
    return {'id':x.id,'username':x.username,'role':x.role}

@app.post('/api/v1/auth/token')
def oauth2_token(form_data:OAuth2PasswordRequestForm=Depends(),db:Session=Depends(get_db)):
    u=db.scalar(select(User).where(User.username==form_data.username))
    if not u or not verify_password(form_data.password,u.password_hash) or not u.active: raise HTTPException(401,'invalid credentials',headers={'WWW-Authenticate':'Bearer'})
    return {'access_token':create_token(u.id,u.username,u.role),'token_type':'bearer'}

@app.patch('/api/v1/auth/me')
def update_me(payload:dict,db:Session=Depends(get_db),user=Depends(auth_user)):
    if 'employee_id' in payload: user.employee_id=payload.get('employee_id')
    if 'password' in payload:
        if len(str(payload['password'])) < 10: raise HTTPException(400,'password must be at least 10 characters')
        user.password_hash=make_password(str(payload['password']))
    audit(db,user.username,'user.profile.update',str(user.id),{'employee_id':user.employee_id}); db.commit()
    return {'id':user.id,'username':user.username,'role':user.role,'employee_id':user.employee_id,'active':user.active}

@app.post('/api/v1/agents/enroll')
def enroll(req:EnrollRequest,db:Session=Depends(get_db),user=Depends(require_roles('admin','engineer'))):
    if db.scalar(select(Device).where(Device.device_id==req.device_id)): raise HTTPException(409,'device already enrolled')
    key=new_agent_key(); d=Device(device_id=req.device_id,device_name=req.device_name,api_key_hash=hash_secret(key),created_at=now(),active=True)
    db.add(d); audit(db,user.username,'agent.enroll',req.device_id,{'device_name':req.device_name}); db.commit()
    return {'device_id':req.device_id,'device_name':req.device_name,'api_key':key,'warning':'Store this key securely. It will not be shown again.'}

@app.get('/api/v1/agents')
def agents(db:Session=Depends(get_db),user=Depends(require_roles('admin','manager','analyst','engineer'))):
    return [{'device_id':d.device_id,'device_name':d.device_name,'active':d.active,'last_seen':d.last_seen,'created_at':d.created_at} for d in db.scalars(select(Device).order_by(Device.device_name)).all()]

@app.delete('/api/v1/agents/{device_id}')
def revoke_agent(device_id:str,db:Session=Depends(get_db),user=Depends(require_roles('admin','engineer'))):
    d=db.scalar(select(Device).where(Device.device_id==device_id))
    if not d: raise HTTPException(404,'device not found')
    d.active=False; audit(db,user.username,'agent.revoke',device_id); db.commit(); return {'status':'revoked'}

@app.post('/api/v1/ingestion/events')
def ingest(batch:EventBatch,db:Session=Depends(get_db),authorization:str|None=Header(None),x_api_key:str|None=Header(None)):
    device=authenticate_agent(authorization,x_api_key,batch.agent_id,db); accepted=duplicates=0; results=[]
    for item in batch.events:
        idem=item.idem(batch.agent_id)
        if db.scalar(select(SecurityEvent).where(SecurityEvent.idempotency_key==idem)):
            duplicates+=1; results.append({'event_id':item.event_id,'status':'duplicate'}); continue
        e=SecurityEvent(**{'event_id':item.event_id,'idempotency_key':idem,'raw_event_id':item.raw_event_id,'event_type':item.event_type,'source_dataset':item.source_dataset,'timestamp':item.timestamp,'ingested_at':item.ingested_at or now(),'user_id':item.user_id,'username':item.username,'user_email':item.user_email,'employee_id':item.employee_id,'department':item.department,'device_id':item.device_id or batch.agent_id,'device_name':item.device_name,'device_type':item.device_type,'ip_address':item.ip_address,'mac_address':item.mac_address,'operating_system':item.operating_system,'target_resource':item.target_resource,'target_type':item.target_type,'action':item.action,'result':item.result,'bytes_transferred':item.bytes_transferred,'file_count':item.file_count,'location':item.location,'country':item.country,'city':item.city,'is_remote':item.is_remote,'risk_indicators':item.risk_indicators,'raw_payload':item.raw_payload,'enrichments':item.enrichments,'tags':item.tags})
        db.add(e); db.flush(); risk_engine.enrich(db,e);
        if e.risk_level in {'high','critical'}: notify(db,'*',f'{e.risk_level.upper()} insider-risk event',f'{e.event_type} for {e.username or e.user_id}; risk score {e.risk_score}.',e.risk_level,'alert')
        accepted+=1; results.append({'event_id':item.event_id,'status':'accepted','risk_score':e.risk_score,'risk_level':e.risk_level})
    if device: device.last_seen=now()
    db.commit(); return {'accepted':accepted,'duplicates':duplicates,'rejected':0,'results':results}

@app.post('/api/v1/analytics/recalculate')
def recalculate(limit:int=Query(5000,le=20000),db:Session=Depends(get_db),user=Depends(require_roles('admin','manager','analyst','engineer'))):
    rows=db.scalars(select(SecurityEvent).order_by(desc(SecurityEvent.timestamp)).limit(limit)).all()
    for e in reversed(rows): risk_engine.enrich(db,e)
    db.commit(); audit(db,user.username,'analytics.recalculate',details={'events_processed':len(rows)}); db.commit()
    return {'processed':len(rows),'alerts_created':db.scalar(select(func.count()).select_from(Alert)) or 0}

@app.get('/api/v1/dashboard/summary')
def summary(db:Session=Depends(get_db),user=Depends(auth_user)):
    total=db.scalar(select(func.count()).select_from(SecurityEvent)) or 0
    alert_open=db.scalar(select(func.count()).select_from(Alert).where(Alert.status=='open')) or 0
    critical=db.scalar(select(func.count()).select_from(Alert).where(Alert.severity=='critical',Alert.status=='open')) or 0
    return {'events':total,'anomalies':db.scalar(select(func.count()).select_from(SecurityEvent).where(SecurityEvent.anomaly_score>=70)) or 0,'active_investigations':db.scalar(select(func.count()).select_from(Incident).where(Incident.status.in_(['open','investigating']))) or 0,'open_alerts':alert_open,'high_risk_events':db.scalar(select(func.count()).select_from(SecurityEvent).where(SecurityEvent.risk_level.in_(['high','critical']))) or 0,'critical_alerts':critical,'low_risk_events':db.scalar(select(func.count()).select_from(SecurityEvent).where(SecurityEvent.risk_level=='low')) or 0,'medium_risk_events':db.scalar(select(func.count()).select_from(SecurityEvent).where(SecurityEvent.risk_level=='medium')) or 0,'resolved_alerts':db.scalar(select(func.count()).select_from(Alert).where(Alert.status.in_(['resolved','closed']))) or 0}

def event_out(x): return {'event_id':x.event_id,'event_type':x.event_type,'username':x.username,'user_id':x.user_id,'employee_id':x.employee_id,'department':x.department,'timestamp':x.timestamp,'risk_score':x.risk_score,'risk_level':x.risk_level,'anomaly_score':x.anomaly_score,'indicators':x.risk_indicators,'device':x.device_name or x.device_id,'device_id':x.device_id,'action':x.action,'result':x.result,'target_resource':x.target_resource,'target_type':x.target_type,'bytes_transferred':x.bytes_transferred,'file_count':x.file_count,'source_dataset':x.source_dataset,'ip_address':x.ip_address,'is_remote':x.is_remote,'location':x.location,'raw_payload':x.raw_payload}

@app.get('/api/v1/events')
def events(limit:int=Query(100,le=500),risk_level:str|None=None,event_type:str|None=None,username:str|None=None,db:Session=Depends(get_db),user=Depends(auth_user)):
    q=select(SecurityEvent).order_by(desc(SecurityEvent.timestamp)).limit(limit)
    if risk_level:q=q.where(SecurityEvent.risk_level==risk_level)
    if event_type:q=q.where(SecurityEvent.event_type==event_type)
    if username:q=q.where(SecurityEvent.username.ilike(f'%{username}%'))
    return [event_out(x) for x in db.scalars(q).all()]

@app.get('/api/v1/events/{event_id}')
def event_detail(event_id:str,db:Session=Depends(get_db),user=Depends(auth_user)):
    e=db.scalar(select(SecurityEvent).where(SecurityEvent.event_id==event_id))
    if not e: raise HTTPException(404,'event not found')
    return event_out(e)

def alert_out(x):return {'id':x.id,'event_id':x.event_id,'employee_id':x.employee_id,'username':x.username,'severity':x.severity,'title':x.title,'description':x.description,'status':x.status,'created_at':x.created_at,'resolved_at':x.resolved_at}
@app.get('/api/v1/alerts')
def alerts(limit:int=Query(100,le=500),status:str|None=None,severity:str|None=None,db:Session=Depends(get_db),user=Depends(auth_user)):
    q=select(Alert).order_by(desc(Alert.created_at)).limit(limit)
    if status:q=q.where(Alert.status==status)
    if severity:q=q.where(Alert.severity==severity)
    return [alert_out(x) for x in db.scalars(q).all()]
@app.get('/api/v1/alerts/{alert_id}')
def alert_detail(alert_id:int,db:Session=Depends(get_db),user=Depends(auth_user)):
    a=db.get(Alert,alert_id)
    if not a: raise HTTPException(404,'alert not found')
    e=db.scalar(select(SecurityEvent).where(SecurityEvent.event_id==a.event_id))
    return {'alert':alert_out(a),'event':event_out(e) if e else None}
@app.patch('/api/v1/alerts/{alert_id}')
def update_alert(alert_id:int,req:AlertUpdate,db:Session=Depends(get_db),user=Depends(require_roles('admin','manager','analyst'))):
    if req.status not in {'open','acknowledged','investigating','resolved','closed'}: raise HTTPException(400,'invalid alert status')
    a=db.get(Alert,alert_id)
    if not a: raise HTTPException(404,'alert not found')
    a.status=req.status; a.resolved_at=now() if req.status in {'resolved','closed'} else None; audit(db,user.username,'alert.update',str(alert_id),{'status':req.status});
    if req.status in {'resolved','closed'}: notify(db,user.username,'Alert resolved',f'Alert #{a.id} has been marked {req.status}.','low','alert_update')
    db.commit(); db.refresh(a); return alert_out(a)

@app.post('/api/v1/alerts/{alert_id}/investigate')
def investigate_alert(alert_id:int,db:Session=Depends(get_db),user=Depends(require_roles('admin','manager','analyst'))):
    a=db.get(Alert,alert_id)
    if not a: raise HTTPException(404,'alert not found')
    existing=None
    for candidate in db.scalars(select(Incident).order_by(desc(Incident.updated_at))).all():
        if a.id in (candidate.alert_ids or []):
            existing=candidate; break
    if existing: return incident_out(existing)
    a.status='investigating'; notify(db,user.username,'Investigation opened',f'Investigation created from alert #{a.id}.',a.severity,'investigation'); x=Incident(title=f'Investigation: {a.title}',severity=a.severity,status='investigating',assignee=user.username,alert_ids=[a.id],notes=a.description,created_at=now(),updated_at=now())
    db.add(x); audit(db,user.username,'incident.create_from_alert',str(alert_id)); db.commit(); db.refresh(x); return incident_out(x)

def incident_out(x):return {'id':x.id,'title':x.title,'severity':x.severity,'status':x.status,'assignee':x.assignee,'alert_ids':x.alert_ids,'notes':x.notes,'created_at':x.created_at,'updated_at':x.updated_at}
@app.get('/api/v1/incidents')
def incidents(status:str|None=None,db:Session=Depends(get_db),user=Depends(auth_user)):
    q=select(Incident).order_by(desc(Incident.updated_at))
    if status:q=q.where(Incident.status==status)
    return [incident_out(x) for x in db.scalars(q).all()]
@app.post('/api/v1/incidents')
def create_incident(req:IncidentCreate,db:Session=Depends(get_db),user=Depends(require_roles('admin','manager','analyst'))):
    x=Incident(title=req.title,severity=req.severity,status='open',assignee=req.assignee or user.username,alert_ids=req.alert_ids,notes=req.notes,created_at=now(),updated_at=now()); db.add(x); audit(db,user.username,'incident.create',req.title,{'alert_ids':req.alert_ids}); db.commit(); db.refresh(x); return incident_out(x)
@app.patch('/api/v1/incidents/{incident_id}')
def update_incident(incident_id:int,req:IncidentUpdate,db:Session=Depends(get_db),user=Depends(require_roles('admin','manager','analyst'))):
    x=db.get(Incident,incident_id)
    if not x: raise HTTPException(404,'incident not found')
    for k,v in req.model_dump(exclude_none=True).items():setattr(x,k,v)
    x.updated_at=now(); audit(db,user.username,'incident.update',str(incident_id),req.model_dump(exclude_none=True)); db.commit(); db.refresh(x); return incident_out(x)
@app.get('/api/v1/incidents/{incident_id}/timeline')
def incident_timeline(incident_id:int,db:Session=Depends(get_db),user=Depends(auth_user)):
    x=db.get(Incident,incident_id)
    if not x: raise HTTPException(404,'incident not found')
    alert_ids=x.alert_ids or []; alert_rows=db.scalars(select(Alert).where(Alert.id.in_(alert_ids))).all() if alert_ids else []
    event_ids=[a.event_id for a in alert_rows]; event_rows=db.scalars(select(SecurityEvent).where(SecurityEvent.event_id.in_(event_ids)).order_by(SecurityEvent.timestamp)).all() if event_ids else []
    return {'incident':incident_out(x),'alerts':[alert_out(a) for a in alert_rows],'timeline':[event_out(e) for e in event_rows]}

@app.get('/api/v1/employees')
def employees(db:Session=Depends(get_db),user=Depends(auth_user)):
    return [{'employee_id':x.employee_id,'username':x.username,'department':x.department,'designation':x.designation,'manager':x.manager,'risk_score':x.risk_score,'risk_level':x.risk_level,'access_privileges':x.access_privileges,'updated_at':x.updated_at} for x in db.scalars(select(Employee).order_by(desc(Employee.risk_score),Employee.username)).all()]
@app.post('/api/v1/employees')
def add_employee(req:EmployeeCreate,db:Session=Depends(get_db),user=Depends(require_roles('admin','manager'))):
    if db.scalar(select(Employee).where(Employee.employee_id==req.employee_id)): raise HTTPException(409,'employee exists')
    x=Employee(**req.model_dump(),updated_at=now()); db.add(x); audit(db,user.username,'employee.create',req.employee_id); db.commit(); return {'status':'created','employee_id':x.employee_id}
@app.get('/api/v1/employees/{employee_id}/profile')
def employee_profile(employee_id:str,db:Session=Depends(get_db),user=Depends(auth_user)):
    emp=db.scalar(select(Employee).where(Employee.employee_id==employee_id))
    if not emp: raise HTTPException(404,'employee not found')
    events=db.scalars(select(SecurityEvent).where(SecurityEvent.employee_id==employee_id).order_by(desc(SecurityEvent.timestamp)).limit(200)).all()
    alerts_rows=db.scalars(select(Alert).where(Alert.employee_id==employee_id).order_by(desc(Alert.created_at)).limit(100)).all()
    incidents_rows=db.scalars(select(Incident).order_by(desc(Incident.updated_at)).limit(200)).all()
    incidents_rows=[i for i in incidents_rows if any(a.id in (i.alert_ids or []) for a in alerts_rows)]
    counts={}
    for e in events: counts[e.event_type]=counts.get(e.event_type,0)+1
    risk_counts={k:sum(1 for e in events if e.risk_level==k) for k in ['low','medium','high','critical']}
    hours=[e.timestamp.hour for e in events]; after_hours=sum(1 for h in hours if h<7 or h>=22)
    remote=sum(1 for e in events if e.is_remote); bytes_total=sum((e.bytes_transferred or 0) for e in events)
    baseline={'dominant_event_type':max(counts,key=counts.get) if counts else None,'average_activity_hour':round(sum(hours)/len(hours),2) if hours else None,'after_hours_rate':round(after_hours/max(1,len(events))*100,2),'remote_activity_rate':round(remote/max(1,len(events))*100,2),'total_bytes_transferred':bytes_total,'unique_devices':len({e.device_id for e in events if e.device_id})}
    return {'employee':{'employee_id':emp.employee_id,'username':emp.username,'department':emp.department,'designation':emp.designation,'manager':emp.manager,'access_privileges':emp.access_privileges,'risk_score':emp.risk_score,'risk_level':emp.risk_level,'updated_at':emp.updated_at},'summary':{'events':len(events),'avg_risk':round(sum((e.risk_score or 0) for e in events)/max(1,len(events)),2),'max_risk':round(max((e.risk_score or 0) for e in events),2) if events else 0,'anomalies':sum(1 for e in events if (e.anomaly_score or 0)>=70),'risk_distribution':risk_counts,'baseline':baseline,'event_types':sorted([{'event_type':k,'count':v} for k,v in counts.items()],key=lambda z:z['count'],reverse=True)},'events':[event_out(e) for e in events[:50]],'alerts':[alert_out(a) for a in alerts_rows],'incidents':[incident_out(i) for i in incidents_rows[:20]]}

@app.get('/api/v1/risk/users')
def risk_users(db:Session=Depends(get_db),user=Depends(auth_user)):
    return [{'employee_id':x.employee_id,'username':x.username,'department':x.department,'risk_score':x.risk_score,'risk_level':x.risk_level} for x in db.scalars(select(Employee).order_by(desc(Employee.risk_score)).limit(100)).all()]

@app.get('/api/v1/analytics/trends')
def trends(days:int=Query(30,le=365),db:Session=Depends(get_db),user=Depends(auth_user)):
    since=now()-timedelta(days=days); rows=db.execute(select(SecurityEvent.timestamp,SecurityEvent.risk_score,SecurityEvent.risk_level,SecurityEvent.anomaly_score).where(SecurityEvent.timestamp>=since)).all(); buckets={}
    for ts,score,level,anom in rows:
        key=ts.strftime('%Y-%m-%d'); b=buckets.setdefault(key,{'date':key,'events':0,'avg_risk':0,'anomalies':0,'high':0}); b['events']+=1;b['avg_risk']+=score or 0;b['anomalies']+=1 if (anom or 0)>=70 else 0;b['high']+=1 if level in {'high','critical'} else 0
    out=[]
    for b in buckets.values():b['avg_risk']=round(b['avg_risk']/max(1,b['events']),2);out.append(b)
    return sorted(out,key=lambda x:x['date'])

@app.get('/api/v1/analytics/behavior')
def behavior(db:Session=Depends(get_db),user=Depends(auth_user)):
    rows=db.scalars(select(SecurityEvent)).all(); types={}; indicators={}; hours={}; departments={}
    for e in rows:
        types[e.event_type]=types.get(e.event_type,0)+1; hours[e.timestamp.hour]=hours.get(e.timestamp.hour,0)+1; departments[e.department or 'Unknown']=departments.get(e.department or 'Unknown',0)+1
        for i in e.risk_indicators or []: indicators[i]=indicators.get(i,0)+1
    return {'event_types':sorted([{'name':k,'count':v} for k,v in types.items()],key=lambda x:x['count'],reverse=True),'indicators':sorted([{'name':k,'count':v} for k,v in indicators.items()],key=lambda x:x['count'],reverse=True),'hours':[{'hour':k,'count':hours[k]} for k in sorted(hours)],'departments':sorted([{'name':k,'count':v} for k,v in departments.items()],key=lambda x:x['count'],reverse=True)}

@app.get('/api/v1/audit')
def audit_logs(limit:int=100,db:Session=Depends(get_db),user=Depends(require_roles('admin','manager','engineer'))):
    return [{'id':x.id,'actor':x.actor,'action':x.action,'target':x.target,'created_at':x.created_at,'details':x.details} for x in db.scalars(select(AuditLog).order_by(desc(AuditLog.created_at)).limit(limit)).all()]

@app.get('/api/v1/admin/users')
def users(db:Session=Depends(get_db),user=Depends(require_roles('admin'))):
    return [{'id':x.id,'username':x.username,'role':x.role,'employee_id':x.employee_id,'active':x.active,'created_at':x.created_at} for x in db.scalars(select(User).order_by(User.username)).all()]
@app.post('/api/v1/admin/users')
def create_user(req:UserCreate,db:Session=Depends(get_db),user=Depends(require_roles('admin'))):
    if req.role not in {'admin','manager','analyst'}: raise HTTPException(400,'invalid role')
    if db.scalar(select(User).where(User.username==req.username)): raise HTTPException(409,'user exists')
    x=User(username=req.username,password_hash=make_password(req.password),role=req.role,employee_id=req.employee_id,created_at=now(),active=True); db.add(x); audit(db,user.username,'user.create',req.username,{'role':req.role}); db.commit(); return {'status':'created'}

@app.get('/api/v1/notifications')
def notifications(limit:int=Query(100,le=500),unread_only:bool=False,db:Session=Depends(get_db),user=Depends(auth_user)):
    q=select(Notification).where(Notification.recipient.in_([user.username,'*'])).order_by(desc(Notification.created_at)).limit(limit)
    if unread_only: q=q.where(Notification.read==False)
    rows=db.scalars(q).all()
    return [{'id':n.id,'kind':n.kind,'title':n.title,'message':n.message,'severity':n.severity,'read':n.read,'created_at':n.created_at} for n in rows]

@app.patch('/api/v1/notifications/{notification_id}/read')
def mark_notification_read(notification_id:int,db:Session=Depends(get_db),user=Depends(auth_user)):
    n=db.get(Notification,notification_id)
    if not n or n.recipient not in {user.username,'*'}: raise HTTPException(404,'notification not found')
    n.read=True; db.commit(); return {'status':'read','id':n.id}

@app.post('/api/v1/alerts/{alert_id}/escalate')
def escalate_alert(alert_id:int,db:Session=Depends(get_db),user=Depends(require_roles('admin','manager','analyst'))):
    a=db.get(Alert,alert_id)
    if not a: raise HTTPException(404,'alert not found')
    a.status='investigating'
    notify(db,'*',f'Escalated alert #{a.id}',a.title,a.severity,'escalation')
    audit(db,user.username,'alert.escalate',str(alert_id),{'severity':a.severity})
    db.commit(); return {'status':'escalated','alert_id':a.id}

@app.get('/api/v1/analytics/peer-groups')
def peer_groups(db:Session=Depends(get_db),user=Depends(auth_user)):
    employees=db.scalars(select(Employee)).all(); groups={}
    for e in employees:
        key=e.department or 'Unknown'; groups.setdefault(key,[]).append(e)
    out=[]
    for dept, members in groups.items():
        avg=round(sum(x.risk_score or 0 for x in members)/max(1,len(members)),2)
        out.append({'group':dept,'members':len(members),'average_risk':avg,'high_or_critical':sum(1 for x in members if x.risk_level in {'high','critical'})})
    return sorted(out,key=lambda x:x['average_risk'],reverse=True)

@app.get('/api/v1/analytics/prediction')
def prediction(db:Session=Depends(get_db),user=Depends(auth_user)):
    rows=db.execute(select(SecurityEvent.timestamp,SecurityEvent.risk_score).order_by(desc(SecurityEvent.timestamp)).limit(30)).all()
    if len(rows)<2: return {'method':'recent-risk trend heuristic','prediction':'insufficient_data','next_period_risk':None}
    values=[float(x[1] or 0) for x in reversed(rows)]; slope=(values[-1]-values[0])/max(1,len(values)-1); nxt=max(0,min(100,round(values[-1]+slope*5,2)))
    return {'method':'recent-risk trend heuristic','prediction':'rising' if slope>1 else 'falling' if slope<-1 else 'stable','next_period_risk':nxt,'sample_size':len(values)}

@app.get('/api/v1/threat-intelligence')
def threat_intelligence(db:Session=Depends(get_db),user=Depends(auth_user)):
    rows=db.scalars(select(SecurityEvent).where(SecurityEvent.event_type.in_(['network_connection','http_request'])).order_by(desc(SecurityEvent.timestamp)).limit(1000)).all(); iocs={}
    for e in rows:
        key=e.ip_address or e.target_resource
        if key:
            k=(key,e.event_type,e.risk_level); iocs[k]=iocs.get(k,0)+1
    return [{'indicator':k[0],'type':'IP / resource','event_type':k[1],'risk_level':k[2],'count':v} for k,v in sorted(iocs.items(),key=lambda x:x[1],reverse=True)[:100]]

@app.get('/api/v1/compliance/metrics')
def compliance_metrics(db:Session=Depends(get_db),user=Depends(require_roles('admin','manager'))):
    total=db.scalar(select(func.count()).select_from(SecurityEvent)) or 0; critical=db.scalar(select(func.count()).select_from(Alert).where(Alert.severity=='critical')) or 0; resolved=db.scalar(select(func.count()).select_from(Alert).where(Alert.status.in_(['resolved','closed']))) or 0; active_devices=db.scalar(select(func.count()).select_from(Device).where(Device.active==True)) or 0
    open_inc=db.scalar(select(func.count()).select_from(Incident).where(Incident.status.in_(['open','investigating']))) or 0
    return {'events_monitored':total,'critical_alerts':critical,'resolved_alerts':resolved,'active_agents':active_devices,'open_investigations':open_inc,'alert_resolution_rate':round((resolved/max(1,critical))*100,2)}

@app.get('/api/v1/analytics/model-metrics')
def model_metrics(user=Depends(auth_user)):
    import json
    p=Path(settings.model_metrics_path)
    if not p.exists(): return {'available':False,'metrics':{}}
    try: return {'available':True,'metrics':json.loads(p.read_text())}
    except Exception: return {'available':False,'metrics':{}}

@app.get('/api/v1/reports/events.csv')
def events_csv(db:Session=Depends(get_db),user=Depends(require_roles('admin','manager','analyst','engineer'))):
    rows=db.scalars(select(SecurityEvent).order_by(desc(SecurityEvent.timestamp)).limit(10000)).all();out=io.StringIO();w=csv.writer(out);w.writerow(['event_id','timestamp','user','employee_id','department','event_type','device','risk_score','risk_level','anomaly_score','indicators'])
    for e in rows:w.writerow([e.event_id,e.timestamp,e.username or e.user_id,e.employee_id,e.department,e.event_type,e.device_name or e.device_id,e.risk_score,e.risk_level,e.anomaly_score,';'.join(e.risk_indicators or [])])
    return StreamingResponse(iter([out.getvalue()]),media_type='text/csv',headers={'Content-Disposition':'attachment; filename=insider-threat-events.csv'})

@app.get('/api/v1/reports/events.xlsx')
def events_xlsx(db:Session=Depends(get_db),user=Depends(require_roles('admin','manager','analyst','engineer'))):
    from openpyxl import Workbook
    rows=db.scalars(select(SecurityEvent).order_by(desc(SecurityEvent.timestamp)).limit(10000)).all()
    wb=Workbook(); ws=wb.active; ws.title='Security Events'
    headers=['event_id','timestamp','user','employee_id','department','event_type','device','risk_score','risk_level','anomaly_score','indicators']
    ws.append(headers)
    for e in rows: ws.append([e.event_id,e.timestamp,e.username or e.user_id,e.employee_id,e.department,e.event_type,e.device_name or e.device_id,e.risk_score,e.risk_level,e.anomaly_score,';'.join(e.risk_indicators or [])])
    for cell in ws[1]: cell.font=cell.font.copy(bold=True)
    ws.freeze_panes='A2'; ws.auto_filter.ref=ws.dimensions
    buf=io.BytesIO(); wb.save(buf); buf.seek(0)
    return StreamingResponse(buf,media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',headers={'Content-Disposition':'attachment; filename=insider-threat-events.xlsx'})

@app.get('/api/v1/reports/events.pdf')
def events_pdf(db:Session=Depends(get_db),user=Depends(require_roles('admin','manager','analyst','engineer'))):
    from reportlab.lib.pagesizes import A4
    from reportlab.pdfgen import canvas
    rows=db.scalars(select(SecurityEvent).order_by(desc(SecurityEvent.timestamp)).limit(250)).all();buf=io.BytesIO();c=canvas.Canvas(buf,pagesize=A4);w,h=A4;y=h-40
    c.setFont('Helvetica-Bold',14);c.drawString(40,y,'ITBIS Insider Threat Event Report');y-=18;c.setFont('Helvetica',8);c.drawString(40,y,f'Generated {now().isoformat()}');y-=18
    for e in rows:
        line=f'{e.timestamp} | {e.username or e.user_id} | {e.event_type} | risk={e.risk_score} {e.risk_level} | anomaly={e.anomaly_score}'
        c.drawString(40,y,line[:125]);y-=11
        if y<40:c.showPage();y=h-40;c.setFont('Helvetica',8)
    c.save();buf.seek(0);return StreamingResponse(buf,media_type='application/pdf',headers={'Content-Disposition':'attachment; filename=insider-threat-report.pdf'})
