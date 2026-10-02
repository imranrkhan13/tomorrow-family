import {textCheckInput} from '../src/prescription.js';
import type {IncomingMessage,ServerResponse} from 'node:http';
import {createHash} from 'node:crypto';
import {inputSchema,validateInput} from './extraction.js';
import {intakeKey,savedIntake} from './intake.js';
import {storeFor} from './http.js';
import {reviewTextWithLev} from './lev-gate.js';
import {FileLevBudget,RedisLevBudget,type LevBudget} from './lev-budget.js';
import type {IntakeLinked} from '../src/intake.js';
export function budgetFor(local=false):LevBudget|null{if(local)return new FileLevBudget();const url=process.env.UPSTASH_REDIS_REST_URL??process.env.KV_REST_API_URL,token=process.env.UPSTASH_REDIS_REST_TOKEN??process.env.KV_REST_API_TOKEN;return url&&token?new RedisLevBudget(url,token):null;}
export async function checkLev(req:IncomingMessage,res:ServerResponse,local=false,transport:typeof fetch=fetch){const reply=(status:number,body:unknown)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(body));};
 if(req.method!=='POST'){reply(405,{error:'Method not allowed'});return;}
 const origin=req.headers.origin;if(origin){try{if(new URL(origin).host!==req.headers.host){reply(403,{error:'Origin rejected'});return;}}catch{reply(403,{error:'Invalid origin'});return;}}
 const store=storeFor(local),budget=budgetFor(local),key=process.env.HF_LEV_TOKEN;
 if(!store||!budget||!key||process.env.LEV_PUBLIC_ENABLED!=='true'){reply(503,{status:'disabled',error:'Lev text check is not available. Review every field yourself.'});return;}
 let input;try{let length=0;const chunks:Buffer[]=[];for await(const chunk of req){length+=chunk.length;if(length>4_200_000){reply(413,{error:'File too large.'});return;}chunks.push(Buffer.from(chunk));}const parsedBody=(req as IncomingMessage & {body?:unknown}).body;const body=parsedBody===undefined?JSON.parse(Buffer.concat(chunks).toString()):typeof parsedBody==='string'?JSON.parse(parsedBody):parsedBody;if(Buffer.byteLength(JSON.stringify(body))>4_200_000){reply(413,{error:'File too large.'});return;}input=inputSchema.parse(body);validateInput(input);}catch{reply(400,{error:'Invalid input. No Lev call.'});return;}
 try{const source=await store.lookup(intakeKey(input));if(source?.status!=='ok'){reply(409,{error:'No completed prescription reading; no Lev call.'});return;}
 const result=savedIntake(source,input);if(result.useCase!=='prescription'){reply(409,{error:'Older reading is not eligible for Lev.'});return;}
 const id=createHash('sha256').update('lev.v1:'+intakeKey(input)).digest('hex');const existing=await budget.lookup(id);if(existing){reply(200,existing.status==='ok'?{status:'ok',findings:existing.findings,cacheHit:true}:{status:existing.status,error:existing.error??'Check pending; no repeat.'});return;}if(req.headers['x-tomorrow-lev-readonly']==='true'){reply(200,{status:'missing',error:'No saved Lev result. No provider call.'});return;}
 if(process.env.TEXT_CHECKS_ENABLED!=='true'){reply(200,{status:'held',error:'Checks are held until provider billing is confirmed. Not run, no score.'});return;}
 // Every extraction is checked, including readings the app could not match to one OCR line. Source support stays visible per field.
 const context=textCheckInput(result,true);if(!context.text.trim()||!context.fields.length){reply(200,{status:'skipped',error:'No extracted text or candidate values to check.'});return;}if(context.text.length>1600){reply(409,{error:'Source is too long for Lev. No call.'});return;}
 await budget.reserve(id);try{const output=await reviewTextWithLev(result,key,transport,true);if(output.tokens>100_000||output.tokens<0||!Number.isSafeInteger(output.tokens))throw Error('Lev usage exceeded reservation; halted.');await budget.finish(id,output.findings,output.tokens);reply(200,{status:'ok',findings:output.findings,cacheHit:false});}catch(e){const message=e instanceof Error?e.message:'Lev result uncertain';await budget.fail(id,message);reply(502,{status:'failed',error:'Lev check unavailable; no retry. Check every field yourself.'});}
 }catch(e){reply(409,{error:e instanceof Error?e.message:'Lev check unavailable. No call.'});}
                                                                                                                }
