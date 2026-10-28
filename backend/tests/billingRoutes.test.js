import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { createBillingRouter } from '../src/routes/asaasRoutes.js';

async function serverFixture() {
 const calls=[];
 const app=express();app.use(express.json());
 const authenticate=(req,res,next)=>{if(!req.get('authorization')) return res.status(401).json({error:'unauthorized'});req.usuario={clinica_id:7,perfil:req.get('x-test-role') || 'admin'};next();};
 const authorize=(req,res,next)=>req.usuario.perfil==='admin'?next():res.status(403).json({error:'forbidden'});
 app.use('/api/asaas',createBillingRouter({authenticate,authorize,webhookToken:()=> 'test-only-secret',billing:{
 status:async id=>({clinic:id,configured:false}),resume:async id=>({clinic:id,state:'new'}),subscribe:async(id,body,ip)=>{calls.push({id,body,ip});return {state:'pending'};},webhook:async body=>{calls.push(body);return {received:true};}
 }}));
 const listener=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});
 return {url:`http://127.0.0.1:${listener.address().port}/api/asaas`,calls,close:()=>new Promise(resolve=>listener.close(resolve))};
}
test('rotas exigem login e administrador e usam clínica do token em vez do corpo',async()=>{
 const f=await serverFixture();try {
 assert.equal((await fetch(`${f.url}/status`)).status,401);
 assert.equal((await fetch(`${f.url}/subscribe`,{method:'POST',headers:{authorization:'test','x-test-role':'veterinario','content-type':'application/json'},body:'{}'})).status,403);
 const result=await fetch(`${f.url}/subscribe`,{method:'POST',headers:{authorization:'test','content-type':'application/json'},body:JSON.stringify({clinicaId:999})});
 assert.equal(result.status,200);assert.equal(f.calls[0].id,7);assert.equal(f.calls[0].ip,'127.0.0.1');
 assert.equal((await fetch(`${f.url}/checkout`,{headers:{authorization:'test','x-test-role':'veterinario'}})).status,403);
 }finally {await f.close();}
});
test('webhook rejeita token ausente ou incorreto antes de processar eventos',async()=>{
 const f=await serverFixture();try {
 for(const token of [null,'wrong','same-length-bad!']) {
 const headers={'content-type':'application/json'};if(token) headers['asaas-access-token']=token;
 assert.equal((await fetch(`${f.url}/webhook`,{method:'POST',headers,body:'{}'})).status,401);
 }
 assert.equal(f.calls.length,0);
 assert.equal((await fetch(`${f.url}/webhook`,{method:'POST',headers:{'content-type':'application/json','asaas-access-token':'test-only-secret'},body:'{}'})).status,200);
 assert.equal(f.calls.length,1);
 }finally {await f.close();}
});

test('diagnóstico público identifica versão e ambiente sem expor segredos nem dados da clínica',async()=>{
 const f=await serverFixture();try {
 const response=await fetch(`${f.url}/configuration`);assert.equal(response.status,200);const data=await response.json();assert.equal(data.billingVersion,2);assert.deepEqual(Object.keys(data).sort(),['billingVersion','configured','environment']);assert.equal(response.headers.get('cache-control'),'no-store');assert.equal(f.calls.length,0);
 }finally {await f.close();}
});
