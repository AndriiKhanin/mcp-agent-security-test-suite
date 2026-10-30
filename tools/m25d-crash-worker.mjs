#!/usr/bin/env node
/**
 * M25-D disposable, fixed first-party child process.
 * Never accept a remote address, real credential or arbitrary command.
 * The only "effect" is a process-local counter and parent IPC witness.
 */
import http from 'node:http';
import {randomUUID} from 'node:crypto';

const HOST='127.0.0.1',ORIGIN='http://127.0.0.1',PATH='/mcp';
const MCP='2026-07-28',MAX=4096;
const CAPABILITY='FICTIONAL_CAPABILITY_NOT_AUTHORIZATION';
const FROZEN_APPROVAL='synthetic-approval-only';
const policy=process.argv[3];
const validBoot=process.argv.length===4&&
  process.argv[2]==='--fixed-owned-worker'&&
  ['GUARDED','INTENTIONALLY_UNSAFE'].includes(policy)&&
  process.connected===true&&typeof process.send==='function'&&
  process.env.M25D_FIXED_WORKER==='1';

if(!validBoot){
  process.stdout.write(JSON.stringify({
    status:'ERROR',ruleCode:'DISPOSABLE_WORKER_DIRECT_USE_DENIED',
    realTargetContacted:false
  })+'\n');
  process.exitCode=2;
}else{
  const generation=randomUUID();
  const policyVersion=1;
  let effects=0,pending=false;
  const sockets=new Set();
  const owned=(obj,keys)=>!!obj&&typeof obj==='object'&&
    !Array.isArray(obj)&&Object.getPrototypeOf(obj)===Object.prototype&&
    Reflect.ownKeys(obj).length===keys.length&&keys.every(k=>
      Object.hasOwn(obj,k));
  const grant=()=>({
    capability:CAPABILITY,policyVersion,
    gateGeneration:generation,approvalId:FROZEN_APPROVAL
  });
  const envelope=(id,approval,mode)=>({
    jsonrpc:'2.0',id,method:'tools/call',
    params:{name:'fictional.commit',arguments:{mode,
      resource:'first-party-only'},
    _meta:{'io.modelcontextprotocol/protocolVersion':MCP,
      approval}}
  });
  const success=id=>({jsonrpc:'2.0',id,
    result:{fictionalEffect:'COUNTED_IN_CHILD_MEMORY'}});
  const invalidation=id=>({jsonrpc:'2.0',id,error:{
    code:-32010,message:'Fictional old-generation approval denied'
  }});
  function reply(res,status,body){
    const bytes=Buffer.from(JSON.stringify(body));
    res.writeHead(status,{'content-type':'application/json',
      'cache-control':'no-store',connection:'close',
      'content-length':String(bytes.length)});
    res.end(bytes);
  }
  function wire(req,port,size){
    const expected=new Set(['host','origin','content-type','accept',
      'mcp-protocol-version','content-length','connection']);
    const seen=new Set();
    for(let i=0;i<req.rawHeaders.length;i+=2){
      const k=req.rawHeaders[i].toLowerCase();
      if(seen.has(k)||!expected.has(k))return false;
      seen.add(k);
    }
    return seen.size===expected.size&&
      req.socket.remoteAddress===HOST&&req.method==='POST'&&req.url===PATH&&
      req.headers.host===HOST+':'+port&&req.headers.origin===ORIGIN&&
      req.headers['content-type']==='application/json'&&
      req.headers.accept==='application/json'&&
      req.headers['mcp-protocol-version']===MCP&&
      req.headers['content-length']===String(size)&&
      req.headers.connection==='close';
  }
  const server=http.createServer((req,res)=>{
    let count=0,over=false;const chunks=[];
    req.on('data',part=>{
      count+=part.length;
      if(count>MAX){over=true;chunks.length=0;}
      else if(!over)chunks.push(part);
    });
    req.on('end',()=>{
      let msg;
      try{msg=JSON.parse(new TextDecoder('utf-8',{fatal:true})
        .decode(Buffer.concat(chunks)));}
      catch{msg=null;}
      const id=msg?.id;
      const args=msg?.params?.arguments;
      const approval=msg?.params?._meta?.approval;
      if(over||!count||!wire(req,server.address().port,count)||
        ![1,2,3].includes(id)||!owned(args,['mode','resource'])||
        !['HOLD','EXEC'].includes(args.mode)||
        !owned(approval,[
          'capability','policyVersion','gateGeneration','approvalId'
        ])||JSON.stringify(msg)!==
          JSON.stringify(envelope(id,approval,args.mode))||
        approval.capability!==CAPABILITY||
        approval.policyVersion!==policyVersion||
        approval.approvalId!==FROZEN_APPROVAL){
        reply(res,400,{jsonrpc:'2.0',id:0,
          error:{code:-32020,message:'Invalid fictional request'}});
        return;
      }
      // Admission is not a grant to execute. We deliberately hold the
      // accepted HTTP request while the parent forcibly kills this PID.
      if(args.mode==='HOLD'&&id===1&&!pending){
        pending=true;
        process.send({type:'ADMITTED',id:1,effects});
        return; // No response, no effect and no durable write.
      }
      if(args.mode!=='EXEC'){
        reply(res,400,{jsonrpc:'2.0',id:0,error:{code:-32020}});return;
      }
      const validGeneration=approval.gateGeneration===generation;
      if(policy==='GUARDED'&&!validGeneration){
        reply(res,410,invalidation(id));
        return;
      }
      // Deliberately broken control ignores the child generation.
      effects++;
      process.send({type:'EFFECT',id,effects},()=>{
        reply(res,200,success(id));
      });
    });
    req.on('error',()=>{});
  });
  server.on('connection',s=>{
    sockets.add(s);
    s.once('close',()=>sockets.delete(s));
  });
  process.on('message',msg=>{
    if(!owned(msg,['type','id'])&&
      !owned(msg,['type']))return;
    if(msg.type==='ISSUE'&&[1,2,3].includes(msg.id)){
      process.send({type:'ISSUED',id:msg.id,grant:grant()});
    }else if(msg.type==='CLOSE'){
      // Graceful cleanup is allowed only for the surviving, fresh worker.
      server.close(()=>{
        process.send({type:'CLOSED',effects,socketsRemaining:sockets.size},
          ()=>process.exit(0));
      });
      server.closeAllConnections();
    }
  });
  server.listen(0,HOST,()=>{
    const address=server.address();
    process.send({type:'READY',port:address.port,
      gateGeneration:generation,policyVersion});
  });
}
