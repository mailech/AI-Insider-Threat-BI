from pathlib import Path
import pandas as pd
p=Path('data/cert/raw');p.mkdir(parents=True,exist_ok=True)
dates=pd.date_range('2026-01-01',periods=20,freq='D')
users=[f'U{i:03d}' for i in range(1,11)]
for name,activity in [('logon','Logon'),('device','Connect'),('file','FileCopy'),('email','Send')]:
 rows=[]
 for d in dates:
  for u in users:
   n=2 if name=='logon' else 1
   for i in range(n):rows.append({'id':f'{name}-{d:%Y%m%d}-{u}-{i}','date':d+pd.Timedelta(hours=9+i),'user':u,'pc':f'PC{i%3}','activity':activity,'size':100000 if name in ['file','email'] else 0})
 pd.DataFrame(rows).to_csv(p/f'{name}.csv',index=False)
print('Generated small synthetic smoke-test data under data/cert/raw. It is NOT CERT data.')
