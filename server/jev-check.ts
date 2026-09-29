import type {IncomingMessage,ServerResponse} from 'node:http';
import {createHash} from 'node:crypto';
import {inputSchema,validateInput} from './extraction.js';
import {intakeKey} from './intake.js';
import {storeFor} from './http.js';
import {reviewTextWithJev} from './jev-gate.js';
import {FileJevBudget,RedisJevBudget,type JevBudget} from './jev-budget.js';
import type {IntakeLinked} from '../src/intake.js';
export function budgetFor(local=false):JevBudget|null{if(local)return new FileJevBudget();const url=process.env.UPSTASH_REDIS_REST_URL??process.env.KV_REST_API_URL,token=process.env.UPSTASH_REDIS_REST_TOKEN??process.env.KV_REST_API_TOKEN;return url&&token?new RedisJevBudget(url,token):null;}
export async function checkJev(req:IncomingMessage,res:ServerResponse,local=false,transport:typeof fetch=fetch){const reply=(status:number,body:unknown)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(body));};
 if(req.method!=='POST'){reply(405,{error:'Method not allowed'});return;}
 const origin=req.headers.origin;if(origin){try{if(new URL(origin).host!==req.headers.host){reply(403,{error:'Origin rejected'});return;}}catch{reply(403,{error:'Invalid origin'});return;}}
 const store=storeFor(local),budget=budgetFor(local),key=process.env.TYPESAFE_JEV_API_KEY;
 if(!store||!budget||!key||process.env.JEV_PUBLIC_ENABLED!=='true'){reply(503,{status:'disabled',error:'Jev text check is not available. Review every field yourself.'});return;}
 let input;try{let length=0;const chunks:Buffer[]=[];for await(const chunk of req){length+=chunk.length;if(length>4_200_000){reply(413,{error:'File too large.'});return;}chunks.push(Buffer.from(chunk));}input=inputSchema.parse(JSON.parse(Buffer.concat(chunks).toString()));validateInput(input);}catch{reply(400,{error:'Invalid input. No Jev call.'});return;}
 try{const source=await store.lookup(intakeKey(input));if(source?.status!=='ok'){reply(409,{error:'No completed prescription reading; no Jev call.'});return;}
 const result=source.result as IntakeLinked;if(result.useCase!=='prescription'){reply(409,{error:'Older reading is not eligible for Jev.'});return;}
 const id=createHash('sha256').update('jev.v1:'+intakeKey(input)).digest('hex');const existing=await budget.lookup(id);if(existing){reply(200,existing.status==='ok'?{status:'ok',findings:existing.findings,cacheHit:true}:{status:existing.status,error:existing.error??'Check pending; no repeat.'});return;}if(req.headers['x-tomorrow-jev-readonly']==='true'){reply(200,{status:'missing',error:'No saved Jev result. No provider call.'});return;}
 if(!result.fields.some(f=>f.verified&&f.value.trim()&&f.quote.includes(f.value))){reply(200,{status:'skipped',error:'No linked source text to check.'});return;}
 await budget.reserve(id);try{const output=await reviewTextWithJev(result,key,transport);if(output.tokens>100_000||output.tokens<0||!Number.isSafeInteger(output.tokens))throw Error('Jev usage exceeded reservation; halted.');await budget.finish(id,output.findings,output.tokens);reply(200,{status:'ok',findings:output.findings,cacheHit:false});}catch(e){const message=e instanceof Error?e.message:'Jev result uncertain';await budget.fail(id,message);reply(502,{status:'failed',error:'Jev check unavailable; no retry. Check every field yourself.'});}
 }catch(e){reply(409,{error:e instanceof Error?e.message:'Jev check unavailable. No call.'});}
}}