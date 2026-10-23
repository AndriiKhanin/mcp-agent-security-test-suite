/**
 * Fixed repository-owned, local stdio JSONL test double (NOT a general MCP
 * server, network adapter, untrusted-code sandbox or production authorization).
 * Only four exact fictional requests are recognized. No shell or network I/O.
 */
import { isDeepStrictEqual } from 'node:util';
import { parseStrictJson } from './strict-json.mjs';

const LIMIT_IN = 8192;
const VERSION='2025-06-18';
const has = (v,k)=>v!==null&&typeof v==='object'&&Object.hasOwn(v,k);
const descriptor = {name:'read-note',description:'Fixed fictional note reader',
  inputSchema:{type:'object',properties:{noteId:{type:'string'}},
    required:['noteId'],additionalProperties:false}};
const expected = [
  {jsonrpc:'2.0',id:1,method:'initialize',params:{
    protocolVersion:VERSION,capabilities:{},clientInfo:{name:'fictional-client',version:'1'}}},
  {jsonrpc:'2.0',id:2,method:'tools/list',params:{}},
  {jsonrpc:'2.0',id:3,method:'tools/call',params:{
    name:'read-note',arguments:{noteId:'fictional-1'}}},
  {jsonrpc:'2.0',id:4,method:'tools/call',params:{
    name:'write-note',arguments:{noteId:'fictional-1',value:'fictional'}}}
];
const reply = [
  {jsonrpc:'2.0',id:1,result:{protocolVersion:VERSION,capabilities:{tools:{}},
    serverInfo:{name:'fictional-stdio-mock',version:'1'}}},
  {jsonrpc:'2.0',id:2,result:{tools:[descriptor]}},
  {jsonrpc:'2.0',id:3,result:{content:[{type:'text',text:'FICTIONAL_NOTE'}],isError:false}},
  {jsonrpc:'2.0',id:4,error:{code:-32001,message:'SYNTHETIC_WRITE_DENIED'}}
];

async function main() {
  const fault = process.argv[2] ?? 'none';
  const faults=new Set(['none','wrong-id','invalid-json','extra-line','missing-line',
    'oversized-output','changed-result','hang','stderr-canary','env-probe']);
  if(process.argv.length!==3 || !faults.has(fault)) return 2;
  const decoder = new TextDecoder('utf-8',{fatal:true});
  let bytes=0,source='';
  for await(const chunk of process.stdin) {
    bytes+=chunk.byteLength;
    if(bytes>LIMIT_IN) return 2;
    source+=decoder.decode(chunk,{stream:true});
  }
  source+=decoder.decode();
  if(!source.endsWith('\n')) return 2;
  const lines=source.slice(0,-1).split('\n');
  if(lines.length!==4 || lines.some(line=>Buffer.byteLength(line)>4096)) return 2;
  for(let i=0;i<4;i++) {
    const data=parseStrictJson(lines[i]);
    if(!isDeepStrictEqual(data,expected[i])) return 2;
  }
  const responses=structuredClone(reply);
  if(fault==='wrong-id') responses[1].id=999;
  if(fault==='changed-result') responses[2].result.content[0].text='FICTIONAL_CANARY_DO_NOT_ECHO';
  if(fault==='env-probe' && has(process.env,'SYNTHETIC_PARENT_CREDENTIAL'))
    responses[2].result.content[0].text='INHERITED_CREDENTIAL_DO_NOT_ECHO';
  let output=responses.map(x=>JSON.stringify(x));
  if(fault==='invalid-json') output[1]='{"jsonrpc":';
  if(fault==='missing-line') output.pop();
  if(fault==='extra-line') output.push(JSON.stringify(responses[3]));
  if(fault==='oversized-output') output[2]=JSON.stringify({jsonrpc:'2.0',id:3,
    result:{content:[{type:'text',text:'F'.repeat(131072)}]}});
  if(fault==='stderr-canary') process.stderr.write('FICTIONAL_STDERR_CANARY_DO_NOT_ECHO\n');
  process.stdout.write(output.join('\n')+'\n');
  if(fault==='hang') setInterval(()=>{},1000);
  return 0;
}
try {
  process.exitCode = await main();
} catch {
  process.exitCode = 2; // Intentionally never echo parser input or exception.
}
