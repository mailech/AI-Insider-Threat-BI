from datetime import datetime
from typing import Any
from pydantic import BaseModel, Field, ConfigDict

class CanonicalEvent(BaseModel):
    model_config=ConfigDict(extra='ignore')
    event_id:str; event_type:str; source_dataset:str; raw_event_id:str|None=None
    timestamp:datetime; ingested_at:datetime|None=None; user_id:str; username:str|None=None
    user_email:str|None=None; employee_id:str|None=None; department:str|None=None
    device_id:str|None=None; device_name:str|None=None; device_type:str|None=None
    ip_address:str|None=None; mac_address:str|None=None; operating_system:str|None=None
    target_resource:str|None=None; target_type:str|None=None; action:str|None=None; result:str|None=None
    bytes_transferred:int|None=None; file_count:int|None=None; location:str|None=None
    country:str|None=None; city:str|None=None; is_remote:bool|None=None
    risk_indicators:list[str]=Field(default_factory=list); risk_score:float|None=None; risk_level:str|None=None
    raw_payload:dict[str,Any]|None=None; enrichments:dict[str,Any]|None=None; tags:list[str]=Field(default_factory=list)
    def idem(self,agent_id:str)->str:return f'{agent_id}:{self.source_dataset}:{self.raw_event_id or self.event_id}'

class EventBatch(BaseModel):
    agent_id:str; submitted_at:datetime|None=None; events:list[CanonicalEvent]=Field(min_length=1,max_length=5000)
class LoginRequest(BaseModel): username:str; password:str
class AlertUpdate(BaseModel): status:str
class IncidentCreate(BaseModel): title:str; severity:str='medium'; assignee:str|None=None; notes:str|None=None; alert_ids:list[int]=Field(default_factory=list)
class IncidentUpdate(BaseModel): status:str|None=None; assignee:str|None=None; notes:str|None=None; alert_ids:list[int]|None=None; severity:str|None=None
class EmployeeCreate(BaseModel): employee_id:str; username:str; department:str|None=None; designation:str|None=None; manager:str|None=None; access_privileges:list[str]=Field(default_factory=list)
class UserCreate(BaseModel): username:str; password:str; role:str='analyst'; employee_id:str|None=None
class EnrollRequest(BaseModel): device_id:str; device_name:str
