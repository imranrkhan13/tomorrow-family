import type {Result} from '../src/model.js';
export type Lookup={status:'ok'|'pending'|'failed'|'missing';result?:Result;error?:string};
/** Read-only reconciliation. Never sends to /api/extract; stop after a bounded wait. */
export async function awaitSavedResult(check:()=>Promise<Lookup>,wait:(ms:number)=>Promise<void>,attempts=40,intervalMs=5000):Promise<Lookup>{
 for(let i=0;i<attempts;i++){
  try{const found=await check();if(found.status==='ok'||found.status==='failed')return found;}catch{/* A failed read is not proof the provider call failed. */}
  if(i<attempts-1)await wait(intervalMs);
 }
 return {status:'pending',error:'Still processing or outcome uncertain. Check the saved result later; do not resend.'};
}
