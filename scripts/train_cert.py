"""Train CERT r4.2 anomaly/classification models.

Usage:
  python scripts/train_cert.py --data data/cert/raw --answers data/cert/answers/insiders.csv

The dataset itself is NOT bundled in this repository. It must be obtained through
its authorized distribution channel. The pipeline expects logon/device/file/email/http CSVs.
"""
import argparse,json,sys
from pathlib import Path
import joblib,pandas as pd,numpy as np
from sklearn.ensemble import IsolationForest,RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report,precision_recall_fscore_support,roc_auc_score
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'backend'))
from app.services.cert_pipeline import build_user_day,add_labels
from app.services.features import FEATURE_NAMES

def main():
 p=argparse.ArgumentParser()
 p.add_argument('--data',required=True)
 p.add_argument('--answers')
 p.add_argument('--out',default='ml/models')
 p.add_argument('--max-rows',type=int,default=None,help='Sample rows per CSV for memory-constrained training')
 a=p.parse_args()
 out=Path(a.out);out.mkdir(parents=True,exist_ok=True)
 df=build_user_day(a.data,max_rows=a.max_rows);df=add_labels(df,a.answers)
 cols=[c for c in FEATURE_NAMES if c in df.columns]
 X=df[cols].replace([np.inf,-np.inf],0).fillna(0)
 iso=IsolationForest(n_estimators=300,contamination='auto',random_state=42,n_jobs=-1);iso.fit(X)
 joblib.dump({'model':iso,'features':cols},out/'isolation_forest.joblib')
 metrics={'rows':len(df),'features':cols,'labels':int(df.label.sum())}
 if df.label.nunique()>1:
  Xtr,Xte,ytr,yte=train_test_split(X,df.label,test_size=.25,random_state=42,stratify=df.label)
  clf=RandomForestClassifier(n_estimators=300,class_weight='balanced_subsample',random_state=42,n_jobs=-1,max_depth=14);clf.fit(Xtr,ytr)
  pred=clf.predict(Xte);proba=clf.predict_proba(Xte)[:,1]
  p1,r1,f1,_=precision_recall_fscore_support(yte,pred,average='binary',zero_division=0)
  metrics.update({'precision':float(p1),'recall':float(r1),'f1':float(f1),'roc_auc':float(roc_auc_score(yte,proba))})
  joblib.dump({'model':clf,'features':cols},out/'insider_classifier.joblib')
 df.to_csv(out/'cert_user_day_features.csv',index=False)
 (out/'model_metrics.json').write_text(json.dumps(metrics,indent=2))
 print(json.dumps(metrics,indent=2))
if __name__=='__main__':main()
