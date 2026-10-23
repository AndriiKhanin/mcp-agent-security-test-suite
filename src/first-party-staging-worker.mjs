/**
 * Fixed, trusted M4-B6-B subprocess. Never accepts user URLs, methods,
 * credentials, source paths or instructions. Only first-party localhost test.
 * Child process separation is NOT an OS sandbox or permission restriction.
 */
import { runFirstPartyStagingSelftest } from './first-party-staging-mcp.mjs';

const modes=new Set(['normal','exit','hang','invalid-ipc']);
async function main(){
  const mode=process.argv[2];
  if(process.argv.length!==3 || !modes.has(mode) || !process.send)return 2;
  if(mode==='exit')return 2;
  if(mode==='hang'){setInterval(()=>{},1000);return 0;}
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
