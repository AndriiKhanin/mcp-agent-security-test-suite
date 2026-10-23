/**
 * Fixed, trusted M4-B6-B subprocess. Never accepts user URLs, methods,
 * credentials, source paths or instructions. Only first-party localhost test.
 * Child process separation is NOT an OS sandbox or permission restriction.
 */
import { runFirstPartyStagingSelftest } from './first-party-staging-mcp.mjs';

const modes=new Set(['normal','exit','hang','invalid-ipc',
  'witness','witness-hold','witness-forbidden','witness-bad-ipc']);
async function main(){
  const mode=process.argv[2];
  if(process.argv.length!==3 || !modes.has(mode) || !process.send)return 2;
  if(mode==='exit')return 2;
  if(mode==='hang'){setInterval(()=>{},1000);return 0;}
  // M4-B6-C test-only witness protocol: sends a private port/PID to a fixed
  // in-repository parent test harness. NEVER to CLI or public reports.
  if(mode.startsWith('witness')) {
    let result;
    try {
      result=await runFirstPartyStagingSelftest({
        fault:'allowed',
        onBound:({host,port,pid})=>new Promise((resolve,reject)=>{
          const onRelease=message=>{
            if(message && typeof message==='object' &&
               Object.keys(message).length===1 &&
               message.kind==='WITNESS_RELEASE')resolve();
            else reject(new TypeError('INVALID_WITNESS_RELEASE'));
          };
          process.once('message',onRelease);
          const bindMessage=mode==='witness-bad-ipc'
            ? {kind:'WITNESS_BOUND',host,pid,port,untrusted:'FICTIONAL_CANARY'}
            : {kind:'WITNESS_BOUND',host,pid,port};
          process.send(bindMessage,err=>{if(err){
            process.off('message',onRelease);
            reject(new Error('WITNESS_SEND_FAILED'));
          }});
        })
      });
    } catch {return 2;}
    // The witness parent observes the actual socket/process separately.
    const packet={kind:'STAGING_RESULT',status:result.status,
      checked:result.checked,received:result.received,
      accepted:result.accepted,externalTargetContacted:result.externalTargetContacted};
    return await new Promise(resolve=>process.send(packet,err=>{
      if(process.connected)process.disconnect();
      resolve(err?2:result.status==='PASS'?0:2);
    }));
  }
  let response;
  if(mode==='invalid-ipc'){
    response={kind:'STAGING_RESULT',status:'PASS',untrusted:'FICTIONAL_CANARY_DO_NOT_ECHO'};
  }else {
    let result;
    try{result=await runFirstPartyStagingSelftest();}
    catch{return 2;}
    response={kind:'STAGING_RESULT',status:result.status,checked:result.checked,
      received:result.received,accepted:result.accepted,
      externalTargetContacted:result.externalTargetContacted};
  }
  return await new Promise(resolve=>{
    process.send(response,err=>{
      if(process.connected)process.disconnect();
      resolve(err?2:mode==='normal'&&response.status==='PASS'?0:2);
    });
  });
}
try{process.exitCode=await main();}
catch{process.exitCode=2;}
