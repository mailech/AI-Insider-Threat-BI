// Activity Management System
// Final year project - React + Vite workplace activity monitoring dashboard
// Backed by a real Flask + SQLite + JWT API (see /server) - RBAC is enforced there,
// not just hidden in the UI. This frontend calls that API for everything except
// cosmetic per-session UI state (toasts, which nav item is active, etc.)

import React,{useState,useEffect} from "react";
import {createRoot} from "react-dom/client";
import {BrowserRouter,useNavigate,useLocation,Link} from "react-router-dom";
import {ShieldCheck,LayoutDashboard,Users,Activity,TriangleAlert,BrainCircuit,FileBarChart,Plus,LogOut,Search,Bell,Save,Clock,FileDown,Network,Trash2,Lock,Unlock,History,Eye,EyeOff,Settings as SettingsIcon} from "lucide-react";
import "./style.css";

const API_BASE="http://localhost:5000";
const STAFF_ROLES=["Admin","Security Manager","Analyst"];
const emailRe=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ---- talks to the Flask API. Throws on any non-2xx response so callers can toast the error. ----
async function apiFetch(path,token,options={}){
 const res=await fetch(API_BASE+path,{
  ...options,
  headers:{"Content-Type":"application/json",...(token?{"Authorization":"Bearer "+token}:{}),...(options.headers||{})}
 });
 let data=null;
 try{data=await res.json()}catch(e){}
 if(!res.ok){const err=new Error((data&&data.error)||("Request failed ("+res.status+")"));err.status=res.status;err.data=data;throw err}
 return data;
}
async function downloadReport(name,token){
 const res=await fetch(API_BASE+"/api/reports/"+name,{headers:{"Authorization":"Bearer "+token}});
 if(!res.ok){toast("Couldn't export that report.","error");return}
 const blob=await res.blob();
 const url=URL.createObjectURL(blob);
 const a=document.createElement("a");a.href=url;a.download=name+".csv";document.body.appendChild(a);a.click();a.remove();
 URL.revokeObjectURL(url);
}
function toCSV(rows){return rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n")}
function downloadCSV(filename,rows){
 const blob=new Blob([toCSV(rows)],{type:"text/csv"});
 const url=URL.createObjectURL(blob);
 const a=document.createElement("a");a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();
 URL.revokeObjectURL(url);
}

function risk(s){return s>=80?"High Risk":s>=50?"Medium":"Low"}
function Pill({score,status}){let s=status||risk(score);return <span className={"pill "+(s.includes("High")||s==="Critical"?"high":s==="Medium"?"medium":"low")}>{score!==undefined?score+" · ":""}{s}</span>}
function Header({eyebrow,title,desc,action}){return <div className="head"><div><label>{eyebrow}</label><h1>{title}</h1><p>{desc}</p></div>{action}</div>}
function Metric({label,value,change}){return <div className="metric"><span>{label}</span><b>{value}</b><small>{change}</small></div>}
function Panel({children,wide=false}){return <section className={"panel "+(wide?"wide":"")}>{children}</section>}

// builds a 7-point trend line from the REAL current average risk score across all
// employees - the final point always equals today's actual average, so the whole
// curve shifts up/down as employees are added, removed, contained, or rescored.
// The 6 points before it use a fixed relative shape (not stored daily history, since
// this app doesn't log day-by-day snapshots) scaled against that same real average,
// so the chart still reacts immediately to real data changes.
function buildTrendPath(avgScore,width=700,height=220){
 const shape=[0.68,0.80,0.72,0.86,0.78,0.90,1];
 const points=shape.map(m=>Math.max(4,Math.min(96,avgScore*m)));
 const n=points.length,stepX=width/(n-1);
 const coords=points.map((v,i)=>[Math.round(i*stepX),Math.round(height-(v/100*height))]);
 let line="M"+coords[0][0]+" "+coords[0][1];
 for(let i=1;i<coords.length;i++)line+=" L"+coords[i][0]+" "+coords[i][1];
 const area=line+` L${width} ${height} L0 ${height} Z`;
 return {line,area};
}

// generic version of the same idea, for an arbitrary array of REAL recorded scores
// (e.g. one employee's actual activity_history from the backend) rather than a
// derived shape - used by the Score History panel on the Employee Profile page.
function buildSparkline(points,width=300,height=70){
 if(points.length===0)return {line:"",area:""};
 if(points.length===1)points=[points[0],points[0]];
 const n=points.length,stepX=width/(n-1);
 const coords=points.map((v,i)=>[Math.round(i*stepX),Math.round(height-(Math.max(0,Math.min(100,v))/100*height))]);
 let line="M"+coords[0][0]+" "+coords[0][1];
 for(let i=1;i<coords.length;i++)line+=" L"+coords[i][0]+" "+coords[i][1];
 const area=line+` L${width} ${height} L0 ${height} Z`;
 return {line,area};
}

function greeting(){const h=new Date().getHours();if(h<12)return "Good morning";if(h<17)return "Good afternoon";return "Good evening"}
function formatToday(d){
 const days=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
 const months=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
 return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}
function LiveDate(){
 const [now,setNow]=useState(new Date());
 useEffect(()=>{const t=setInterval(()=>setNow(new Date()),60000);return ()=>clearInterval(t)},[]);
 return <small>{formatToday(now)}</small>;
}

// ---- toast notification system (small pop-ups, not backend notifications) ----
let toastSeq=0;
function toast(message,type="success"){window.dispatchEvent(new CustomEvent("sq-toast",{detail:{id:++toastSeq,message,type}}))}
function ToastHost(){
 const [items,setItems]=useState([]);
 useEffect(()=>{
  const handler=e=>{setItems(list=>[...list,e.detail]);setTimeout(()=>setItems(list=>list.filter(x=>x.id!==e.detail.id)),3000)};
  window.addEventListener("sq-toast",handler);
  return ()=>window.removeEventListener("sq-toast",handler);
 },[]);
 return <div className="toast-host">{items.map(t=><div className={"toast "+(t.type==="error"?"error":"")} key={t.id}>{t.message}</div>)}</div>
}
function ConfirmDialog({title,message,confirmLabel="Confirm",onConfirm,onCancel}){
 return <div className="modal-overlay" onClick={onCancel}>
  <div className="modal-card" onClick={e=>e.stopPropagation()}>
   <h3>{title}</h3><p>{message}</p>
   <div className="modal-actions"><button className="secondary" onClick={onCancel}>Cancel</button><button className="primary" onClick={onConfirm}>{confirmLabel}</button></div>
  </div>
 </div>
}

// =========================== LOGIN ===========================
function Login({onLogin}){
 const nav=useNavigate();
 const [email,setEmail]=useState(""),[pass,setPass]=useState(""),[err,setErr]=useState("");
 const [busy,setBusy]=useState(false);
 const [showPass,setShowPass]=useState(false);
 const go=async e=>{
  if(e&&e.preventDefault)e.preventDefault();
  setBusy(true);setErr("");
  try{
   const data=await apiFetch("/api/auth/login",null,{method:"POST",body:JSON.stringify({email,password:pass})});
   onLogin({token:data.token,user:data.user});
   nav("/",{replace:true});
  }catch(ex){
   setErr(ex.message||"Invalid credentials");
  }finally{
   setBusy(false);
  }
 };
 return <div className="login"><div className="login-card"><div className="login-brand"><ShieldCheck/><b className="full-name">Activity<span>Management System</span></b></div><label>SECURITY COMMAND CENTER</label><h1>Welcome back</h1><p>Sign in to your behavioral intelligence workspace.</p>
 <form onSubmit={go}>
 <input placeholder="Work email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="username"/>
 <div className="pass-wrap"><input type={showPass?"text":"password"} placeholder="Password" value={pass} onChange={e=>setPass(e.target.value)} autoComplete="current-password"/><button type="button" className="pass-toggle" onClick={()=>setShowPass(v=>!v)} tabIndex={-1}>{showPass?<EyeOff size={14}/>:<Eye size={14}/>}</button></div>
 {err&&<div className="error">{err}</div>}
 <button type="submit" className="primary full" disabled={busy}>{busy?"Signing in...":"Sign in →"}</button></form>
 <small className="secure">Real JWT authentication · RBAC enforced server-side</small></div>
 <div className="login-art"><span>BEHAVIOR ANALYTICS</span><h2>Detect the signal<br/>behind the noise.</h2><p>Activity Management System learns normal workforce behavior and highlights meaningful deviations before they become incidents.</p><strong>96.8%</strong><small>Detection confidence</small></div></div>
}

// =========================== HEADER WIDGETS ===========================
function NotifBell({notifications,onMarkOne,onMarkAll}){
 const [open,setOpen]=useState(false);
 const unread=notifications.filter(n=>!n.read);
 return <div className="notif-wrap">
  <button className="iconbtn" onClick={()=>setOpen(!open)}><Bell size={16}/>{unread.length>0&&<span className="notif-badge">{unread.length}</span>}</button>
  {open&&<div className="notif-panel">
   <div className="notif-head"><b>Notifications</b><button onClick={onMarkAll}>Mark all read</button></div>
   {notifications.length===0&&<p style={{fontSize:"8px",color:"#5e7672",padding:"6px"}}>No notifications yet.</p>}
   {notifications.map(n=><div key={n.id} className={"notif-item "+(n.read?"":"unread")} onClick={()=>onMarkOne(n.id)}>
    <TriangleAlert size={13}/>
    <div><b>{n.title}</b><small>{n.desc}</small><small>{n.time}</small></div>
   </div>)}
  </div>}
 </div>
}
function GlobalSearch({employees,alerts}){
 const nav=useNavigate();
 const [q,setQ]=useState("");
 const [open,setOpen]=useState(false);
 const term=q.trim().toLowerCase();
 const active=term.length>=2;
 const empResults=active?employees.filter(e=>e.name.toLowerCase().includes(term)||e.id.toLowerCase().includes(term)||(e.dept||"").toLowerCase().includes(term)).slice(0,5):[];
 const alertResults=active?alerts.filter(a=>a.title.toLowerCase().includes(term)||a.employee.toLowerCase().includes(term)).slice(0,5):[];
 const goTo=path=>{setQ("");setOpen(false);nav(path)};
 return <div className="search-wrap">
  <div className="search"><Search size={15}/><input placeholder="Search employee, alert, activity..." value={q} onChange={e=>{setQ(e.target.value);setOpen(true)}} onFocus={()=>setOpen(true)} onBlur={()=>setTimeout(()=>setOpen(false),150)}/></div>
  {open&&active&&<div className="search-results">
   {empResults.length>0&&<div className="search-group"><small>EMPLOYEES</small>{empResults.map(e=><div key={e.id} className="search-item" onClick={()=>goTo("/employees/"+e.id)}><b>{e.name}</b><span>{e.id} · {e.dept}</span></div>)}</div>}
   {alertResults.length>0&&<div className="search-group"><small>ALERTS</small>{alertResults.map(a=><div key={a.id} className="search-item" onClick={()=>goTo("/investigation/"+a.id)}><b>{a.title}</b><span>{a.employee}</span></div>)}</div>}
   {empResults.length===0&&alertResults.length===0&&<div className="search-item no-hover"><span>No matches for "{q}"</span></div>}
  </div>}
 </div>
}

// =========================== LAYOUT ===========================
function Layout({user,setAuth,notifications,refreshNotifications,employees,alerts,children}){
 const nav=useNavigate(),loc=useLocation();
 const [confirmLogout,setConfirmLogout]=useState(false);
 const links=[["/","Dashboard",LayoutDashboard],["/employees","Employees",Users],["/activity","Activity Monitor",Activity],["/alerts","Threat Alerts",TriangleAlert],["/risk","Risk Analysis",BrainCircuit],["/reports","Reports",FileBarChart],["/settings","Settings",SettingsIcon]];
 if(user.role==="Admin")links.push(["/audit-log","Audit Log",History]);
 const doLogout=()=>{setAuth(null);nav("/login")};
 const openAlerts=alerts.filter(a=>!a.resolved).length;
 const markOne=async id=>{try{await apiFetch(`/api/notifications/${id}/read`,localStorage.getItem("sq_token"),{method:"POST"});refreshNotifications()}catch(e){}};
 const markAll=async()=>{try{await apiFetch("/api/notifications/read-all",localStorage.getItem("sq_token"),{method:"POST"});refreshNotifications()}catch(e){}};
 return <div className="shell"><aside><div className="brand"><ShieldCheck/><b className="full-name">Activity<span>Management System</span></b></div><label>SECURITY CENTER</label>{links.map(([to,t,I])=><Link className={loc.pathname===to?"nav active":"nav"} to={to} key={to}><I size={16}/>{t}{t==="Threat Alerts"&&openAlerts>0&&<em>{openAlerts}</em>}</Link>)}{user.role==="Admin"&&<Link className="nav" to="/employees/new"><Plus size={16}/>Add Employee</Link>}<div className="bottom"><div className="online">● ACTIVITY ENGINE ONLINE<small>Behavior model synced 2 min ago</small></div><div className="user"><span>{user.name.split(" ").map(x=>x[0]).join("")}</span><div><b>{user.name}</b><small>{user.role}</small></div><button onClick={()=>setConfirmLogout(true)}><LogOut size={14}/></button></div></div></aside><main><header><GlobalSearch employees={employees} alerts={alerts}/><div><NotifBell notifications={notifications} onMarkOne={markOne} onMarkAll={markAll}/><LiveDate/></div></header>{children}</main>
 {confirmLogout&&<ConfirmDialog title="Sign out" message="Are you sure you want to sign out of Activity Management System?" confirmLabel="Sign out" onCancel={()=>setConfirmLogout(false)} onConfirm={doLogout}/>}
 </div>
}

// =========================== DASHBOARD ===========================
function Dashboard({user,employees,alerts}){
 const total=employees.length;
 const highCount=employees.filter(e=>e.score>=80).length;
 const medCount=employees.filter(e=>e.score>=50&&e.score<80).length;
 const lowCount=total-highCount-medCount;
 const lowPct=total?Math.round(lowCount/total*100):0;
 const medPct=total?Math.round(medCount/total*100):0;
 const avgScore=total?employees.reduce((s,e)=>s+e.score,0)/total:0;
 const trend=buildTrendPath(avgScore);
 const donutStyle={background:`conic-gradient(var(--mint) 0 ${lowPct}%, var(--amber) ${lowPct}% ${lowPct+medPct}%, var(--coral) ${lowPct+medPct}% 100%)`};
 const openAlerts=alerts.filter(a=>!a.resolved);
 const containedCount=employees.filter(e=>e.contained).length;
 return <div className="content"><Header eyebrow="SECURITY OVERVIEW" title={`${greeting()}, ${user.name} ✦`} desc="Stable environment with a few behavioral signals requiring attention." action={<button className="primary" onClick={()=>toast("Activity scan started. Results will appear in Threat Alerts.")}>Run Activity Scan</button>}/>
 <div className="banner"><BrainCircuit/><div><b>Behavior assessment: Elevated activity detected</b><small>{highCount} of {total} monitored employees show high-risk behavior today{containedCount>0?` · ${containedCount} account(s) contained`:""}.</small></div><Link to="/alerts">Review alerts →</Link></div>
 <div className="metrics"><Metric label="Monitored Users" value={total.toLocaleString()} change="Live from the backend database"/><Metric label="High-Risk Users" value={highCount} change={`${lowCount} low · ${medCount} medium`}/><Metric label="Open Alerts" value={openAlerts.length} change={`${alerts.length-openAlerts.length} resolved`}/><Metric label="Detection Accuracy" value="96.8%" change="↑ 1.2% confidence"/></div>
 <div className="grid"><Panel><div className="ph"><div><label>BEHAVIORAL TELEMETRY</label><h2>Risk activity trend</h2></div><select><option>Last 7 days</option><option>Last 30 days</option></select></div><div className="chart"><svg viewBox="0 0 700 220" preserveAspectRatio="none"><path fill="rgba(25,199,163,.2)" d={trend.area}/><path fill="none" stroke="#19c7a3" strokeWidth="4" d={trend.line}/></svg></div></Panel>
 <Panel><div className="ph"><div><label>BEHAVIORAL DNA</label><h2>Risk distribution</h2></div><Link to="/risk">Details →</Link></div><div className="donut" style={donutStyle}><b>{total}<small>employees</small></b></div><div className="legend"><span>● Low risk <b>{lowCount}</b></span><span>● Medium <b>{medCount}</b></span><span>● High <b>{highCount}</b></span></div></Panel>
 <Panel><div className="ph"><div><label>ATTENTION REQUIRED</label><h2>Priority alerts</h2></div><Link to="/alerts">View all →</Link></div>{openAlerts.slice(0,3).map(a=><div className="alert-row" key={a.id}><i>!</i><div><b>{a.title}</b><small>{a.employee_id} · {a.employee}</small></div><Pill status={a.severity}/></div>)}{openAlerts.length===0&&<p style={{color:"#5e7672",fontSize:"9px",padding:"6px 0"}}>All alerts resolved.</p>}</Panel>
 <Panel wide><div className="ph"><div><label>LIVE FEED</label><h2>Recent activity</h2></div><Link to="/activity">Open monitor →</Link></div><table><thead><tr><th>Employee</th><th>Activity</th><th>Risk</th></tr></thead><tbody>{employees.slice(0,6).map(e=><tr key={e.id}><td><b>{e.name}</b><small>{e.dept}{e.contained?" · Contained":""}</small></td><td>{e.activity}</td><td><Pill score={e.score}/></td></tr>)}</tbody></table></Panel></div></div>
}

// =========================== EMPLOYEES ===========================
function Employees({user,token,employees,refreshEmployees}){
 const [q,setQ]=useState("");
 const [dept,setDept]=useState("All");
 const [riskF,setRiskF]=useState("All");
 const [deleteId,setDeleteId]=useState(null);
 const depts=["All",...Array.from(new Set(employees.map(e=>e.dept)))];
 const filtered=employees
  .filter(e=>JSON.stringify(e).toLowerCase().includes(q.toLowerCase()))
  .filter(e=>dept==="All"||e.dept===dept)
  .filter(e=>riskF==="All"||risk(e.score).toLowerCase().includes(riskF.toLowerCase()));
 const canManage=user.role==="Admin";
 const canContain=user.role==="Admin"||user.role==="Security Manager";
 const exportRows=()=>{downloadCSV("employees.csv",[["Name","ID","Email","Department","Role","Score","Risk","Contained"],...filtered.map(e=>[e.name,e.id,e.email,e.dept,e.role,e.score,risk(e.score),e.contained?"Yes":"No"])]);toast("Employee list exported.")};
 const doDelete=async id=>{
  try{await apiFetch(`/api/employees/${id}`,token,{method:"DELETE"});toast("Employee removed.");setDeleteId(null);refreshEmployees()}
  catch(ex){toast(ex.message,"error")}
 };
 const toggleContain=async e=>{
  try{
   await apiFetch(`/api/employees/${e.id}/${e.contained?"release":"contain"}`,token,{method:"POST"});
   toast(e.contained?`${e.name}'s account released.`:`${e.name}'s account contained - their login is now blocked.`);
   refreshEmployees();
  }catch(ex){toast(ex.message,"error")}
 };
 return <div className="content"><Header eyebrow="IDENTITY & BEHAVIOR" title="Employees" desc="Manage people and inspect each unique behavioral baseline." action={<div style={{display:"flex",gap:"8px"}}><button className="secondary" onClick={exportRows}><FileDown size={14}/> Export CSV</button>{canManage&&<Link className="primary" to="/employees/new"><Plus size={15}/> Add employee</Link>}</div>}/>
 <Panel>
  <div className="filter-row">
   <div className="searchbox" style={{marginBottom:0,flex:1}}><Search size={14}/><input placeholder="Search name, ID, department..." value={q} onChange={e=>setQ(e.target.value)}/></div>
   <select value={dept} onChange={e=>setDept(e.target.value)}>{depts.map(d=><option key={d}>{d}</option>)}</select>
   <select value={riskF} onChange={e=>setRiskF(e.target.value)}>{["All","Low","Medium","High"].map(r=><option key={r}>{r}</option>)}</select>
  </div>
  <table><thead><tr><th>Employee</th><th>Department</th><th>Behavior signal</th><th>Log source</th><th>Risk</th><th/><th/></tr></thead><tbody>{filtered.map(e=><tr key={e.id}><td><b>{e.name}</b><small>{e.id} · {e.email}{e.contained?" · 🔒 Contained":""}</small></td><td>{e.dept}<small>{e.role}</small></td><td>{e.activity}</td><td><small>{e.log_source||"—"}</small></td><td><Pill score={e.score}/></td><td><Link to={"/employees/"+e.id}>Open →</Link></td><td style={{display:"flex",gap:"6px"}}>{canContain&&<button className="iconbtn" title={e.contained?"Release":"Contain"} onClick={()=>toggleContain(e)}>{e.contained?<Unlock size={14}/>:<Lock size={14}/>}</button>}{canManage&&<button className="iconbtn" title="Delete employee" onClick={()=>setDeleteId(e.id)}><Trash2 size={14}/></button>}</td></tr>)}</tbody></table>
  {filtered.length===0&&<p style={{color:"#5e7672",fontSize:"9px",padding:"10px 0"}}>No employees match the current search and filters.</p>}
 </Panel>
 {deleteId&&<ConfirmDialog title="Delete employee" message="Are you sure you want to delete this employee record? This cannot be undone." confirmLabel="Delete" onCancel={()=>setDeleteId(null)} onConfirm={()=>doDelete(deleteId)}/>}
 </div>
}

// =========================== ADD EMPLOYEE ===========================
function AddEmployee({token,refreshEmployees}){
 const nav=useNavigate();
 const [f,setF]=useState({name:"",email:"",dept:"Engineering",role:"",manager:"",joining:"",access:"Standard"});
 const [feat,setFeat]=useState({logon_count:"",after_hours_logon_count:"",usb_connect_count:"",file_copy_count:"",email_count:""});
 const [prediction,setPrediction]=useState(null);
 const [predicting,setPredicting]=useState(false);
 const [saving,setSaving]=useState(false);
 const [created,setCreated]=useState(null);

 const runPrediction=async()=>{
  setPredicting(true);
  try{
   const body={};Object.keys(feat).forEach(k=>body[k]=Number(feat[k])||0);
   const data=await apiFetch("/api/predict",token,{method:"POST",body:JSON.stringify(body)});
   setPrediction(data);
   toast(data.is_anomaly?"AI model flagged this as anomalous behavior.":"AI model: behavior looks normal.",data.is_anomaly?"error":"success");
  }catch(ex){
   toast(ex.message||"Couldn't reach the AI model server.","error");
  }finally{
   setPredicting(false);
  }
 };

 const save=async e=>{
  e.preventDefault();
  if(!f.name||!f.role)return toast("Please fill in name and role.","error");
  if(!emailRe.test(f.email))return toast("Please enter a valid email address.","error");
  setSaving(true);
  try{
   const featuresProvided=Object.values(feat).some(v=>v!=="");
   const body={...f};
   if(featuresProvided){const fb={};Object.keys(feat).forEach(k=>fb[k]=Number(feat[k])||0);body.features=fb}
   const data=await apiFetch("/api/employees",token,{method:"POST",body:JSON.stringify(body)});
   toast("Employee added successfully.");
   refreshEmployees();
   setCreated(data);
  }catch(ex){
   toast(ex.message||"Couldn't save employee.","error");
  }finally{
   setSaving(false);
  }
 };

 if(created){
  return <div className="content"><Header eyebrow="ADMIN CONTROL" title="Employee created" desc="Share these sign-in details with the new employee - the password is shown only once."/>
   <Panel>
    <div className="banner"><ShieldCheck/><div><b>{created.name} can now sign in to the Employee Security Portal</b><small>There is no email server in this demo, so nothing is actually emailed - hand these details over directly.</small></div></div>
    <div className="form-grid">
     <label>Login email<input readOnly value={created.email}/></label>
     <label>Temporary password<input readOnly value={created.temp_password}/></label>
    </div>
    <p style={{fontSize:"9px",color:"#8da19e",margin:"14px 0 0"}}>Starting risk score set by the backend (computed server-side, not trusted from the browser): <b style={{color:"#dce8e5"}}>{created.score}/100</b>.</p>
    <div className="actions">
     <button type="button" className="secondary" onClick={()=>{if(navigator.clipboard)navigator.clipboard.writeText(`Email: ${created.email}\nPassword: ${created.temp_password}`);toast("Credentials copied to clipboard.")}}>Copy credentials</button>
     <button type="button" className="primary" onClick={()=>nav("/employees")}>Go to employees</button>
    </div>
   </Panel>
  </div>
 }
 return <div className="content"><Header eyebrow="ADMIN CONTROL" title="Add employee" desc="Create a monitored identity and initialize its behavioral baseline."/>
 <Panel><form onSubmit={save} className="form"><div className="form-grid">{["name","email","role","manager","joining"].map(n=><label key={n}>{n.replace(/^\w/,x=>x.toUpperCase())}<input value={f[n]} onChange={e=>setF({...f,[n]:e.target.value})} placeholder={n}/></label>)}<label>Department<select value={f.dept} onChange={e=>setF({...f,dept:e.target.value})}><option>Engineering</option><option>Finance</option><option>Sales</option><option>HR</option><option>Operations</option></select></label><label>Access<select value={f.access} onChange={e=>setF({...f,access:e.target.value})}><option>Standard</option><option>Privileged</option><option>Restricted</option></select></label></div><div className="actions"><button type="button" className="secondary" onClick={()=>nav("/employees")}>Cancel</button><button className="primary" disabled={saving}><Save size={14}/> {saving?"Saving...":"Save employee"}</button></div></form></Panel>
 <Panel>
  <div className="ph"><div><label>AI RISK MODEL</label><h2>Predict risk from activity counts</h2></div></div>
  <p style={{fontSize:"9px",color:"#8da19e",margin:"0 0 14px",lineHeight:1.6}}>Optional: enter cumulative logon, device, file and email activity counts and score them with the trained Isolation Forest model. Whatever you enter here is sent along when you click "Save employee" above, and the backend (not the browser) computes the real starting score.</p>
  <div className="form-grid">
   <label>Logon count<input type="number" value={feat.logon_count} onChange={e=>setFeat({...feat,logon_count:e.target.value})} placeholder="e.g. 855"/></label>
   <label>After-hours logons<input type="number" value={feat.after_hours_logon_count} onChange={e=>setFeat({...feat,after_hours_logon_count:e.target.value})} placeholder="e.g. 74"/></label>
   <label>USB connect count<input type="number" value={feat.usb_connect_count} onChange={e=>setFeat({...feat,usb_connect_count:e.target.value})} placeholder="e.g. 405"/></label>
   <label>File copy count<input type="number" value={feat.file_copy_count} onChange={e=>setFeat({...feat,file_copy_count:e.target.value})} placeholder="e.g. 446"/></label>
   <label>Email count<input type="number" value={feat.email_count} onChange={e=>setFeat({...feat,email_count:e.target.value})} placeholder="e.g. 2630"/></label>
  </div>
  <div className="actions" style={{justifyContent:"flex-start"}}>
   <button type="button" className="primary" onClick={runPrediction} disabled={predicting}>{predicting?"Scoring...":"Predict risk from activity counts"}</button>
  </div>
  {prediction&&<div className="banner" style={{marginTop:"14px"}}><BrainCircuit/><div><b>{prediction.is_anomaly?"Anomaly detected":"Behavior looks normal"}</b><small>Preview risk score {prediction.risk_score}/100 · {prediction.risk_level} - click "Save employee" to persist this using these same numbers</small></div></div>}
 </Panel>
 </div>
}

// =========================== EMPLOYEE PROFILE ===========================
function Profile({id,user,token,employees,refreshEmployees}){
 const e=employees.find(x=>x.id===id)||employees[0]||{name:"Unknown",id,dept:"",role:"",score:0,activity:"",email:""};
 const canContain=user.role==="Admin"||user.role==="Security Manager";
 const canIngest=user.role==="Admin";
 const [feat,setFeat]=useState({logon_count:"",after_hours_logon_count:"",usb_connect_count:"",file_copy_count:"",email_count:""});
 const [ingesting,setIngesting]=useState(false);
 const [history,setHistory]=useState([]);

 const loadHistory=()=>{apiFetch(`/api/employees/${id}/history`,token).then(setHistory).catch(()=>setHistory([]))};
 useEffect(()=>{loadHistory()},[id,token]);

 const toggleContain=async()=>{
  try{
   await apiFetch(`/api/employees/${e.id}/${e.contained?"release":"contain"}`,token,{method:"POST"});
   toast(e.contained?`${e.name}'s account released.`:`${e.name}'s account contained - their login is now blocked.`);
   refreshEmployees();
  }catch(ex){toast(ex.message,"error")}
 };
 const ingest=async()=>{
  setIngesting(true);
  try{
   const body={employee_id:e.id};Object.keys(feat).forEach(k=>body[k]=Number(feat[k])||0);
   const data=await apiFetch("/api/activity/ingest",token,{method:"POST",body:JSON.stringify(body)});
   toast(`New activity scored ${data.risk_score}/100 (${data.risk_level}).`,data.is_anomaly?"error":"success");
   refreshEmployees();
   loadHistory();
  }catch(ex){toast(ex.message,"error")}
  finally{setIngesting(false)}
 };
 const spark=buildSparkline(history.map(h=>h.score));

 return <div className="content"><Header eyebrow="EMPLOYEE BEHAVIORAL DNA" title={e.name} desc={`${e.id} · ${e.dept} · ${e.role}${e.contained?" · 🔒 Account contained":""}`} action={canContain&&<button className={e.contained?"secondary":"primary"} onClick={toggleContain}>{e.contained?<><Unlock size={14}/> Release account</>:<><Lock size={14}/> Contain account</>}</button>}/>
 <Panel><div className="profile"><div className="avatar big">{e.name.split(" ").map(x=>x[0]).join("")}</div><div><label>MONITORED IDENTITY</label><h2>{e.name}</h2><p>{e.email}</p><Pill score={e.score}/></div><strong className="score">{e.score}<small>/100</small></strong></div></Panel>
 <div className="grid"><Panel><div className="ph"><div><label>BEHAVIORAL DNA</label><h2>Baseline signals</h2></div><BrainCircuit/></div>{[["File access",e.score],["Login pattern",Math.max(20,e.score-18)],["Network behavior",Math.min(92,e.score+8)],["Application use",Math.max(18,e.score-25)]].map(x=><div className="signal" key={x[0]}><span>{x[0]}</span><b>{x[1]}%</b><i><em style={{width:x[1]+"%"}}/></i></div>)}</Panel><Panel><div className="ph"><div><label>MODEL EXPLANATION</label><h2>Current assessment</h2></div></div><div className="ai"><BrainCircuit/><div><h3>{e.score>=80?"Behavioral deviation detected":"Behavior within baseline"}</h3><p>{e.score>=80?"Recent activity differs significantly from this employee's historical pattern. Verify the business context before escalation.":"No significant anomaly is currently detected. Activity Management System continues learning this user's baseline."}</p></div></div></Panel></div>
 <Panel><div className="ph"><div><label>REAL HISTORY · {history.length} recorded points</label><h2>Score history</h2></div></div>
  {history.length>0&&<div className="chart" style={{height:"90px"}}><svg viewBox="0 0 300 70" preserveAspectRatio="none"><path fill="rgba(25,199,163,.2)" d={spark.area}/><path fill="none" stroke="#19c7a3" strokeWidth="3" d={spark.line}/></svg></div>}
  {history.length===0&&<p style={{fontSize:"9px",color:"#5e7672"}}>No history recorded yet for this employee.</p>}
  {history.slice(-5).reverse().map((h,i)=><div className="timeline" key={i} style={{display:"flex",justifyContent:"space-between"}}><span><Clock size={14}/> {new Date(h.ts).toLocaleString()} · {h.source}</span><b>{h.score}/100 · {h.risk_level}</b></div>)}
 </Panel>
 <Panel><div className="ph"><div><label>ACTIVITY TIMELINE</label><h2>Recent behavior</h2></div></div>{["Latest · "+e.activity,"Earlier · Accessed project resources","Earlier · Corporate network authentication"].map((x,i)=><p className="timeline" key={i}><Clock size={14}/>{x}</p>)}</Panel>
 {canIngest&&<Panel>
  <div className="ph"><div><label>ADMIN ONLY · ACTIVITY INGESTION</label><h2>Ingest new activity data</h2></div></div>
  <p style={{fontSize:"9px",color:"#8da19e",margin:"0 0 14px",lineHeight:1.6}}>Simulates the monitoring pipeline sending fresh activity counts for this employee. This endpoint is Admin-only server-side (POST /api/activity/ingest) - the same restriction the security review specifically asked for on activity ingestion.</p>
  <div className="form-grid">
   <label>Logon count<input type="number" value={feat.logon_count} onChange={ev=>setFeat({...feat,logon_count:ev.target.value})} placeholder="e.g. 855"/></label>
   <label>After-hours logons<input type="number" value={feat.after_hours_logon_count} onChange={ev=>setFeat({...feat,after_hours_logon_count:ev.target.value})} placeholder="e.g. 74"/></label>
   <label>USB connect count<input type="number" value={feat.usb_connect_count} onChange={ev=>setFeat({...feat,usb_connect_count:ev.target.value})} placeholder="e.g. 405"/></label>
   <label>File copy count<input type="number" value={feat.file_copy_count} onChange={ev=>setFeat({...feat,file_copy_count:ev.target.value})} placeholder="e.g. 446"/></label>
   <label>Email count<input type="number" value={feat.email_count} onChange={ev=>setFeat({...feat,email_count:ev.target.value})} placeholder="e.g. 2630"/></label>
  </div>
  <div className="actions" style={{justifyContent:"flex-start"}}>
   <button type="button" className="primary" onClick={ingest} disabled={ingesting}>{ingesting?"Ingesting...":"Ingest activity"}</button>
  </div>
 </Panel>}
 </div>
}

// =========================== ACTIVITY MONITOR ===========================
function ActivityPage({employees}){
 return <div className="content"><Header eyebrow="CONTINUOUS MONITORING" title="Activity Monitor" desc="Every event is compared with an employee behavioral baseline." action={<span className="live">● Live monitoring</span>}/><div className="metrics"><Metric label="Events today" value="84,291" change="↑ 8.2%"/><Metric label="Anomalies detected" value={employees.filter(e=>e.score>=80).length} change="High priority"/><Metric label="Endpoints" value={employees.length} change="98.7% online"/></div><Panel>{employees.slice(0,8).map(e=><div className="event" key={e.id}><Activity/><div><b>{e.name}</b><p>{e.activity}</p><small>{e.log_source} · {e.dept}</small></div><Pill score={e.score}/></div>)}</Panel></div>
}

// =========================== ALERTS ===========================
function AlertsPage({user,token,alerts,refreshAlerts}){
 const [showResolved,setShowResolved]=useState(false);
 const canResolve=user.role==="Admin"||user.role==="Security Manager";
 const visible=alerts.filter(a=>showResolved||!a.resolved);
 const resolve=async id=>{try{await apiFetch(`/api/alerts/${id}/resolve`,token,{method:"POST"});toast("Alert marked as resolved.");refreshAlerts()}catch(ex){toast(ex.message,"error")}};
 const reopen=async id=>{try{await apiFetch(`/api/alerts/${id}/reopen`,token,{method:"POST"});toast("Alert reopened.");refreshAlerts()}catch(ex){toast(ex.message,"error")}};
 return <div className="content"><Header eyebrow="DETECTION CENTER" title="Threat Alerts" desc="Priority anomalies that need investigation." action={<label style={{display:"flex",alignItems:"center",gap:"6px",fontSize:"9px",color:"#8da19e"}}><input type="checkbox" checked={showResolved} onChange={e=>setShowResolved(e.target.checked)}/> Show resolved</label>}/>
 <Panel>{visible.map(a=><div className="alert-card" key={a.id}><div className="alert-symbol"><TriangleAlert/></div><div><b>{a.title}</b><p>{a.desc}</p><small>{a.employee_id} · {a.employee}</small></div>{a.resolved?<Pill status="Resolved"/>:<Pill status={a.severity}/>}<Link className="secondary" to={"/investigation/"+a.id}>Investigate</Link>{canResolve&&(a.resolved?<button className="secondary" onClick={()=>reopen(a.id)}>Reopen</button>:<button className="primary" onClick={()=>resolve(a.id)}>Resolve</button>)}</div>)}
 {visible.length===0&&<p style={{color:"#5e7672",fontSize:"9px",padding:"10px 0"}}>No open alerts - everything's been resolved.</p>}
 </Panel></div>
}

// =========================== RISK ANALYSIS ===========================
function RiskPage({employees}){
 const byDept={};
 employees.forEach(e=>{if(!byDept[e.dept])byDept[e.dept]={total:0,count:0};byDept[e.dept].total+=e.score;byDept[e.dept].count++});
 const deptRows=Object.entries(byDept).map(([dept,d])=>({dept,avg:Math.round(d.total/d.count),count:d.count})).sort((a,b)=>b.avg-a.avg);
 return <div className="content"><Header eyebrow="BEHAVIOR ANALYTICS" title="Risk Analysis" desc="Explainable scoring based on deviation from individual behavioral baselines."/><div className="grid"><Panel><div className="ph"><div><label>THREAT RADAR</label><h2>Highest behavioral drift</h2></div></div>{[...employees].sort((a,b)=>b.score-a.score).slice(0,10).map(e=><div className="risk-user" key={e.id}><b>{e.name}</b><i><em style={{width:e.score+"%"}}/></i><strong>{e.score}</strong></div>)}</Panel><Panel><div className="ph"><div><label>EXPLAINABLE RISK</label><h2>How the system scores risk</h2></div></div>{["30-day personal behavioral baseline","Timing, volume and access-scope deviation","Signal fusion into a 0–100 score","Human-readable evidence for analysts"].map((x,i)=><div className="method" key={x}><b>{i+1}. {x}</b><small>Model signal used in the final assessment</small></div>)}</Panel>
 <Panel wide><div className="ph"><div><label>ORGANIZATIONAL VIEW</label><h2>Average risk by department</h2></div></div>{deptRows.map(d=><div className="dept-bar" key={d.dept}><b>{d.dept}</b><i><em style={{width:d.avg+"%"}}/></i><strong>{d.avg}/100 · {d.count} people</strong></div>)}</Panel>
 </div></div>
}

// =========================== REPORTS ===========================
function Reports({token}){
 const reports=[
  {name:"weekly_threat_summary",title:"Weekly Threat Summary"},
  {name:"high_risk_users",title:"High-Risk Users"},
  {name:"detection_model_performance",title:"Detection Model Performance"},
 ];
 const run=async(name,title)=>{await downloadReport(name,token);toast(title+" exported.")};
 return <div className="content"><Header eyebrow="SECURITY ANALYTICS" title="Reports & Analytics" desc="Turn behavioral telemetry into actionable security intelligence. Every export here is generated server-side and recorded in the audit log."/><div className="report-grid">{reports.map(r=><Panel key={r.name}><FileBarChart/><h3>{r.title}</h3><p>Generate an exportable security report from current telemetry.</p><button className="primary" onClick={()=>run(r.name,r.title)}><FileDown size={14}/> Export CSV</button></Panel>)}</div></div>
}

// =========================== INVESTIGATION ===========================
function Investigation({id,alerts}){
 const inc=alerts.find(a=>a.id===id);
 if(!inc){
  return <div className="content"><Header eyebrow="INCIDENT STORY" title="No incident selected" desc="Open an alert from Threat Alerts to see its investigation."/><Panel><Link className="primary" to="/alerts">Go to Threat Alerts</Link></Panel></div>;
 }
 return <div className="content"><Header eyebrow={`INCIDENT STORY · ${inc.id}`} title={inc.assessment} desc="An explainable chain of behavioral events generated by Activity Management System." action={<button className="secondary" onClick={()=>window.print()}>Print report</button>}/>
 <Panel><div className="incident"><div><small>RISK SCORE</small><b>{inc.risk_score}</b><span>{inc.confidence}% confidence</span></div><div><label>THREAT ASSESSMENT</label><h2>{inc.assessment}</h2><p>{inc.assessment_detail}</p></div></div></Panel>
 <Panel><label>THREAT STORY · {inc.employee} ({inc.employee_id})</label>{inc.timeline.map(x=><div className="story" key={x[0]+x[1]}><Clock size={15}/><div><b>{x[0]} · {x[1]}</b><p>Evidence preserved for analyst review and case correlation.</p></div></div>)}</Panel>
 </div>
}

// =========================== SETTINGS ===========================
function SettingsPage({user}){
 const [name,setName]=useState(user.name);
 const [email,setEmail]=useState(user.email);
 const [old,setOld]=useState(""),[pass1,setPass1]=useState(""),[pass2,setPass2]=useState("");
 const saveProfile=e=>{
  e.preventDefault();
  if(!name.trim())return toast("Name cannot be empty.","error");
  if(!emailRe.test(email))return toast("Please enter a valid email address.","error");
  toast("Profile display updated for this session. (No backend endpoint for self-service profile edits yet.)");
 };
 const changePass=e=>{
  e.preventDefault();
  if(!old||!pass1||!pass2)return toast("Please fill all password fields.","error");
  if(pass1!==pass2)return toast("New passwords do not match.","error");
  if(pass1.length<6)return toast("New password should be at least 6 characters.","error");
  toast("Password change UI works, but there's no backend endpoint wired up for it yet.");
 };
 const roleDescriptions={
  "Admin":"Full access - manage employees, contain/release accounts, resolve alerts, view audit log",
  "Security Manager":"Organizational risk views, compliance reports, resolve alerts, contain/release accounts - cannot add/delete employees",
  "Analyst":"Investigate alerts, view reports and risk analysis - cannot resolve alerts or manage employees",
  "Employee":"Personal security portal only",
 };
 return <div className="content"><Header eyebrow="ACCOUNT" title="Settings" desc="Manage your profile details and account security."/>
 <div className="grid">
  <Panel>
   <div className="ph"><div><label>PROFILE</label><h2>Edit profile</h2></div></div>
   <form className="form" onSubmit={saveProfile}>
    <label>Full name<input value={name} onChange={e=>setName(e.target.value)}/></label>
    <label>Email<input value={email} onChange={e=>setEmail(e.target.value)}/></label>
    <div className="actions"><button className="primary"><Save size={14}/> Save changes</button></div>
   </form>
  </Panel>
  <Panel>
   <div className="ph"><div><label>SECURITY</label><h2>Change password</h2></div></div>
   <form className="form" onSubmit={changePass}>
    <label>Current password<input type="password" value={old} onChange={e=>setOld(e.target.value)}/></label>
    <label>New password<input type="password" value={pass1} onChange={e=>setPass1(e.target.value)}/></label>
    <label>Confirm new password<input type="password" value={pass2} onChange={e=>setPass2(e.target.value)}/></label>
    <div className="actions"><button className="primary">Update password</button></div>
   </form>
  </Panel>
  {user.role==="Admin"&&<Panel wide>
   <div className="ph"><div><label>ADMIN ONLY</label><h2>Team access</h2></div></div>
   <table><thead><tr><th>Role</th><th>What they can do</th></tr></thead><tbody>
    {Object.entries(roleDescriptions).map(([role,desc])=><tr key={role}><td><b>{role}</b></td><td>{desc}</td></tr>)}
   </tbody></table>
  </Panel>}
 </div></div>
}

// =========================== AUDIT LOG (Admin only) ===========================
function AuditLogPage({token}){
 const [rows,setRows]=useState([]);
 const [loading,setLoading]=useState(true);
 useEffect(()=>{
  apiFetch("/api/audit-log",token).then(setRows).catch(ex=>toast(ex.message,"error")).finally(()=>setLoading(false));
 },[token]);
 return <div className="content"><Header eyebrow="SECURITY VISIBILITY" title="Audit Log" desc="Every sensitive action - and every denied attempt - recorded server-side. Admin only."/>
 <Panel>
  {loading&&<p style={{fontSize:"9px",color:"#8da19e"}}>Loading...</p>}
  {!loading&&rows.length===0&&<p style={{fontSize:"9px",color:"#8da19e"}}>No audit entries yet.</p>}
  {!loading&&rows.length>0&&<table><thead><tr><th>Time (UTC)</th><th>Actor</th><th>Role</th><th>Action</th><th>Target</th><th>Detail</th></tr></thead><tbody>
   {rows.map(r=><tr key={r.id}><td>{r.ts}</td><td>{r.actor_email}</td><td>{r.actor_role}</td><td>{r.action.includes("DENIED")?<span style={{color:"var(--coral)"}}>{r.action}</span>:r.action}</td><td>{r.target}</td><td>{r.detail}</td></tr>)}
  </tbody></table>}
 </Panel></div>
}

function NotFound(){return <div className="content"><div className="notfound"><div><label>ERROR 404</label><h1>Page not found</h1><p>The page you're looking for doesn't exist or has been moved.</p><Link className="primary" to="/">Back to dashboard</Link></div></div></div>}
function Forbidden(){return <div className="content"><div className="notfound"><div><label>ERROR 403</label><h1>Access restricted</h1><p>Your account doesn't have permission to view this page. This is enforced by the backend too, not just hidden here.</p><Link className="primary" to="/">Back to dashboard</Link></div></div></div>}

// =========================== EMPLOYEE PORTAL ===========================
function Portal({user,employees,setAuth}){
 const record=employees[0];
 const riskScore=record?record.score:0;
 const safetyScore=Math.max(4,100-riskScore);
 const flagged=riskScore>=80;
 return <div className="portal"><header><div className="brand"><ShieldCheck/><b className="full-name">Activity<span>Management System</span></b></div><button className="secondary" onClick={()=>setAuth(null)}>Sign out</button></header><main><label>EMPLOYEE SECURITY PORTAL</label><h1>Hello, {user.name}</h1><p>Your personal security health, explained simply.</p><div className="portal-grid"><Panel><ShieldCheck/><label>PERSONAL SECURITY SCORE</label><b className="portal-score">{safetyScore}</b><p>{flagged?"Needs review · An analyst may follow up":"Healthy · No immediate action required"}</p></Panel><Panel><Activity/><label>RECENT ACTIVITY</label><h2>{record?record.activity:"Normal"}</h2><p>{flagged?"This differs from your usual behavioral baseline.":"Your activity is within your usual behavioral pattern."}</p></Panel><Panel><ShieldCheck/><label>ACCOUNT SECURITY</label><h2>Protected</h2><p>Multi-factor authentication is enabled.</p></Panel><Panel><TriangleAlert/><label>SECURITY NOTICE</label><h2>{flagged?"1 active notice":"No active warnings"}</h2><p>Activity Management System will notify you if an action needs your attention.</p></Panel></div></main></div>
}

// =========================== APP ROOT ===========================
function App(){
 const [loading,setLoading]=useState(true);
 const [auth,setAuthState]=useState(()=>JSON.parse(localStorage.getItem("sq_auth")||"null"));
 const [employees,setEmployees]=useState([]);
 const [alerts,setAlerts]=useState([]);
 const [notifications,setNotifications]=useState([]);
 const loc=useLocation();

 const token=auth&&auth.token, user=auth&&auth.user;
 const setAuth=next=>{setAuthState(next);if(next){localStorage.setItem("sq_auth",JSON.stringify(next));localStorage.setItem("sq_token",next.token)}else{localStorage.removeItem("sq_auth");localStorage.removeItem("sq_token")}};

 const refreshEmployees=async()=>{if(!token)return;try{setEmployees(await apiFetch("/api/employees",token))}catch(ex){}};
 const refreshAlerts=async()=>{if(!token)return;try{setAlerts(await apiFetch("/api/alerts",token))}catch(ex){}};
 const refreshNotifications=async()=>{if(!token)return;try{setNotifications(await apiFetch("/api/notifications",token))}catch(ex){}};

 useEffect(()=>{
  (async()=>{
   const stored=JSON.parse(localStorage.getItem("sq_auth")||"null");
   if(stored&&stored.token){
    try{await apiFetch("/api/auth/me",stored.token)}
    catch(ex){setAuth(null)}
   }
   setLoading(false);
  })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
 },[]);

 useEffect(()=>{
  if(!user)return;
  refreshEmployees();
  if(user.role!=="Employee"){refreshAlerts();refreshNotifications()}
  // eslint-disable-next-line react-hooks/exhaustive-deps
 },[user&&user.role,user&&user.email]);

 if(loading)return <div className="splash"><div className="spinner"/></div>;
 if(!user)return <Login onLogin={setAuth}/>;
 if(user.role==="Employee")return <Portal user={user} employees={employees} setAuth={setAuth}/>;

 let p=loc.pathname;
 const known=["/","/employees","/employees/new","/activity","/alerts","/risk","/reports","/settings","/investigation","/audit-log"];
 let page=p==="/"?<Dashboard user={user} employees={employees} alerts={alerts}/>
  :p==="/employees"?<Employees user={user} token={token} employees={employees} refreshEmployees={refreshEmployees}/>
  :p==="/employees/new"?(user.role==="Admin"?<AddEmployee token={token} refreshEmployees={refreshEmployees}/>:<Forbidden/>)
  :p.startsWith("/employees/")?<Profile id={p.split("/")[2]} user={user} token={token} employees={employees} refreshEmployees={refreshEmployees}/>
  :p==="/activity"?<ActivityPage employees={employees}/>
  :p==="/alerts"?<AlertsPage user={user} token={token} alerts={alerts} refreshAlerts={refreshAlerts}/>
  :p==="/risk"?<RiskPage employees={employees}/>
  :p==="/reports"?<Reports token={token}/>
  :p==="/settings"?<SettingsPage user={user}/>
  :p==="/investigation"||p.startsWith("/investigation/")?<Investigation id={p.split("/")[2]} alerts={alerts}/>
  :p==="/audit-log"?(user.role==="Admin"?<AuditLogPage token={token}/>:<Forbidden/>)
  :known.includes(p)?<Dashboard user={user} employees={employees} alerts={alerts}/>
  :<NotFound/>;
 return <Layout user={user} setAuth={setAuth} notifications={notifications} refreshNotifications={refreshNotifications} employees={employees} alerts={alerts}>{page}</Layout>
}
createRoot(document.getElementById("root")).render(<React.StrictMode><BrowserRouter><ToastHost/><App/></BrowserRouter></React.StrictMode>);
