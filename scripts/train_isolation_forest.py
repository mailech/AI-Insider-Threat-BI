"""Train a baseline anomaly model from a CERT-derived feature CSV.
Expected columns: hour,event_type_length,bytes_transferred,is_data_event,is_privilege_event
"""
import argparse, joblib, pandas as pd
from sklearn.ensemble import IsolationForest
p=argparse.ArgumentParser(); p.add_argument('csv'); p.add_argument('--out',default='ml/models/isolation_forest.joblib'); a=p.parse_args()
df=pd.read_csv(a.csv); cols=['hour','event_type_length','bytes_transferred','is_data_event','is_privilege_event']; X=df[cols].fillna(0)
model=IsolationForest(n_estimators=200,contamination='auto',random_state=42); model.fit(X); joblib.dump(model,a.out); print('saved',a.out)
