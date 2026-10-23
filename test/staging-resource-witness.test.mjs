/**
 * M4-B6-C independent parent-side TCP/child lifecycle observation.
 * This file is DEVELOPMENT-ONLY and is never included in the npm package.
 * Port originates from the fixed trusted in-repository staging worker, never
 * from a public CLI option, user JSON, external URL or network resolution.
 * Observations are OS TCP bind attempts, NOT kernel-wide network tracing.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { fork } from 'node:child_process';
import net from 'node:net';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { runFirstPartyStagingProcessSelftest } from '../src/staging-process-harness.mjs';

const WORKER=fileURLToPath(new URL('../src/first-party-staging-worker.mjs',import.meta.url));
const FIXED_IP='127.0.0.1';
const MODES=new Set(['witness','witness-hold','witness-forbidden','witness-bad-ipc']);
function sleep(ms){return new Promise(r=>setTimeout(r,ms));}
function validBound(message,pid){
  return message && typeof message==='object' && !Array.isArray(message) &&
    Object.getPrototypeOf(message)===Object.prototype &&
    Object.keys(message).length===4 &&
    message.kind==='WITNESS_BOUND' && message.host===FIXED_IP &&
    message.pid===pid && Number.isSafeInteger(message.port) &&
    message.port>0 && message.port<65536;
}
async function observeBind(port) {
  // The parent does not trust the child's claimed "closed" or "open" fields.
  // Instead it asks the OS whether our own fixed IPv4 loopback port can bind.
  const sock=net.createServer();
  return await new Promise(resolve=>{
    const finish=value=>resolve(value);
    sock.once('error',err=>finish(err.code==='EADDRINUSE'?'BUSY':'INDETERMINATE'));
    sock.listen({host:FIXED_IP,port,exclusive:true},()=>{
      sock.close(()=>finish('FREE'));
    });
  });
}
async function rejectedRequest(port,kind){
  const headers={
    host:FIXED_IP+':'+port,origin:'http://127.0.0.1',
    'content-type':'application/json',
    accept:'application/json, text/event-stream',
    'mcp-protocol-version':'2026-07-28',
    'mcp-method':'tools/call'
  };
  if(kind==='wrong-host')headers.host='wrong.invalid:8';
  if(kind==='wrong-origin')headers.origin='http://wrong.invalid';
  // A genuinely unknown method with matching mirrored header/body must
  // produce the normative HTTP 404, not a HeaderMismatch HTTP 400.
  const payload=JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/call',
    params:{name:'fictional-never-executed',arguments:{},_meta:{
      'io.modelcontextprotocol/protocolVersion':'2026-07-28',
      'io.modelcontextprotocol/clientInfo':{name:'fictional-client',version:'1'},
      'io.modelcontextprotocol/clientCapabilities':{}
    }}});
  headers['content-length']=String(Buffer.byteLength(payload));
  return await new Promise((resolve,reject)=>{
    const req=http.request({hostname:FIXED_IP,port,path:'/mcp',
      method:'POST',agent:false,headers},res=>{
      res.resume();res.once('end',()=>resolve(res.statusCode));
    });
    req.once('error',reject);
    req.end(payload);
  });
}
async function ownedWitness(mode,{inject=null,release=true,deadlineMs=5000}={}){
  if(!MODES.has(mode))throw new TypeError('INVALID_OBSERVATION_MODE');
  return await new Promise(resolve=>{
    const worker=fork(WORKER,[mode],{
      execPath:process.execPath,execArgv:[],env:{NODE_NO_WARNINGS:'1'},
      stdio:['ignore','ignore','ignore','ipc'],windowsHide:true
    });
    let port=null,pid=null,sourceCount=0,busy=null,endpointStatus=null,
      output=null,fail=null,killed=false,finished=false;
    let timer,killTimer;
    const terminate=code=>{
      if(fail)return;
      fail=code;
      if(worker.exitCode===null){killed=true;worker.kill();}
    };
    const finish=async(exitCode,signal)=>{
      if(finished)return;
      finished=true;clearTimeout(timer);clearTimeout(killTimer);
      let after=null;
      if(port)after=await observeBind(port);
      resolve({pid,pidMatches:pid===worker.pid,sourceCount,busy,after,
        endpointStatus,output,exitCode,signal,killed,fail});
    };
    timer=setTimeout(()=>terminate('WITNESS_TIMEOUT'),deadlineMs);
    worker.on('message',async m=>{
      if(fail)return;
      if(!pid){
        sourceCount++;
        if(!validBound(m,worker.pid)){
          terminate('WITNESS_INVALID_BOUND');return;
        }
        pid=m.pid;port=m.port;
        busy=await observeBind(port);
        if(busy!=='BUSY'){terminate('WITNESS_PORT_NOT_BOUND');return;}
        if(inject){
          try{endpointStatus=await rejectedRequest(port,inject);}
          catch{terminate('WITNESS_INJECTION_FAILED');return;}
        }
        if(release){
          worker.send({kind:'WITNESS_RELEASE'},err=>{
            if(err)terminate('WITNESS_RELEASE_FAILED');
          });
        }
      }else {
        sourceCount++;
        if(sourceCount!==2 || !m || typeof m!=='object' ||
            Object.keys(m).length!==6 || m.kind!=='STAGING_RESULT'){
          terminate('WITNESS_RESULT_INVALID');return;
        }
        output={status:m.status,checked:m.checked,received:m.received,
          accepted:m.accepted,externalTargetContacted:m.externalTargetContacted};
      }
    });
    worker.once('error',()=>terminate('WITNESS_START_ERROR'));
    worker.once('exit',(code,signal)=>{void finish(code,signal);});
  });
}

test('M4-B6-C: positive child holds port and yields it only after verified exit',async()=>{
  const a=await ownedWitness('witness');
  assert.equal(a.fail,null);
  assert.equal(a.pidMatches,true);
  assert.equal(a.sourceCount,2);
  assert.equal(a.busy,'BUSY');
  assert.equal(a.after,'FREE');
  assert.equal(a.exitCode,0);
  assert.equal(a.output.status,'PASS');
  assert.equal(a.output.externalTargetContacted,false);
});

test('M4-B6-C: intentional held listener is released after parent kills child',async()=>{
  const a=await ownedWitness('witness-hold',{release:false,deadlineMs:950});
  assert.equal(a.fail,'WITNESS_TIMEOUT');
  assert.equal(a.killed,true);
  assert.equal(a.sourceCount,1);
  assert.equal(a.busy,'BUSY');
  assert.equal(a.after,'FREE');
  assert.equal(a.pidMatches,true);
});

test('M4-B6-C: malformed untrusted bound IPC cannot trigger socket probing',async()=>{
  const a=await ownedWitness('witness-bad-ipc');
  assert.equal(a.fail,'WITNESS_INVALID_BOUND');
  assert.equal(a.sourceCount,1);
  assert.equal(a.busy,null);
  assert.equal(a.after,null);
  assert.equal(a.killed,true);
});

test('M4-B6-C: first-party forbidden method denied and owned port cleaned',async()=>{
  const a=await ownedWitness('witness-forbidden',{inject:'tools-call'});
  assert.equal(a.fail,null);
  assert.equal(a.endpointStatus,404);
  assert.equal(a.output.status,'FAIL');
  assert.equal(a.output.accepted,0);
  assert.equal(a.busy,'BUSY');
  assert.equal(a.after,'FREE');
});

test('M4-B6-C: Host and Origin variants denied with no allowed discovery',async()=>{
  for(const kind of ['wrong-host','wrong-origin']){
    const a=await ownedWitness('witness-forbidden',{inject:kind});
    assert.equal(a.fail,null,kind);
    assert.equal(a.endpointStatus,403,kind);
    assert.equal(a.output.status,'FAIL',kind);
    assert.equal(a.output.accepted,0,kind);
    assert.equal(a.after,'FREE',kind);
  }
});

test('M4-B6-C: repeated first-party witness cycle yields same bound/free evidence',async()=>{
  const a=await ownedWitness('witness');
  const b=await ownedWitness('witness');
  for(const result of [a,b]){
    assert.equal(result.fail,null);
    assert.equal(result.pidMatches,true);
    assert.equal(result.busy,'BUSY');
    assert.equal(result.after,'FREE');
  }
});

test('M4-B6-C: timeout and malformed legacy worker reports remain symbolic',async()=>{
  const [timeout,bad]=await Promise.all([
    runFirstPartyStagingProcessSelftest({fault:'hang',deadlineMs:380}),
    runFirstPartyStagingProcessSelftest({fault:'invalid-ipc'})
  ]);
  assert.equal(timeout.status,'FAIL');
  assert.equal(timeout.findings[0].rule,'STAGING_WORKER_TIMEOUT');
  assert.equal(bad.status,'FAIL');
  assert.equal(bad.findings[0].rule,'STAGING_WORKER_IPC_REJECTED');
  assert.ok(!JSON.stringify(bad).includes('FICTIONAL_CANARY'));
});

test('M4-B6-C: caller-injected destination and worker code denied pre-fork',async()=>{
  for(const options of [
    {url:'https://unapproved.invalid/mcp'},
    {host:'0.0.0.0',fault:'normal'},
    {argv:['--eval','not-allowed']},
    {fault:'witness'},
    {env:{FAKE_TOKEN:'REDACT'}},
  ])await assert.rejects(runFirstPartyStagingProcessSelftest(options),
    /INVALID_STAGING_PROCESS_OPTIONS/);
});
