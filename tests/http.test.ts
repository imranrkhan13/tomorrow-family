import {test} from 'node:test';import assert from 'node:assert/strict';
import {mkdtemp} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {FileStore} from '../server/store.js';import {inputHash,type Input} from '../server/extraction.js';import {handle} from '../server/http.js';
import {Readable} from 'node:stream';
const input:Input={text:'Maple School test',file:null};
test('read-only lookup recovers exact cached result and never calls provider',async()=>{
 const old=process.cwd(),dir=await mkdtemp(join(tmpdir(),'tomorrow-http-'));
 try{process.chdir(dir);process.env.INTERFAZE_API_KEY='fixture-only';process.env.FREE_CREDIT_CONFIRMED='false';process.env.HOUSEHOLD_ACCESS_CODE='a-long-household-code';const store=new FileStore();await store.reserve(inputHash(input),2_000_000,2);await store.finish(inputHash(input),{status:'ok',result:{summary:'Cached',tasks:[],inputHash:inputHash(input)}},1,.001);
 const req=Readable.from([JSON.stringify(input)]) as any;req.url='/api/lookup';req.method='POST';req.headers={authorization:'Bearer a-long-household-code',host:'localhost'};
 const chunks:string[]=[];let code=0;const res={writeHead(n:number){code=n;},end(x:string){chunks.push(x);}} as any;
 process.env.UPSTASH_REDIS_REST_URL='';process.env.UPSTASH_REDIS_REST_TOKEN='';
 await handle(req,res,true);assert.equal(code,200);assert.equal(JSON.parse(chunks.join('')).status,'ok');assert.equal((await store.ledger()).usd,.001);
 }finally{process.chdir(old);}
});
