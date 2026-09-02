const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

const app = express();
app.use(express.json());

const allowedOrigins = (process.env.FRONTEND_URL || 'https://radvin226.github.io').split(',').map(x => x.trim()).filter(Boolean);
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(null, false);
  }
}));

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'CHANGE_THIS_SECRET';
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

async function init() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS site_data (
      id INTEGER PRIMARY KEY,
      data JSONB NOT NULL
    );
    CREATE TABLE IF NOT EXISTS admin_users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL
    );
  `);

  const site = await pool.query('SELECT id FROM site_data WHERE id=1');
  if (!site.rowCount) {
    const data = {
      contact: { address: 'محمدیه، قزوین، جنب سالن نیایش', phone: '', email: 'info@example.ir' },
      news: [
        {tag:'اطلاعیه',date:'۰۲ شهریور',title:'آغاز سال تحصیلی جدید',text:'برای یک سال تازه و پر از تجربه‌های جدید آماده می‌شویم.'},
        {tag:'برنامه',date:'۰۱ شهریور',title:'برنامه هفتگی کلاس‌ها',text:'برنامه هر پایه و کلاس از بخش برنامه هفتگی قابل مشاهده است.'},
        {tag:'جلسه',date:'۲۹ مرداد',title:'جلسه اولیا و مربیان',text:'زمان‌بندی جلسات پس از تأیید مدیریت اطلاع‌رسانی می‌شود.'}
      ],
      grades:['هفتم','هشتم','نهم'],
      classes:{'هفتم':['الف','ب'],'هشتم':['الف','ب'],'نهم':['الف','ب']},
      schedule:{}
    };
    const days=['شنبه','یکشنبه','دوشنبه','سه‌شنبه','چهارشنبه'];
    const subjects=[['ریاضی','علوم','فارسی','ورزش'],['انگلیسی','مطالعات','ریاضی','هنر'],['علوم','فارسی','ریاضی','رایانه'],['مطالعات','انگلیسی','ورزش','علوم'],['ریاضی','فارسی','فناوری','پرورشی']];
    for (const g of data.grades) for (const c of data.classes[g])
      data.schedule[`${g}|${c}`] = days.map((_,i)=>[...subjects[i]]);
    await pool.query('INSERT INTO site_data(id,data) VALUES(1,$1)', [JSON.stringify(data)]);
  }

  const admin = await pool.query('SELECT id FROM admin_users WHERE username=$1', ['admin']);
  if (!admin.rowCount) {
    const password = process.env.ADMIN_PASSWORD || '123456';
    const hash = await bcrypt.hash(password, 10);
    await pool.query('INSERT INTO admin_users(username,password_hash) VALUES($1,$2)', ['admin', hash]);
  }
}

function auth(req,res,next){
  const h=req.headers.authorization||'';
  const token=h.startsWith('Bearer ')?h.slice(7):'';
  try { req.user=jwt.verify(token,JWT_SECRET); next(); }
  catch { return res.status(401).json({error:'Unauthorized'}); }
}

app.get('/api/health', async (req,res)=>{
  try { await pool.query('SELECT 1'); res.json({ok:true, database:'postgresql'}); }
  catch(e){ res.status(500).json({ok:false,error:'Database unavailable'}); }
});

app.get('/api/site', async (req,res)=>{
  const r=await pool.query('SELECT data FROM site_data WHERE id=1');
  res.json(r.rows[0]?.data || {});
});

app.post('/api/admin/login', async (req,res)=>{
  const {username,password}=req.body||{};
  const r=await pool.query('SELECT * FROM admin_users WHERE username=$1',[username||'']);
  if(!r.rowCount || !(await bcrypt.compare(password||'',r.rows[0].password_hash)))
    return res.status(401).json({error:'نام کاربری یا رمز عبور نادرست است.'});
  const token=jwt.sign({id:r.rows[0].id,username:r.rows[0].username},JWT_SECRET,{expiresIn:'7d'});
  res.json({token,user:{username:r.rows[0].username}});
});

app.get('/api/admin/me',auth,(req,res)=>res.json({user:req.user}));

app.put('/api/admin/site',auth,async(req,res)=>{
  await pool.query('UPDATE site_data SET data=$1 WHERE id=1',[JSON.stringify(req.body||{})]);
  const updated = await pool.query('SELECT data FROM site_data WHERE id=1');
  res.json({ok:true,data:updated.rows[0]?.data || {}});
});

app.put('/api/admin/password',auth,async(req,res)=>{
  const p=String(req.body?.password||'');
  if(p.length<6) return res.status(400).json({error:'رمز باید حداقل ۶ کاراکتر باشد.'});
  const hash=await bcrypt.hash(p,10);
  await pool.query('UPDATE admin_users SET password_hash=$1 WHERE id=$2',[hash,req.user.id]);
  res.json({ok:true});
});

app.get('/',(req,res)=>res.json({service:'Seyed Razi School API',ok:true}));
app.get('/{*splat}',(req,res)=>{
  if(req.path.startsWith('/api/')) return res.status(404).json({error:'Not found'});
  res.json({service:'Seyed Razi School API',ok:true});
});

init().then(()=>app.listen(PORT,()=>console.log(`API listening on ${PORT}`)))
  .catch(err=>{console.error(err);process.exit(1)});
