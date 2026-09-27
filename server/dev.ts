import {createServer} from 'node:http';
import {createServer as createViteServer,loadEnv} from 'vite';
import {handle} from './http.js';
Object.assign(process.env,loadEnv('development',process.cwd(),''));
const vite=await createViteServer({server:{middlewareMode:true}});
createServer((req,res)=>{if(req.url?.startsWith('/api/')){handle(req,res,true).catch(()=>{res.statusCode=500;res.end('{"error":"Local service unavailable"}');});}else vite.middlewares(req,res);}).listen(5174,'127.0.0.1',()=>console.log('Tomorrow: http://127.0.0.1:5174'));
