import {createServer} from 'node:http';
import {createServer as createViteServer,loadEnv} from 'vite';
import {handle} from './http.js';
import {checkLev} from './lev-check.js';
import {checkJev} from './jev-check.js';
Object.assign(process.env,loadEnv('development',process.cwd(),''));
const vite=await createViteServer({server:{middlewareMode:true}});
createServer((req,res)=>{if(req.url?.startsWith('/api/')){(req.url?.split('?')[0]==='/api/lev-check'?checkLev(req,res,true):req.url?.split('?')[0]==='/api/jev-check'?checkJev(req,res,true):handle(req,res,true)).catch(()=>{res.statusCode=500;res.end('{"error":"Local service unavailable"}');});}else vite.middlewares(req,res);}).listen(5174,'127.0.0.1',()=>console.log('Tomorrow: http://127.0.0.1:5174'));
