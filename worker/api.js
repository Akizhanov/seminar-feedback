const headers={'Content-Type':'application/json;charset=utf-8','Cache-Control':'no-store','Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type,Authorization','X-Content-Type-Options':'nosniff'};
function json(data,status=200){return new Response(JSON.stringify(data),{status,headers})}
export default {async fetch(request,env){const url=new URL(request.url);if(request.method==='OPTIONS')return new Response(null,{status:204,headers});try{
if(url.pathname==='/api/responses'&&request.method==='POST'){
if(Number(request.headers.get('content-length'))>16000)return json({error:'Too large'},413);
const raw=await request.text();if(raw.length>12000)return json({error:'Too large'},413);let d;try{d=JSON.parse(raw)}catch{return json({error:'Invalid JSON'},400)}
if(!d||!['ru','kz'].includes(d.lang)||!Number.isInteger(d.rating)||d.rating<1||d.rating>5||!Number.isInteger(d.word)||d.word<0||d.word>4||!Number.isInteger(d.format)||d.format<0||d.format>4||typeof d.wishes!=='string'||d.wishes.length>2000||typeof d.id!=='string'||! /^[0-9a-f-]{36}$/.test(d.id))return json({error:'Invalid answer'},400);
await env.DB.prepare('INSERT INTO responses (id,lang,rating,word,format,wishes) VALUES (?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING').bind(d.id,d.lang,d.rating,d.word,d.format,d.wishes.trim()).run();return json({ok:true})}
if(url.pathname==='/api/results'&&request.method==='GET'){
const password=env.SECRET_ADMIN_PASSWORD?await env.SECRET_ADMIN_PASSWORD.get():env.ADMIN_PASSWORD;
if(!password||request.headers.get('Authorization')!=='Bearer '+password)return json({error:'Unauthorized'},401);
const {results}=await env.DB.prepare('SELECT * FROM responses ORDER BY created_at DESC').all();return json({rows:results.map(r=>({...r,ratingIndex:r.rating-1}))})}
if(url.pathname.startsWith('/api/'))return json({error:'Not found'},404);
return new Response(HTML,{headers:{'Content-Type':'text/html;charset=utf-8','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'}})
}catch{return json({error:'Service unavailable'},500)}}};
