const express=require('express');
const cors=require('cors');
const bcrypt=require('bcryptjs');
const jwt=require('jsonwebtoken');
const mysql=require('mysql2/promise');
const path=require('path');

const app=express();
app.use(cors({origin:true,credentials:true}));
app.use(express.json({limit:'1mb'}));

const PORT=Number(process.env.PORT||3000);
const DB_HOST=process.env.DB_HOST||'127.0.0.1';
const DB_PORT=Number(process.env.DB_PORT||3306);
const DB_USER=process.env.DB_USER||'root';
const DB_PASSWORD=process.env.DB_PASSWORD||'';
const DB_NAME=(process.env.DB_NAME||'seyed_razi').replace(/[^a-zA-Z0-9_]/g,'');
const JWT_SECRET=process.env.JWT_SECRET||'local-laragon-secret-change-me';
const ADMIN_PASSWORD=process.env.ADMIN_PASSWORD||'123456';

let pool;
const DEFAULT={contact:{address:'محمدیه، قزوین، جنب سالن نیایش',phone:'',email:'info@example.ir'},news:[{tag:'اطلاعیه',date:'۰۲ شهریور',title:'آغاز سال تحصیلی جدید',text:'برای یک سال تازه و پر از تجربه‌های جدید آماده می‌شویم.'},{tag:'برنامه',date:'۰۱ شهریور',title:'برنامه هفتگی کلاس‌ها',text:'برنامه هر پایه و کلاس از بخش برنامه هفتگی قابل مشاهده است.'},{tag:'جلسه',date:'۲۹ مرداد',title:'جلسه اولیا و مربیان',text:'زمان‌بندی جلسات پس از تأیید مدیریت اطلاع‌رسانی می‌شود.'}],grades:['هفتم','هشتم','نهم'],classes:{'هفتم':['الف','ب'],'هشتم':['الف','ب'],'نهم':['الف','ب']},schedule:{}};
const days=['شنبه','یکشنبه','دوشنبه','سه‌شنبه','چهارشنبه'];
const baseSubjects=[['ریاضی','علوم','فارسی','ورزش'],['انگلیسی','مطالعات','ریاضی','هنر'],['علوم','فارسی','ریاضی','رایانه'],['مطالعات','انگلیسی','ورزش','علوم'],['ریاضی','فارسی','فناوری','پرورشی']];
function makeDefault(){const d=JSON.parse(JSON.stringify(DEFAULT));for(const g of d.grades)for(const c of d.classes[g])d.schedule[g+'|'+c]=days.map((_,i)=>[...baseSubjects[i]]);return d;}

async function initDb(){
  const root=await mysql.createConnection({host:DB_HOST,port:DB_PORT,user:DB_USER,password:DB_PASSWORD});
  await root.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await root.end();
  pool=mysql.createPool({host:DB_HOST,port:DB_PORT,user:DB_USER,password:DB_PASSWORD,database:DB_NAME,waitForConnections:true,connectionLimit:10,charset:'utf8mb4'});
  await pool.query(`CREATE TABLE IF NOT EXISTS site_data (id INT PRIMARY KEY, data JSON NOT NULL, updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)`);
  await pool.query(`CREATE TABLE IF NOT EXISTS admin_users (id INT AUTO_INCREMENT PRIMARY KEY, username VARCHAR(100) UNIQUE NOT NULL, password_hash VARCHAR(255) NOT NULL)`);
  const [s]=await pool.query('SELECT id FROM site_data WHERE id=1');if(!s.length)await pool.query('INSERT INTO site_data(id,data) VALUES(1,?)',[JSON.stringify(makeDefault())]);
  const [u]=await pool.query('SELECT id FROM admin_users WHERE username=?',['admin']);if(!u.length){const hash=await bcrypt.hash(ADMIN_PASSWORD,12);await pool.query('INSERT INTO admin_users(username,password_hash) VALUES(?,?)',['admin',hash]);console.log('Admin user created: admin');}
}
function auth(req,res,next){try{const h=req.headers.authorization||'';const token=h.startsWith('Bearer ')?h.slice(7):'';req.user=jwt.verify(token,JWT_SECRET);next();}catch(e){res.status(401).json({error:'UNAUTHORIZED'});}}
function normalize(data){if(!data||typeof data!=='object')throw Error('Invalid data');if(!data.contact)data.contact={};if(!Array.isArray(data.news))data.news=[];if(!Array.isArray(data.grades))data.grades=[];if(!data.classes)data.classes={};if(!data.schedule)data.schedule={};data.contact.address=String(data.contact.address||'').slice(0,300);data.contact.phone=String(data.contact.phone||'').slice(0,80);data.contact.email=String(data.contact.email||'').slice(0,160);data.grades=data.grades.map(String).slice(0,30);for(const g of data.grades)data.classes[g]=(data.classes[g]||[]).map(String).slice(0,30);data.news=data.news.slice(0,30).map(n=>({tag:String(n.tag||'').slice(0,80),date:String(n.date||'').slice(0,80),title:String(n.title||'').slice(0,200),text:String(n.text||'').slice(0,2000)}));return data;}

app.get('/api/health',(req,res)=>res.json({ok:true,service:'seyed-razi-laragon',database:DB_NAME}));
app.get('/api/site',async(req,res)=>{try{const [r]=await pool.query('SELECT data,updated_at FROM site_data WHERE id=1');if(!r.length)return res.status(404).json({error:'NO_DATA'});const data=typeof r[0].data==='string'?JSON.parse(r[0].data):r[0].data;res.json({...data,updatedAt:r[0].updated_at});}catch(e){console.error(e);res.status(500).json({error:'SERVER_ERROR'});}});
app.post('/api/admin/login',async(req,res)=>{try{const {username,password}=req.body||{};const [r]=await pool.query('SELECT * FROM admin_users WHERE username=?',[String(username||'')]);if(!r.length||!(await bcrypt.compare(String(password||''),r[0].password_hash)))return res.status(401).json({error:'نام کاربری یا رمز عبور نادرست است.'});const token=jwt.sign({id:r[0].id,username:r[0].username},JWT_SECRET,{expiresIn:'7d'});res.json({token,username:r[0].username});}catch(e){console.error(e);res.status(500).json({error:'SERVER_ERROR'});}});
app.get('/api/admin/me',auth,(req,res)=>res.json({ok:true,username:req.user.username}));
app.put('/api/admin/site',auth,async(req,res)=>{try{const data=normalize(req.body);await pool.query('UPDATE site_data SET data=? WHERE id=1',[JSON.stringify(data)]);res.json({ok:true,data});}catch(e){console.error(e);res.status(400).json({error:e.message});}});
app.put('/api/admin/password',auth,async(req,res)=>{try{const p=String((req.body||{}).password||'');if(p.length<6)return res.status(400).json({error:'رمز باید حداقل ۶ کاراکتر باشد.'});const hash=await bcrypt.hash(p,12);await pool.query('UPDATE admin_users SET password_hash=? WHERE id=?',[hash,req.user.id]);res.json({ok:true});}catch(e){console.error(e);res.status(500).json({error:'SERVER_ERROR'});}});
app.use(express.static(__dirname));
app.get('/{*splat}',(req,res)=>res.sendFile(path.join(__dirname,'index.html')));

initDb().then(()=>app.listen(PORT,'127.0.0.1',()=>console.log(`Seyed Razi running: http://localhost:${PORT}`))).catch(e=>{console.error('Database startup failed:',e);process.exit(1);});
