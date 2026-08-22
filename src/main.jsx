// Activity Management System
// Final year project - React + Vite workplace activity monitoring dashboard
// Frontend prototype only. Data is stored in localStorage since there is no backend yet.

import React,{useState,useEffect} from "react";
import {createRoot} from "react-dom/client";
import {BrowserRouter,useNavigate,useLocation,Link} from "react-router-dom";
import {ShieldCheck,LayoutDashboard,Users,Activity,TriangleAlert,BrainCircuit,FileBarChart,Plus,LogOut,Search,Bell,Save,Clock,FileDown,Network,Trash2,Settings as SettingsIcon} from "lucide-react";
import "./style.css";

const emailRe=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const demo={Admin:{email:"admin@activity.local",password:"admin123",name:"System Admin",role:"Admin"},Analyst:{email:"analyst@activity.local",password:"analyst123",name:"Meera Iyer",role:"Analyst"},Employee:{email:"employee@activity.local",password:"employee123",name:"Ravi Menon",role:"Employee",id:"EMP-1042"}};

const namedSeed=[
{id:"EMP-1042",name:"Ravi Menon",email:"ravi@company.com",dept:"Engineering",role:"Senior Software Engineer",score:91,activity:"184 files downloaded",logSource:"file.csv"},
{id:"EMP-0871",name:"Sneha Krishnan",email:"sneha@company.com",dept:"Finance",role:"Financial Analyst",score:68,activity:"New device login",logSource:"logon.csv"},
{id:"EMP-0318",name:"Arjun Joseph",email:"arjun@company.com",dept:"Sales",role:"Account Executive",score:84,activity:"Restricted folder access",logSource:"http.csv"},
{id:"EMP-1129",name:"Priya Nair",email:"priya@company.com",dept:"HR",role:"HR Specialist",score:18,activity:"Normal application use",logSource:"device.csv"},
{id:"EMP-0764",name:"Dev Varma",email:"dev@company.com",dept:"Engineering",role:"Developer",score:57,activity:"VPN login",logSource:"email.csv"}];

// ---- generates additional synthetic employees so the dashboard reflects a realistic company scale ----
function generateEmployees(count){
 const firstNames=["Aditi","Rahul","Kavya","Vikram","Ananya","Rohan","Meera","Karan","Divya","Suresh","Neha","Amit","Pooja","Sanjay","Ritu","Manoj","Anjali","Nikhil","Swati","Rajesh","Deepa","Vivek","Kiran","Shreya","Aakash","Ishita","Varun","Nisha","Harish","Rekha","Gaurav","Sunita","Pranav","Lakshmi","Sameer","Anita","Vishal","Radha","Naveen","Ajay","Bhavna","Yash","Tanvi","Ramesh","Priyanka","Farhan","Zara","Rohit","Simran","Mohit"];
 const lastNames=["Reddy","Sharma","Gupta","Rao","Patel","Kumar","Singh","Nayar","Pillai","Chowdhury","Bose","Das","Verma","Mehta","Kapoor","Malhotra","Chatterjee","Bhat","Desai","Joshi","Shetty","Agarwal","Bansal","Trivedi","Iyer","Menon","Krishnan","Nair","Varma","Sinha"];
 const rolesByDept={Engineering:["Software Engineer","DevOps Engineer","QA Engineer","Engineering Manager"],Finance:["Accountant","Finance Manager","Payroll Specialist"],Sales:["Sales Manager","Business Development Rep","Sales Ops Analyst"],HR:["Recruiter","HR Manager","People Ops Analyst"],Operations:["Operations Analyst","Ops Manager","Logistics Coordinator"],Marketing:["Marketing Specialist","Content Strategist","Marketing Manager"],Legal:["Legal Counsel","Compliance Officer","Paralegal"],"IT Support":["IT Support Engineer","System Administrator","Helpdesk Analyst"],Procurement:["Procurement Analyst","Vendor Manager"],"Customer Success":["Customer Success Manager","Support Specialist"]};
 const depts=Object.keys(rolesByDept);
 const list=[];
 for(let i=0;i<count;i++){
  const fn=firstNames[i%firstNames.length],ln=lastNames[(i*7+3)%lastNames.length];
  const dept=depts[i%depts.length];
  const roles=rolesByDept[dept];
  const role=roles[i%roles.length];
  const roll=(i*37)%100; // deterministic spread instead of Math.random, so the mix is stable every run
  let score,activity,logSource;
  if(roll<6){score=80+((i*13)%18);activity=["Mass file download detected","Unusual data transfer volume","Repeated failed login then success"][i%3];logSource=i%2===0?"file.csv":"http.csv";}
  else if(roll<24){score=50+((i*11)%30);activity=["After-hours login","USB device connected","VPN session from new location"][i%3];logSource=i%2===0?"logon.csv":"device.csv";}
  else{score=5+((i*5)%44);activity=["Normal application use","Routine email activity","Standard browsing pattern"][i%3];logSource=["email.csv","device.csv","http.csv"][i%3];}
  list.push({id:"EMP-"+(2000+i),name:`${fn} ${ln}`,email:`${fn}.${ln}${i}`.toLowerCase()+"@company.com",dept,role,score,activity,logSource});
 }
 return list;
}
const seed=[...namedSeed,...generateEmployees(100)];
const alerts=[
["Mass file download outside baseline","Ravi Menon","EMP-1042","Critical","184 files downloaded in 11 minutes — 8.7× above baseline."],
["After-hours authentication anomaly","Sneha Krishnan","EMP-0871","High","New device detected outside the established login pattern."],
["Restricted folder access","Arjun Joseph","EMP-0318","High","Accessed Finance/Payroll outside normal role scope."],
["USB activity increased","Priya Nair","EMP-1129","Medium","Removable-media activity is 3.2× above baseline."]
];
// extra notifications shown in the bell dropdown (a couple of these are not full alerts, just system notices)
const notifSeed=[
{id:"N1",title:"Mass file download outside baseline",desc:"Ravi Menon - 184 files downloaded in 11 minutes.",time:"2 min ago"},
{id:"N2",title:"After-hours authentication anomaly",desc:"Sneha Krishnan logged in from a new device.",time:"18 min ago"},
{id:"N3",title:"Restricted folder access",desc:"Arjun Joseph accessed the Finance/Payroll folder.",time:"41 min ago"},
{id:"N4",title:"Weekly report ready",desc:"Your weekly threat summary has been generated.",time:"1 hr ago"}
];
const riskLevels=["All","Low","Medium","High"];

