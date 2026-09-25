"""CERT r4.2 feature engineering. Works with logon/device/file/email/http CSVs."""
from pathlib import Path
import pandas as pd, numpy as np
from .features import FEATURE_NAMES

def _read(path, max_rows=None):
    if not path.exists(): return pd.DataFrame()
    # Read only needed columns to keep memory small and prevent OOM
    try:
        header = pd.read_csv(path, nrows=0).columns
        drop_cols = {'content', 'to', 'cc', 'bcc', 'from'}
        usecols = [c for c in header if c.lower().strip() not in drop_cols]
    except Exception:
        usecols = None
    df = pd.read_csv(path, usecols=usecols, low_memory=False, on_bad_lines='skip', nrows=max_rows)
    df.columns = [str(c).strip().lower() for c in df.columns]
    if 'date' not in df or 'user' not in df: return pd.DataFrame()
    df['datetime'] = pd.to_datetime(df['date'], errors='coerce')
    df = df.dropna(subset=['datetime'])
    df['day'] = df['datetime'].dt.date
    return df

def build_user_day(raw_dir, max_rows=None):
    root=Path(raw_dir); parts=[]
    specs=[('logon','logon'),('device','device'),('file','file'),('email','email'),('http','http')]
    for name,kind in specs:
        p=root/f'{name}.csv'
        df=_read(p, max_rows=max_rows)
        if df.empty: continue
        g=df.groupby(['user','day'],as_index=False).size().rename(columns={'size':f'{kind}_count'})
        for c in ['activity','pc','url','to','from','filename','content','size','attachments']:
            if c in df.columns:
                if c=='activity':
                    vals=df.assign(_v=df[c].astype(str).str.lower()).groupby(['user','day'])['_v'].agg(lambda s: ' '.join(s)).reset_index()
                    vals[f'{kind}_after_hours']=vals['_v'].str.contains('logon|connect|send|write|copy',regex=True,na=False).astype(int)
                    vals=vals.drop(columns=['_v']); g=g.merge(vals,on=['user','day'],how='left')
                elif c in {'size','attachments'}:
                    num=pd.to_numeric(df[c],errors='coerce').fillna(0)
                    tmp=df.assign(_num=num).groupby(['user','day'])['_num'].sum().reset_index(name=f'{kind}_{c}_sum')
                    g=g.merge(tmp,on=['user','day'],how='left')
                elif c=='pc':
                    tmp=df.groupby(['user','day'])[c].nunique().reset_index(name=f'{kind}_unique_pc'); g=g.merge(tmp,on=['user','day'],how='left')
        parts.append(g)
    if not parts: raise FileNotFoundError('No CERT CSV files found')
    out=parts[0]
    for p in parts[1:]: out=out.merge(p,on=['user','day'],how='outer')
    out=out.fillna(0)
    out['hour']=0; out['after_hours']=0; out['auth_event']=(out.filter(like='logon_count').sum(axis=1)>0).astype(int)
    out['privilege_event']=0; out['file_event']=out.filter(like='file_count').sum(axis=1)
    out['usb_event']=out.filter(like='device_count').sum(axis=1)
    out['network_event']=out.filter(like='http_count').sum(axis=1)
    out['process_event']=0; out['email_event']=out.filter(like='email_count').sum(axis=1)
    out['remote']=0
    out['log_bytes']=np.log1p(out.filter(like='size_sum').sum(axis=1))
    out['log_files']=np.log1p(out['file_event'])
    out['indicator_count']=0
    return out

def add_labels(features,answers_path=None):
    features=features.copy(); features['label']=0
    if answers_path and Path(answers_path).exists():
        ans=pd.read_csv(answers_path,low_memory=False); ans.columns=[str(c).lower().strip() for c in ans.columns]
        if 'user' in ans.columns:
            malicious=set(ans['user'].astype(str))
            features.loc[features['user'].astype(str).isin(malicious),'label']=1
    return features
