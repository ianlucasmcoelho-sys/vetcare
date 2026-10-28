import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { createFiscalRouter } from '../src/routes/notaFiscalRoutes.js';

test('módulo fiscal exige autenticação e bloqueia leitura, configuração, emissão e cancelamento',async()=>{
 const app=express();app.use(express.json());
 app.use('/api/notas-fiscais',createFiscalRouter((req,res,next)=>req.get('authorization')==='Bearer test-only'?next():res.status(401).json({error:'Sessão necessária'})));
 const server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});
 const base=`http://127.0.0.1:${server.address().port}/api/notas-fiscais`;
 try {
  assert.equal((await fetch(base)).status,401);
  for(const [method,path] of [['GET',''],['GET','/stats'],['GET','/1'],['GET','/configuracoes'],['POST',''],['PUT','/configuracoes'],['POST','/1/cancelar'],['DELETE','/1']]) {
   const response=await fetch(base+path,{method,headers:{authorization:'Bearer test-only','content-type':'application/json'},...(['POST','PUT'].includes(method)?{body:'{}'}:{})});
   assert.equal(response.status,503,`${method} ${path}`);assert.equal((await response.json()).code,'FISCAL_MODULE_COMING_SOON');
  }
 }finally {await new Promise(resolve=>server.close(resolve));}
});
