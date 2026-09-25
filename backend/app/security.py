import hashlib, hmac, secrets
from datetime import datetime, timedelta, timezone
from jose import jwt
from .settings import settings

def hash_secret(value:str)->str:
    return hashlib.sha256((settings.secret_pepper+value).encode()).hexdigest()
def verify_secret(value:str, digest:str)->bool:
    return hmac.compare_digest(hash_secret(value), digest)
def make_password(password:str)->str:
    salt=secrets.token_hex(16)
    dk=hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 220000)
    return f'pbkdf2$220000${salt}${dk.hex()}'
def verify_password(password:str, stored:str)->bool:
    try:
        _,iters,salt,hexhash=stored.split('$',3)
        dk=hashlib.pbkdf2_hmac('sha256',password.encode(),salt.encode(),int(iters))
        return hmac.compare_digest(dk.hex(),hexhash)
    except Exception:return False
def create_token(user_id:int,username:str,role:str)->str:
    now=datetime.now(timezone.utc)
    return jwt.encode({'sub':str(user_id),'username':username,'role':role,'iat':now,'exp':now+timedelta(hours=8)},settings.jwt_secret,algorithm='HS256')
def decode_token(token:str):
    return jwt.decode(token,settings.jwt_secret,algorithms=['HS256'])
def new_agent_key()->str:
    return 'itbis_ag_'+secrets.token_urlsafe(32)
