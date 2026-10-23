/**
 * Synchronous, bounded batch exchange with a FIXED first-party stdio mock.
 * Not an arbitrary MCP launcher or network scanner; the OS process is NOT
 * sandboxed. Only fixed fictional data is sent to the dedicated child.
 */
import { spawnSync } from 'node:child_process';
import { isDeepStrictEqual } from 'node:util';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { parseStrictJson } from './strict-json.mjs';

const WORKER = fileURLToPath(new URL('./stdio-mcp-mock-worker.mjs',import.meta.url));
const WORKDIR = dirname(WORKER);
const MAX_BYTES=32768;
const MAX_FRAME=8192;
const FIXED_VERSION='2025-06-18';
const FAULTS = new Set(['none','wrong-id','invalid-json','extra-line','missing-line',
  'oversized-output','changed-result','hang','stderr-canary','env-probe']);
const descriptor={name:'read-note',description:'Fixed fictional note reader',
  inputSchema:{type:'object',properties:{noteId:{type:'string'}},
    required:['noteId'],additionalProperties:false}};
const requests=[
  {jsonrpc:'2.0',id:1,method:'initialize',params:{protocolVersion:FIXED_VERSION,
    capabilities:{},clientInfo:{name:'fictional-client',version:'1'}}},
  {jsonrpc:'2.0',id:2,method:'tools/list',params:{}},
  {jsonrpc:'2.0',id:3,method:'tools/call',params:{
    name:'read-note',arguments:{noteId:'fictional-1'}}},
  {jsonrpc:'2.0',id:4,method:'tools/call',params:{
    name:'write-note',arguments:{noteId:'fictional-1',value:'fictional'}}}
];
const expected=[
  {jsonrpc:'2.0',id:1,result:{protocolVersion:FIXED_VERSION,
    capabilities:{tools:{}},serverInfo:{name:'fictional-stdio-mock',version:'1'}}},
  {jsonrpc:'2.0',id:2,result:{tools:[descriptor]}},
  {jsonrpc:'2.0',id:3,result:{content:[{type:'text',text:'FICTIONAL_NOTE'}],isError:false}},
  {jsonrpc:'2.0',id:4,error:{code:-32001,message:'SYNTHETIC_WRITE_DENIED'}}
];
const input=requests.map(r=>JSON.stringify(r)).join('\n')+'\n';
if(Buffer.byteLength(input)>8192) throw new Error('INVALID_FIXED_STDIO_REQUESTS');

export function runLocalStdioMock({fault='none',timeoutMs=8000}={}) {
  if(!FAULTS.has(fault)) throw new TypeError('INVALID_SYNTHETIC_STDIO_FAULT');
  if(!Number.isSafeInteger(timeoutMs)||timeoutMs<250||timeoutMs>8000)
    throw new TypeError('INVALID_SYNTHETIC_STDIO_TIMEOUT');
  const findings=[];
  const flag=(step,rule)=>{if(findings.length<16)findings.push({step,rule});};
  const finish=received=>({status:findings.length===0?'PASS':'FAIL',
    profile:'fixed-local-stdio-mock-v1',transport:'FIXED_LOCAL_JSONRPC_STDIO',
    checked:4,received, failureCount:findings.length,
    findingsTruncated:false,findings});
  // No shell, no PATH lookup, no user executable or arguments, no inherited
  // credentials, no stdout/stderr passthrough, fixed cwd and bounded resources.
  const run=spawnSync(process.execPath,[WORKER,fault],{
    shell:false,windowsHide:true,cwd:WORKDIR,
    env:{NODE_NO_WARNINGS:'1'},input:Buffer.from(input,'utf8'),
    encoding:'buffer',timeout:timeoutMs,maxBuffer:MAX_BYTES,killSignal:'SIGTERM'
  });
  if(run.error) {
    const code=run.error.code;
    flag(0,code==='ETIMEDOUT'?'STDIO_WORKER_TIMEOUT':
      code==='ENOBUFS'?'STDIO_OUTPUT_LIMIT':'STDIO_WORKER_LAUNCH_FAILED');
    return finish(0);
  }
  if(run.status!==0||run.signal) flag(0,'STDIO_WORKER_FAILED');
  if(run.stderr?.length) flag(0,'STDIO_UNEXPECTED_STDERR');
  const stdout=run.stdout;
  if(!Buffer.isBuffer(stdout)||stdout.length>MAX_BYTES){
    flag(0,'STDIO_OUTPUT_LIMIT');return finish(0);
  }
  let source;
  try {source=new TextDecoder('utf-8',{fatal:true}).decode(stdout);}
  catch {flag(0,'STDIO_INVALID_UTF8');return finish(0);}
  if(!source.endsWith('\n')){
    flag(0,'STDIO_INVALID_FRAMING');return finish(0);
  }
  const lines=source.slice(0,-1).split('\n');
  if(lines.length!==4) flag(0,'STDIO_RESPONSE_COUNT_MISMATCH');
  for(let i=0;i<Math.min(lines.length,4);i++){
    const step=i+1;
    if(Buffer.byteLength(lines[i])>MAX_FRAME){
      flag(step,'STDIO_FRAME_TOO_LARGE');continue;
    }
    let msg;
    try{msg=parseStrictJson(lines[i]);}
    catch{flag(step,'STDIO_INVALID_JSON_RESPONSE');continue;}
    if(!msg||typeof msg!=='object'||Array.isArray(msg)||
      msg.jsonrpc!=='2.0'||msg.id!==expected[i].id){
      flag(step,'STDIO_RESPONSE_ID_OR_ENVELOPE_MISMATCH');continue;
    }
    if(!isDeepStrictEqual(msg,expected[i]))
      flag(step,'STDIO_RESPONSE_CONTENT_MISMATCH');
  }
  return finish(lines.length);
}
/** Strictly bounded fixture: no user-selected executable, transport, or target. */
export function runStdioMockScenario(value) {
  if(!value||typeof value!=='object'||Array.isArray(value)||
     Object.keys(value).some(k=>!['profile','fault'].includes(k))||
     value.profile!=='fixed-local-stdio-mock-v1'||!FAULTS.has(value.fault))
    throw new TypeError('INVALID_STDIO_MOCK_FIXTURE');
  return runLocalStdioMock({fault:value.fault});
}