function risk(s){return s>=80?"High Risk":s>=50?"Medium":"Low"}
function Pill({score,status}){let s=status||risk(score);return <span className={"pill "+(s.includes("High")||s==="Critical"?"high":s==="Medium"?"medium":"low")}>{score!==undefined?score+" · ":""}{s}</span>}
function Header({eyebrow,title,desc,action}){return <div className="head"><div><label>{eyebrow}</label><h1>{title}</h1><p>{desc}</p></div>{action}</div>}
function Metric({label,value,change}){return <div className="metric"><span>{label}</span><b>{value}</b><small>{change}</small></div>}
function Panel({children,wide=false}){return <section className={"panel "+(wide?"wide":"")}>{children}</section>}

// ---- tiny CSV helper - turns rows into a CSV string and triggers a browser download ----
function toCSV(rows){return rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n")}
function downloadCSV(filename,rows){
 const csv=toCSV(rows);
 const blob=new Blob([csv],{type:"text/csv"});
 const url=URL.createObjectURL(blob);
 const a=document.createElement("a");
 a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();
 URL.revokeObjectURL(url);
}

// ---- tiny toast notification system (no external library, just a custom DOM event) ----
let toastSeq=0;
function toast(message,type="success"){
 window.dispatchEvent(new CustomEvent("sq-toast",{detail:{id:++toastSeq,message,type}}));
}
function ToastHost(){
 const [items,setItems]=useState([]);
 useEffect(()=>{
  const handler=e=>{
   setItems(list=>[...list,e.detail]);
   setTimeout(()=>setItems(list=>list.filter(x=>x.id!==e.detail.id)),3000);
  };
  window.addEventListener("sq-toast",handler);
  return ()=>window.removeEventListener("sq-toast",handler);
 },[]);
 return <div className="toast-host">{items.map(t=><div className={"toast "+(t.type==="error"?"error":"")} key={t.id}>{t.message}</div>)}</div>
}

// ---- small reusable confirm dialog used for logout / delete actions ----
function ConfirmDialog({title,message,confirmLabel="Confirm",onConfirm,onCancel}){
 return <div className="modal-overlay" onClick={onCancel}>
  <div className="modal-card" onClick={e=>e.stopPropagation()}>
   <h3>{title}</h3><p>{message}</p>
   <div className="modal-actions"><button className="secondary" onClick={onCancel}>Cancel</button><button className="primary" onClick={onConfirm}>{confirmLabel}</button></div>
  </div>
 </div>
}

function Login({setUser}){
 const nav=useNavigate();
 const [email,setEmail]=useState("admin@activity.local"),[pass,setPass]=useState("admin123"),[err,setErr]=useState("");
 const [showCreds,setShowCreds]=useState(false);
 const go=e=>{
  if(e&&e.preventDefault)e.preventDefault();
  
  let u=Object.values(demo).find(x=>x.email===email&&x.password===pass);
  
  if(!u){
   const custom=JSON.parse(localStorage.getItem("sq_employees")||"[]");
   const removed=JSON.parse(localStorage.getItem("sq_deleted")||"[]");
   const emp=[...custom,...seed].filter(s=>!removed.includes(s.id)).find(s=>s.email===email);
   if(emp){
    const expected=emp.password||"employee123"; // seed employees share a demo password; Admin-added ones get a generated one
    if(pass===expected)u={email:emp.email,password:expected,name:emp.name,role:"Employee",id:emp.id};
   }
  }
  if(!u)return setErr("Invalid credentials");
  setUser(u);
  localStorage.setItem("sq_user",JSON.stringify(u));
  setErr("");
  nav("/",{replace:true}); // always land on a known route, even right after a logout
 };
 const use=(em,pw)=>{setEmail(em);setPass(pw)};
 return <div className="login"><div className="login-card"><div className="login-brand"><ShieldCheck/><b className="full-name">Activity<span>Management System</span></b></div><label>SECURITY COMMAND CENTER</label><h1>Welcome back</h1><p>Sign in to your behavioral intelligence workspace.</p>
 <form onSubmit={go}>
 <input placeholder="Work email" value={email} onChange={e=>setEmail(e.target.value)}/><input type="password" placeholder="Password" value={pass} onChange={e=>setPass(e.target.value)}/>{err&&<div className="error">{err}</div>}
 <button type="submit" className="primary full">Sign in →</button></form>
 <button type="button" className="creds-toggle" onClick={()=>setShowCreds(v=>!v)}>{showCreds?"Hide demo accounts ▲":"View demo accounts ▼"}</button>
 {showCreds&&<div className="creds-box">
  <div className="creds-row" onClick={()=>use(demo.Admin.email,demo.Admin.password)}><b>Admin</b><span>{demo.Admin.email} / {demo.Admin.password}</span></div>
  <div className="creds-row" onClick={()=>use(demo.Analyst.email,demo.Analyst.password)}><b>Analyst</b><span>{demo.Analyst.email} / {demo.Analyst.password}</span></div>
  {namedSeed.map(s=><div className="creds-row" key={s.id} onClick={()=>use(s.email,"employee123")}><b>{s.name}</b><span>{s.email} / employee123</span></div>)}
 </div>}
 <small className="secure">Demo environment</small></div>
 <div className="login-art"><span>BEHAVIOR ANALYTICS</span><h2>Detect the signal<br/>behind the noise.</h2><p>Activity Management System learns normal workforce behavior and highlights meaningful deviations before they become incidents.</p><strong>96.8%</strong><small>Detection confidence</small></div></div>
}

// bell dropdown - click to open/close, click a notification to mark it read, "mark all read" clears the badge
function NotifBell(){
 const [open,setOpen]=useState(false);
 const [read,setRead]=useState(()=>JSON.parse(localStorage.getItem("sq_notif_read")||"[]"));
 const unread=notifSeed.filter(n=>!read.includes(n.id));
 const markAll=()=>{const ids=notifSeed.map(n=>n.id);setRead(ids);localStorage.setItem("sq_notif_read",JSON.stringify(ids))};
 const markOne=id=>{if(read.includes(id))return;const r=[...read,id];setRead(r);localStorage.setItem("sq_notif_read",JSON.stringify(r))};
 return <div className="notif-wrap">
  <button className="iconbtn" onClick={()=>setOpen(!open)}><Bell size={16}/>{unread.length>0&&<span className="notif-badge">{unread.length}</span>}</button>
  {open&&<div className="notif-panel">
   <div className="notif-head"><b>Notifications</b><button onClick={markAll}>Mark all read</button></div>
   {notifSeed.map(n=><div key={n.id} className={"notif-item "+(read.includes(n.id)?"":"unread")} onClick={()=>markOne(n.id)}>
    <TriangleAlert size={13}/>
    <div><b>{n.title}</b><small>{n.desc}</small><small>{n.time}</small></div>
   </div>)}
  </div>}
 </div>
}

// shows today's real date in the header, and keeps itself updated (checks every minute)
function formatToday(d){
 const days=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
 const months=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
 return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}
function LiveDate(){
 const [now,setNow]=useState(new Date());
 useEffect(()=>{
  const t=setInterval(()=>setNow(new Date()),60000); // refresh every minute so it rolls over at midnight too
  return ()=>clearInterval(t);
 },[]);
 return <small>{formatToday(now)}</small>;
}

function Layout({user,setUser,children}){
 const nav=useNavigate(),loc=useLocation();
 const [confirmLogout,setConfirmLogout]=useState(false);
 const links=[["/","Dashboard",LayoutDashboard],["/employees","Employees",Users],["/activity","Activity Monitor",Activity],["/alerts","Threat Alerts",TriangleAlert],["/risk","Risk Analysis",BrainCircuit],["/reports","Reports",FileBarChart],["/settings","Settings",SettingsIcon]];
 const doLogout=()=>{localStorage.removeItem("sq_user");setUser(null);nav("/login")};
 return <div className="shell"><aside><div className="brand"><ShieldCheck/><b className="full-name">Activity<span>Management System</span></b></div><label>SECURITY CENTER</label>{links.map(([to,t,I])=><Link className={loc.pathname===to?"nav active":"nav"} to={to} key={to}><I size={16}/>{t}{t==="Threat Alerts"&&<em>7</em>}</Link>)}{user.role==="Admin"&&<Link className="nav" to="/employees/new"><Plus size={16}/>Add Employee</Link>}<div className="bottom"><div className="online">● ACTIVITY ENGINE ONLINE<small>Behavior model synced 2 min ago</small></div><div className="user"><span>{user.name.split(" ").map(x=>x[0]).join("")}</span><div><b>{user.name}</b><small>{user.role}</small></div><button onClick={()=>setConfirmLogout(true)}><LogOut size={14}/></button></div></div></aside><main><header><div className="search"><Search size={15}/><input placeholder="Search employee, alert, activity..."/></div><div><NotifBell/><LiveDate/></div></header>{children}</main>
 {confirmLogout&&<ConfirmDialog title="Sign out" message="Are you sure you want to sign out of Activity Management System?" confirmLabel="Sign out" onCancel={()=>setConfirmLogout(false)} onConfirm={doLogout}/>}
 </div>
}

function greeting(){
 const h=new Date().getHours();
 if(h<12)return "Good morning";
 if(h<17)return "Good afternoon";
 return "Good evening";
}
function Dashboard({user}){
 const custom=JSON.parse(localStorage.getItem("sq_employees")||"[]");
 const removed=JSON.parse(localStorage.getItem("sq_deleted")||"[]");
 const all=[...custom,...seed].filter(e=>!removed.includes(e.id));
 const total=all.length;
 const highCount=all.filter(e=>e.score>=80).length;
 const medCount=all.filter(e=>e.score>=50&&e.score<80).length;
 const lowCount=total-highCount-medCount;
 const lowPct=total?Math.round(lowCount/total*100):0;
 const medPct=total?Math.round(medCount/total*100):0;
 const donutStyle={background:`conic-gradient(var(--mint) 0 ${lowPct}%, var(--amber) ${lowPct}% ${lowPct+medPct}%, var(--coral) ${lowPct+medPct}% 100%)`};
 return <div className="content"><Header eyebrow="SECURITY OVERVIEW" title={`${greeting()}, ${user.name} ✦`} desc="Stable environment with a few behavioral signals requiring attention." action={<button className="primary" onClick={()=>toast("Activity scan started. Results will appear in Threat Alerts.")}>Run Activity Scan</button>}/>
 <div className="banner"><BrainCircuit/><div><b>Behavior assessment: Elevated activity detected</b><small>{highCount} of {total} monitored employees show high-risk behavior today.</small></div><Link to="/alerts">Review alerts →</Link></div>
 <div className="metrics"><Metric label="Monitored Users" value={total.toLocaleString()} change="Updates as employees are added or removed"/><Metric label="High-Risk Users" value={highCount} change={`${lowCount} low · ${medCount} medium`}/><Metric label="Open Alerts" value={alerts.length} change="From the Threat Alerts feed"/><Metric label="Detection Accuracy" value="96.8%" change="↑ 1.2% confidence"/></div>
 <div className="grid"><Panel><div className="ph"><div><label>BEHAVIORAL TELEMETRY</label><h2>Risk activity trend</h2></div><select><option>Last 7 days</option><option>Last 30 days</option></select></div><div className="chart"><svg viewBox="0 0 700 220" preserveAspectRatio="none"><path fill="rgba(25,199,163,.2)" d="M0 180C60 160 80 175 130 145S190 110 250 135S310 100 360 120S420 80 480 112S550 65 610 92S660 45 700 65V220H0Z"/><path fill="none" stroke="#19c7a3" strokeWidth="4" d="M0 180C60 160 80 175 130 145S190 110 250 135S310 100 360 120S420 80 480 112S550 65 610 92S660 45 700 65"/></svg></div></Panel>
 <Panel><div className="ph"><div><label>BEHAVIORAL DNA</label><h2>Risk distribution</h2></div><Link to="/risk">Details →</Link></div><div className="donut" style={donutStyle}><b>{total}<small>employees</small></b></div><div className="legend"><span>● Low risk <b>{lowCount}</b></span><span>● Medium <b>{medCount}</b></span><span>● High <b>{highCount}</b></span></div></Panel>
 <Panel><div className="ph"><div><label>ATTENTION REQUIRED</label><h2>Priority alerts</h2></div><Link to="/alerts">View all →</Link></div>{alerts.slice(0,3).map(a=><div className="alert-row" key={a[2]}><i>!</i><div><b>{a[0]}</b><small>{a[2]} · {a[1]}</small></div><Pill status={a[3]}/></div>)}</Panel>
 <Panel wide><div className="ph"><div><label>LIVE FEED</label><h2>Recent activity</h2></div><Link to="/activity">Open monitor →</Link></div><table><thead><tr><th>Employee</th><th>Activity</th><th>Risk</th></tr></thead><tbody>{all.slice(0,6).map(e=><tr key={e.id}><td><b>{e.name}</b><small>{e.dept}</small></td><td>{e.activity}</td><td><Pill score={e.score}/></td></tr>)}</tbody></table></Panel></div></div>
}

function Employees({user}){
 const [q,setQ]=useState("");
 const [dept,setDept]=useState("All");
 const [riskF,setRiskF]=useState("All");
 const [deleteId,setDeleteId]=useState(null);
 const [,bump]=useState(0);
 const custom=JSON.parse(localStorage.getItem("sq_employees")||"[]");
 const removed=JSON.parse(localStorage.getItem("sq_deleted")||"[]");
 const all=[...custom,...seed].filter(e=>!removed.includes(e.id));
 const depts=["All",...Array.from(new Set(all.map(e=>e.dept)))];
 const filtered=all
  .filter(e=>JSON.stringify(e).toLowerCase().includes(q.toLowerCase()))
  .filter(e=>dept==="All"||e.dept===dept)
  .filter(e=>riskF==="All"||risk(e.score).toLowerCase().includes(riskF.toLowerCase()));
 const exportRows=()=>{downloadCSV("employees.csv",[["Name","ID","Email","Department","Role","Score","Risk","Log Source"],...filtered.map(e=>[e.name,e.id,e.email,e.dept,e.role,e.score,risk(e.score),e.logSource||""])]);toast("Employee list exported.")};
 const doDelete=id=>{
  let list=JSON.parse(localStorage.getItem("sq_employees")||"[]");
  if(list.some(x=>x.id===id)){
   list=list.filter(x=>x.id!==id);
   localStorage.setItem("sq_employees",JSON.stringify(list));
  }else{
   let d=JSON.parse(localStorage.getItem("sq_deleted")||"[]");
   d.push(id);
   localStorage.setItem("sq_deleted",JSON.stringify(d));
  }
  setDeleteId(null);bump(v=>v+1);toast("Employee removed.");
 };
 return <div className="content"><Header eyebrow="IDENTITY & BEHAVIOR" title="Employees" desc="Manage people and inspect each unique behavioral baseline." action={<div style={{display:"flex",gap:"8px"}}><button className="secondary" onClick={exportRows}><FileDown size={14}/> Export CSV</button>{user.role==="Admin"&&<Link className="primary" to="/employees/new"><Plus size={15}/> Add employee</Link>}</div>}/>
 <Panel>
  <div className="filter-row">
   <div className="searchbox" style={{marginBottom:0,flex:1}}><Search size={14}/><input placeholder="Search name, ID, department..." value={q} onChange={e=>setQ(e.target.value)}/></div>
   <select value={dept} onChange={e=>setDept(e.target.value)}>{depts.map(d=><option key={d}>{d}</option>)}</select>
   <select value={riskF} onChange={e=>setRiskF(e.target.value)}>{riskLevels.map(r=><option key={r}>{r}</option>)}</select>
  </div>
  <table><thead><tr><th>Employee</th><th>Department</th><th>Behavior signal</th><th>Log source</th><th>Risk</th><th/><th/></tr></thead><tbody>{filtered.map(e=><tr key={e.id}><td><b>{e.name}</b><small>{e.id} · {e.email}</small></td><td>{e.dept}<small>{e.role}</small></td><td>{e.activity}</td><td><small>{e.logSource||"—"}</small></td><td><Pill score={e.score}/></td><td><Link to={"/employees/"+e.id}>Open →</Link></td><td>{user.role==="Admin"&&<button className="iconbtn" title="Delete employee" onClick={()=>setDeleteId(e.id)}><Trash2 size={14}/></button>}</td></tr>)}</tbody></table>
  {filtered.length===0&&<p style={{color:"#5e7672",fontSize:"9px",padding:"10px 0"}}>No employees match the current search and filters.</p>}
 </Panel>
 {deleteId&&<ConfirmDialog title="Delete employee" message="Are you sure you want to delete this employee record? This cannot be undone." confirmLabel="Delete" onCancel={()=>setDeleteId(null)} onConfirm={()=>doDelete(deleteId)}/>}
 </div>
}

function genPassword(){return "Act@"+Math.floor(1000+Math.random()*9000)}

function AddEmployee(){
 const nav=useNavigate();const [f,setF]=useState({name:"",email:"",dept:"Engineering",role:"",manager:"",joining:"",access:"Standard"});
 const [created,setCreated]=useState(null);
 const save=e=>{
  e.preventDefault();
  if(!f.name||!f.role)return toast("Please fill in name and role.","error");
  if(!emailRe.test(f.email))return toast("Please enter a valid email address.","error");
  const pwd=genPassword();
  const record={...f,id:"EMP-"+Math.floor(1000+Math.random()*8999),score:0,activity:"New employee profile",logSource:"logon.csv",password:pwd};
  let a=JSON.parse(localStorage.getItem("sq_employees")||"[]");
  a.unshift(record);
  localStorage.setItem("sq_employees",JSON.stringify(a));
  toast("Employee added successfully.");
  setCreated(record);
 };
 if(created){
  return <div className="content"><Header eyebrow="ADMIN CONTROL" title="Employee created" desc="Share these sign-in details with the new employee - the password is shown only once."/>
   <Panel>
    <div className="banner"><ShieldCheck/><div><b>{created.name} can now sign in to the Employee Security Portal</b><small>There is no email server in this demo, so nothing is actually emailed - hand these details over directly.</small></div></div>
    <div className="form-grid">
     <label>Login email<input readOnly value={created.email}/></label>
     <label>Temporary password<input readOnly value={created.password}/></label>
    </div>
    <div className="actions">
     <button type="button" className="secondary" onClick={()=>{if(navigator.clipboard)navigator.clipboard.writeText(`Email: ${created.email}\nPassword: ${created.password}`);toast("Credentials copied to clipboard.")}}>Copy credentials</button>
     <button type="button" className="primary" onClick={()=>nav("/employees")}>Go to employees</button>
    </div>
   </Panel>
  </div>
 }
 return <div className="content"><Header eyebrow="ADMIN CONTROL" title="Add employee" desc="Create a monitored identity and initialize its behavioral baseline."/><Panel><form onSubmit={save} className="form"><div className="form-grid">{["name","email","role","manager","joining"].map(n=><label key={n}>{n.replace(/^\w/,x=>x.toUpperCase())}<input value={f[n]} onChange={e=>setF({...f,[n]:e.target.value})} placeholder={n}/></label>)}<label>Department<select value={f.dept} onChange={e=>setF({...f,dept:e.target.value})}><option>Engineering</option><option>Finance</option><option>Sales</option><option>HR</option><option>Operations</option></select></label><label>Access<select value={f.access} onChange={e=>setF({...f,access:e.target.value})}><option>Standard</option><option>Privileged</option><option>Restricted</option></select></label></div><div className="actions"><button type="button" className="secondary" onClick={()=>nav("/employees")}>Cancel</button><button className="primary"><Save size={14}/> Save employee</button></div></form></Panel></div>
}

function Profile({id}){
 const custom=JSON.parse(localStorage.getItem("sq_employees")||"[]");const e=[...custom,...seed].find(x=>x.id===id)||seed[0];
 return <div className="content"><Header eyebrow="EMPLOYEE BEHAVIORAL DNA" title={e.name} desc={`${e.id} · ${e.dept} · ${e.role}`}/><Panel><div className="profile"><div className="avatar big">{e.name.split(" ").map(x=>x[0]).join("")}</div><div><label>MONITORED IDENTITY</label><h2>{e.name}</h2><p>{e.email}</p><Pill score={e.score}/></div><strong className="score">{e.score}<small>/100</small></strong></div></Panel><div className="grid"><Panel><div className="ph"><div><label>BEHAVIORAL DNA</label><h2>Baseline signals</h2></div><BrainCircuit/></div>{[["File access",e.score],["Login pattern",Math.max(20,e.score-18)],["Network behavior",Math.min(92,e.score+8)],["Application use",Math.max(18,e.score-25)]].map(x=><div className="signal" key={x[0]}><span>{x[0]}</span><b>{x[1]}%</b><i><em style={{width:x[1]+"%"}}/></i></div>)}</Panel><Panel><div className="ph"><div><label>MODEL EXPLANATION</label><h2>Current assessment</h2></div></div><div className="ai"><BrainCircuit/><div><h3>{e.score>=80?"Behavioral deviation detected":"Behavior within baseline"}</h3><p>{e.score>=80?"Recent activity differs significantly from this employee's historical pattern. Verify the business context before escalation.":"No significant anomaly is currently detected. Activity Management System continues learning this user's baseline."}</p></div></div></Panel></div><Panel><div className="ph"><div><label>ACTIVITY TIMELINE</label><h2>Recent behavior</h2></div></div>{["08:51 · "+e.activity,"08:22 · Accessed project resources","07:58 · Corporate network authentication"].map((x,i)=><p className="timeline" key={i}><Clock size={14}/>{x}</p>)}</Panel></div>
}

function ActivityPage(){
 const ev=[["Ravi Menon","Downloaded 184 files from Project Aurora","08:51:42",91,FileDown],["Arjun Joseph","Accessed restricted Finance/Payroll folder","08:22:18",84,Activity],["Sneha Krishnan","Authenticated from an unrecognized device","08:37:04",68,Network],["Priya Nair","Opened HR portal during normal pattern","08:11:55",18,Activity]];
 return <div className="content"><Header eyebrow="CONTINUOUS MONITORING" title="Activity Monitor" desc="Every event is compared with an employee behavioral baseline." action={<span className="live">● Live monitoring</span>}/><div className="metrics"><Metric label="Events today" value="84,291" change="↑ 8.2%"/><Metric label="Anomalies detected" value="43" change="12 high priority"/><Metric label="Endpoints" value="1,162" change="98.7% online"/></div><Panel>{ev.map(([u,d,t,r,I])=><div className="event" key={u+t}><I/><div><b>{u}</b><p>{d}</p><small>Endpoint · {t}</small></div><Pill score={r}/></div>)}</Panel></div>
}

function AlertsPage({user}){return <div className="content"><Header eyebrow="DETECTION CENTER" title="Threat Alerts" desc="Priority anomalies that need investigation."/><Panel>{alerts.map(a=><div className="alert-card" key={a[2]}><div className="alert-symbol"><TriangleAlert/></div><div><b>{a[0]}</b><p>{a[4]}</p><small>{a[2]} · {a[1]}</small></div><Pill status={a[3]}/><Link className="secondary" to="/investigation">Investigate</Link>{user.role==="Admin"&&<button className="primary" onClick={()=>toast("Alert marked as resolved.")}>Resolve</button>}</div>)}</Panel></div>}
function RiskPage(){
 const custom=JSON.parse(localStorage.getItem("sq_employees")||"[]");
 const removed=JSON.parse(localStorage.getItem("sq_deleted")||"[]");
 const all=[...custom,...seed].filter(e=>!removed.includes(e.id));
 return <div className="content"><Header eyebrow="BEHAVIOR ANALYTICS" title="Risk Analysis" desc="Explainable scoring based on deviation from individual behavioral baselines."/><div className="grid"><Panel><div className="ph"><div><label>THREAT RADAR</label><h2>Highest behavioral drift</h2></div></div>{[...all].sort((a,b)=>b.score-a.score).slice(0,10).map(e=><div className="risk-user" key={e.id}><b>{e.name}</b><i><em style={{width:e.score+"%"}}/></i><strong>{e.score}</strong></div>)}</Panel><Panel><div className="ph"><div><label>EXPLAINABLE RISK</label><h2>How the system scores risk</h2></div></div>{["30-day personal behavioral baseline","Timing, volume and access-scope deviation","Signal fusion into a 0–100 score","Human-readable evidence for analysts"].map((x,i)=><div className="method" key={x}><b>{i+1}. {x}</b><small>Model signal used in the final assessment</small></div>)}</Panel></div></div>
}

function Reports(){
 const reportData={
  "Weekly Threat Summary":{file:"weekly_threat_summary.csv",rows:[["Alert","Employee","ID","Severity"],...alerts.map(a=>[a[0],a[1],a[2],a[3]])]},
  "High-Risk Users":{file:"high_risk_users.csv",rows:[["Employee","ID","Department","Score","Risk"],...[...seed].sort((a,b)=>b.score-a.score).map(e=>[e.name,e.id,e.dept,e.score,risk(e.score)])]},
  "Detection Model Performance":{file:"detection_model_performance.csv",rows:[["Metric","Value"],["Detection Accuracy","96.8%"],["False Positive Rate","2.1%"],["Avg Detection Time","4.2 minutes"],["Model Version","v3.2"]]}
 };
 const run=(name)=>{downloadCSV(reportData[name].file,reportData[name].rows);toast(name+" exported.")};
 return <div className="content"><Header eyebrow="SECURITY ANALYTICS" title="Reports & Analytics" desc="Turn behavioral telemetry into actionable security intelligence."/><div className="report-grid">{Object.keys(reportData).map(x=><Panel key={x}><FileBarChart/><h3>{x}</h3><p>Generate an exportable security report from current telemetry.</p><button className="primary" onClick={()=>run(x)}><FileDown size={14}/> Export CSV</button></Panel>)}</div></div>
}

function Investigation(){return <div className="content"><Header eyebrow="INCIDENT STORY · INC-2048" title="Possible data exfiltration" desc="An explainable chain of behavioral events generated by Activity Management System."/><Panel><div className="incident"><div><small>RISK SCORE</small><b>91</b><span>94.2% confidence</span></div><div><label>THREAT ASSESSMENT</label><h2>Potential data exfiltration</h2><p>The sequence is 8.7× above Ravi Menon's historical file-access baseline.</p></div></div></Panel><Panel><label>THREAT STORY</label>{[["02:14 AM","Unusual login"],["02:18 AM","Restricted folder access"],["02:23 AM","184 files downloaded"],["02:25 AM","External connection"],["Model","Recommended human investigation"]].map(x=><div className="story" key={x[0]}><Clock size={15}/><div><b>{x[0]} · {x[1]}</b><p>Evidence preserved for analyst review and case correlation.</p></div></div>)}</Panel></div>}

// Settings page - lets a signed in user update their profile and change their password.
// Password change is a demo only (no backend), it just validates the form and shows a message.
function SettingsPage({user,setUser}){
 const [name,setName]=useState(user.name);
 const [email,setEmail]=useState(user.email);
 const [old,setOld]=useState(""),[pass1,setPass1]=useState(""),[pass2,setPass2]=useState("");
 const saveProfile=e=>{
  e.preventDefault();
  if(!name.trim())return toast("Name cannot be empty.","error");
  if(!emailRe.test(email))return toast("Please enter a valid email address.","error");
  const u={...user,name,email};setUser(u);localStorage.setItem("sq_user",JSON.stringify(u));
  toast("Profile updated successfully.");
 };
 const changePass=e=>{
  e.preventDefault();
  if(!old||!pass1||!pass2)return toast("Please fill all password fields.","error");
  if(pass1!==pass2)return toast("New passwords do not match.","error");
  if(pass1.length<6)return toast("New password should be at least 6 characters.","error");
  toast("Password changed successfully.");setOld("");setPass1("");setPass2("");
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
   <table><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Access level</th></tr></thead><tbody>
    {Object.values(demo).map(d=><tr key={d.email}><td><b>{d.name}</b></td><td>{d.email}</td><td>{d.role}</td><td>{d.role==="Admin"?"Full access - manage employees, resolve alerts, settings":d.role==="Analyst"?"Investigate alerts, view reports - cannot add/delete employees":"Personal security portal only"}</td></tr>)}
   </tbody></table>
  </Panel>}
 </div></div>
}

function NotFound(){return <div className="content"><div className="notfound"><div><label>ERROR 404</label><h1>Page not found</h1><p>The page you're looking for doesn't exist or has been moved.</p><Link className="primary" to="/">Back to dashboard</Link></div></div></div>}
function Forbidden(){return <div className="content"><div className="notfound"><div><label>ERROR 403</label><h1>Admin access required</h1><p>Your Analyst account can view and investigate, but only an Admin can manage employee records.</p><Link className="primary" to="/employees">Back to employees</Link></div></div></div>}

function Portal({user,setUser}){
 const custom=JSON.parse(localStorage.getItem("sq_employees")||"[]");
 const record=[...custom,...seed].find(x=>x.id===user.id)||seed.find(x=>x.name===user.name);
 const riskScore=record?record.score:0;
 const safetyScore=Math.max(4,100-riskScore); // portal shows a "security health" score - inverse of the risk score used elsewhere
 const flagged=riskScore>=80;
 return <div className="portal"><header><div className="brand"><ShieldCheck/><b className="full-name">Activity<span>Management System</span></b></div><button className="secondary" onClick={()=>{localStorage.removeItem("sq_user");setUser(null)}}>Sign out</button></header><main><label>EMPLOYEE SECURITY PORTAL</label><h1>Hello, {user.name}</h1><p>Your personal security health, explained simply.</p><div className="portal-grid"><Panel><ShieldCheck/><label>PERSONAL SECURITY SCORE</label><b className="portal-score">{safetyScore}</b><p>{flagged?"Needs review · An analyst may follow up":"Healthy · No immediate action required"}</p></Panel><Panel><Activity/><label>RECENT ACTIVITY</label><h2>{record?record.activity:"Normal"}</h2><p>{flagged?"This differs from your usual behavioral baseline.":"Your activity is within your usual behavioral pattern."}</p></Panel><Panel><ShieldCheck/><label>ACCOUNT SECURITY</label><h2>Protected</h2><p>Multi-factor authentication is enabled.</p></Panel><Panel><TriangleAlert/><label>SECURITY NOTICE</label><h2>{flagged?"1 active notice":"No active warnings"}</h2><p>Activity Management System will notify you if an action needs your attention.</p></Panel></div></main></div>
}

function App(){
 const [loading,setLoading]=useState(true);
 const [user,setUser]=useState(()=>JSON.parse(localStorage.getItem("sq_user")||"null"));
 const loc=useLocation();
 useEffect(()=>{const t=setTimeout(()=>setLoading(false),350);return ()=>clearTimeout(t)},[]);
 if(loading)return <div className="splash"><div className="spinner"/></div>;
 if(!user)return <Login setUser={setUser}/>;
 if(user.role==="Employee")return <Portal user={user} setUser={setUser}/>;
 let p=loc.pathname;
 const known=["/","/employees","/employees/new","/activity","/alerts","/risk","/reports","/settings","/investigation"];
 let page=p==="/"?<Dashboard user={user}/>
  :p==="/employees"?<Employees user={user}/>
  :p==="/employees/new"?(user.role==="Admin"?<AddEmployee/>:<Forbidden/>)
  :p.startsWith("/employees/")?<Profile id={p.split("/")[2]}/>
  :p==="/activity"?<ActivityPage/>
  :p==="/alerts"?<AlertsPage user={user}/>
  :p==="/risk"?<RiskPage/>
  :p==="/reports"?<Reports/>
  :p==="/settings"?<SettingsPage user={user} setUser={setUser}/>
  :p==="/investigation"?<Investigation/>
  :known.includes(p)?<Dashboard user={user}/>
  :<NotFound/>;
 return <Layout user={user} setUser={setUser}>{page}</Layout>
}
createRoot(document.getElementById("root")).render(<React.StrictMode><BrowserRouter><ToastHost/><App/></BrowserRouter></React.StrictMode>);
