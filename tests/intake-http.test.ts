import{test}from'node:test';import assert from'node:assert/strict';import{Readable}from'node:stream';import{mkdtemp}from'node:fs/promises';import{tmpdir}from'node:os';import{join}from'node:path';import{handle}from'../server/http.js';
const input={text:'Invoice #F42\nAmount: 200 USD',file:null};
async function request(path:string){const req=Readable.from([JSON.stringify(input)]) as any;req.url=path;req.method='POST';req.headers={host:'localhost'};let code=0,body='';await handle(req,{writeHead(c:number){code=c;},end(s:string){body=s;}} as any,true);return{code,body:JSON.parse(body)};}
test('intake lookup reads only intake key and never returns old notice cache',async()=>{const old=process.cwd(),dir=await mkdtemp(join(tmpdir(),'tomorrow-intake-http-'));try{process.chdir(dir);const a=await request('/api/intake-lookup');assert.equal(a.code,200);assert.equal(a.body.status,'missing');assert.match(a.body.error,/No server-side record/);const b=await request('/api/unknown');assert.equal(b.code,404);}finally{process.chdir(old);}});

test('pending intake is HTTP 202 and lookup remains read-only',async()=>{
 const old=process.cwd(),dir=await mkdtemp(join(tmpdir(),'tomorrow-pending-http-'));
 const env={key:process.env.INTERFAZE_API_KEY,free:process.env.FREE_CREDIT_CONFIRMED,tokens:process.env.TOKEN_CAP,credit:process.env.CREDIT_CAP_USD};
 try{
  process.chdir(dir);process.env.INTERFAZE_API_KEY='mock';process.env.FREE_CREDIT_CONFIRMED='true';process.env.TOKEN_CAP='2000000';process.env.CREDIT_CAP_USD='2';
  const {FileStore}=await import('../server/store.js');const {intakeKey}=await import('../server/intake.js');
  const store=new FileStore();await store.reserve(intakeKey(input),2_000_000,2);
  const pending=await request('/api/intake');assert.equal(pending.code,202);assert.equal(pending.body.status,'pending');
  const found=await request('/api/intake-lookup');assert.equal(found.code,200);assert.equal(found.body.status,'pending');
  assert.equal((await store.lookup(intakeKey(input)))?.status,'pending');
 }finally{process.chdir(old);for(const [key,value] of Object.entries({INTERFAZE_API_KEY:env.key,FREE_CREDIT_CONFIRMED:env.free,TOKEN_CAP:env.tokens,CREDIT_CAP_USD:env.credit})){if(value===undefined)delete process.env[key];else process.env[key]=value;}}
});
