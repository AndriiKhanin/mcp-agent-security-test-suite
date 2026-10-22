import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runMockMcpScenario } from '../src/adapter-harness.mjs';
import { createMockMcpAdapter, SYNTHETIC_CANARY } from '../src/mock-mcp.mjs';
const root = new URL('../fixtures/',import.meta.url);
const denial = JSON.parse(readFileSync(new URL('scenario-denial.json',root),'utf8'));
const recovery = JSON.parse(readFileSync(new URL('scenario-recovery.json',root),'utf8'));
const policy = structuredClone(denial.policy);
const goodGrant = {owner:policy.owner,resource:policy.resource,scopes:[...policy.scopes],generation:policy.generation,
  notBefore:0,expiresAt:999,nonce:'synthetic-nonce-1'};
const action = (tool='write-note', expected={decision:'ALLOW',reason:'AUTHORIZED',effect:'WRITE'}) => ({
  tool,owner:policy.owner,resource:policy.resource,origin:'owner',grant:structuredClone(goodGrant),expected,
});
const scenario = (actions,expectedFinal) => ({version:1,id:'synthetic-probe',clock:100,policy:structuredClone(policy),actions,expectedFinal});
const check = (steps,opts) => runMockMcpScenario(scenario(steps),opts);
const has = (result,code) => result.failures.some(f=>f.rule===code);

test('fixtures: access-boundary mock verifies actual effects',async()=>{
  const r=await runMockMcpScenario(denial);
  assert.equal(r.status,'PASS');assert.deepEqual(r.observedFinal,{notes:1,reads:1,writes:1,calls:11});
});
test('fixtures: recovery and idempotency are observed, not self-reported',async()=>{
  const r=await runMockMcpScenario(recovery);
  assert.equal(r.status,'PASS'); assert.equal(r.observedFinal.writes,3);assert.equal(r.observedFinal.notes,1);
});
test('mock adapter uses MCP-shaped tools/call request and result',async()=>{
  const a=createMockMcpAdapter({policy,clock:100});
  const r=await a.callTool({method:'tools/call',params:{name:'write-note',arguments:action()}});
  assert.deepEqual(r,{isError:false,content:[{type:'text',text:'SYNTHETIC_OK'}]});
  assert.deepEqual(a.snapshot(),{notes:1,reads:0,writes:1,calls:1});
});
test('no host integration, adapter state separate per instance',async()=>{
  const a=createMockMcpAdapter({policy,clock:100});
  const b=createMockMcpAdapter({policy,clock:100});
  await a.callTool({method:'tools/call',params:{name:'write-note',arguments:action()}});
  assert.equal(b.snapshot().notes,0); assert.equal(a.snapshot().notes,1);
});
test('demonstrate caught deny bypass by corrupted mock adapter',async()=>{
  const r=await check([{...action(),owner:'other',expected:{decision:'DENY',reason:'OWNER_MISMATCH',effect:'NONE'}}],
      {defect:'execute-denied-write'});
  assert.equal(r.status,'FAIL'); assert.ok(has(r,'DENIED_TOOL_SIDE_EFFECT'));
});
test('demonstrate caught authorized write omission',async()=>{
  const r=await check([action()],{defect:'drop-authorized-write'});
  assert.equal(r.status,'FAIL');assert.ok(has(r,'ALLOWED_EFFECT_MISMATCH'));
});
test('demonstrate caught false success on policy denial',async()=>{
  const r=await check([{...action(),owner:'other',expected:{decision:'DENY',reason:'OWNER_MISMATCH',effect:'NONE'}}],
    {defect:'false-success-on-denial'});
  assert.equal(r.status,'FAIL');assert.ok(has(r,'DENIAL_REPORTED_AS_SUCCESS'));
});
test('demonstrate detection of known synthetic canary in tool result',async()=>{
  const r=await check([action()],{defect:'echo-synthetic-canary'});
  assert.equal(r.status,'FAIL');assert.ok(has(r,'SYNTHETIC_CANARY_LEAK'));
  assert.equal(JSON.stringify(r).includes(SYNTHETIC_CANARY),false);
});
test('default mock never leaks synthetic canary',async()=>{
  const r=await check([action()]);assert.equal(r.status,'PASS');
  assert.equal(JSON.stringify(r).includes(SYNTHETIC_CANARY),false);
});
test('denial observed as no mutation',async()=>{
  const r=await check([{...action(),origin:'untrusted',expected:{decision:'DENY',reason:'UNTRUSTED_ORIGIN',effect:'NONE'}}]);
  assert.equal(r.status,'PASS'); assert.equal(r.observedFinal.writes,0);
});
test('replayed nonce cannot add second note',async()=>{
  const r=await check([action(),action('write-note',{decision:'DENY',reason:'REPLAYED_NONCE',effect:'NONE'})]);
  assert.equal(r.status,'PASS');assert.equal(r.observedFinal.notes,1);
});
test('valid read increments reads without changing notes',async()=>{
  const r=await check([action('read-note',{decision:'ALLOW',reason:'AUTHORIZED',effect:'READ'})]);
  assert.equal(r.status,'PASS');assert.equal(r.observedFinal.reads,1);assert.equal(r.observedFinal.writes,0);
});
test('unapproved deletion does not touch note store',async()=>{
  const r=await check([{...action('delete-note',{decision:'DENY',reason:'APPROVAL_REQUIRED',effect:'NONE'}),approved:false}]);
  assert.equal(r.status,'PASS'); assert.equal(r.observedFinal.writes,0);
});
test('unknown tool never mutates or spawns anything',async()=>{
  const r=await check([action('execute-shell',{decision:'DENY',reason:'UNKNOWN_TOOL',effect:'NONE'})]);
  assert.equal(r.status,'PASS'); assert.equal(r.observedFinal.calls,1);assert.equal(r.observedFinal.writes,0);
});
test('prototype method name is not a tool',async()=>{
  const r=await check([action('constructor',{decision:'DENY',reason:'UNKNOWN_TOOL',effect:'NONE'})]);assert.equal(r.status,'PASS');
});
test('tricky host property name is not a tool',async()=>{
  const r=await check([action('toString',{decision:'DENY',reason:'UNKNOWN_TOOL',effect:'NONE'})]);assert.equal(r.status,'PASS');
});
test('request rejects invalid method before any call count',async()=>{
  const a=createMockMcpAdapter({policy,clock:100});
  await assert.rejects(a.callTool({method:'other',params:{name:'write-note',arguments:action()}}),/INVALID_MOCK_REQUEST/);
  assert.equal(a.snapshot().calls,0);
});
test('request rejects array arguments',async()=>{
  const a=createMockMcpAdapter({policy,clock:100});
  await assert.rejects(a.callTool({method:'tools/call',params:{name:'write-note',arguments:[]}}),/INVALID_MOCK_REQUEST/);
  assert.equal(a.snapshot().calls,0);
});
test('unknown fault configuration rejected',()=>assert.throws(()=>createMockMcpAdapter({policy,clock:100,defect:'network'}),/INVALID_MOCK_DEFECT/));
test('scenario with incorrect expected decision fails',async()=>{
  const r=await check([action('write-note',{decision:'DENY',reason:'AUTHORIZED',effect:'WRITE'})]);
  assert.equal(r.status,'FAIL');assert.ok(has(r,'SCENARIO_POLICY_MISMATCH'));
});
test('scenario with incorrect expected final state fails',async()=>{
  const r=await runMockMcpScenario(scenario([action()],{writes:0,allowed:1}));
  assert.equal(r.status,'FAIL');assert.ok(has(r,'FINAL_STATE_MISMATCH'));
});
test('known fault after-commit can return tool error despite state commit',async()=>{
  const r=await check([{...action(),fault:'after-commit',expected:{decision:'ALLOW',reason:'AUTHORIZED',effect:'WRITE',outcome:'UNKNOWN'}}]);
  assert.equal(r.status,'PASS');assert.equal(r.observedFinal.writes,1);assert.equal(r.steps[0].toolResultError,true);
});
test('denied tool call must return isError true',async()=>{
  const r=await check([{...action(),resource:'mcp://other',expected:{decision:'DENY',reason:'AUDIENCE_MISMATCH',effect:'NONE'}}]);
  assert.equal(r.status,'PASS');assert.equal(r.steps[0].toolResultError,true);
});
test('instrumented driver rejects fabricated write count',async()=>{
  const badFactory=()=>({snapshot:()=>({notes:0,reads:0,writes:0,calls:0}),callTool:async()=>({isError:false,content:[{type:'text',text:'SYNTHETIC_OK'}]})});
  const r=await check([action()],{adapterFactory:badFactory});
  assert.equal(r.status,'FAIL');assert.ok(has(r,'INVALID_TOOL_CALL_COUNT'));assert.ok(has(r,'ALLOWED_EFFECT_MISMATCH'));
});
test('instrumented driver throws safely and returns only errors',async()=>{
  const a={snapshot:()=>({notes:0,reads:0,writes:0,calls:0}),callTool:async()=>{throw Error('synthetic private value')}};
  const r=await check([action()],{adapterFactory:()=>a});
  assert.equal(r.status,'FAIL');assert.ok(has(r,'ADAPTER_THROW'));
  assert.equal(JSON.stringify(r).includes('synthetic private value'),false);
});
test('returned result with no valid shape is detected',async()=>{
  let calls=0;
  const a={snapshot:()=>({notes:0,reads:0,writes:0,calls}),callTool:async()=>{calls++;return{isError:'false',content:[]}}};
  const r=await check([action()],{adapterFactory:()=>a});
  assert.equal(r.status,'FAIL');assert.ok(has(r,'INVALID_TOOL_RESULT'));
});
test('zero actions are invalid plan',async()=>await assert.rejects(check([]),/INVALID_ACTION_COUNT/));
test('observed effect differs from adapter result status',async()=>{
  const r=await check([{...action(),owner:'other',expected:{decision:'DENY',reason:'OWNER_MISMATCH',effect:'NONE'}}],
  {defect:'execute-denied-write'});
  assert.equal(r.steps[0].toolResultError,true);
  assert.equal(r.steps[0].observedEffect,'WRITE');
});
test('observer catches mutation when tool returns denial result',async()=>{
  const bogus={snapshot(){return {...this.state}},state:{notes:0,reads:0,writes:0,calls:0},
    async callTool(){this.state.notes++;this.state.writes++;this.state.calls++;return {isError:true,content:[{type:'text',text:'SYNTHETIC_DENIED'}]}}};
  const r=await check([{...action(),origin:'untrusted',expected:{decision:'DENY',reason:'UNTRUSTED_ORIGIN',effect:'NONE'}}],
    {adapterFactory:()=>bogus});
  assert.equal(r.status,'FAIL');assert.ok(has(r,'DENIED_TOOL_SIDE_EFFECT'));
});
test('oversized mock result is rejected',async()=>{
  const a={state:{notes:0,reads:0,writes:0,calls:0},snapshot(){return {...this.state}},async callTool(){
    this.state.calls++;this.state.notes++;this.state.writes++;return {isError:false,content:[{type:'text',text:'X'.repeat(300)}]};}};
  const r=await check([action()],{adapterFactory:()=>a});
  assert.equal(r.status,'FAIL');assert.ok(has(r,'INVALID_TOOL_RESULT'));
});
test('misreported negative write counter fails closed',async()=>{
  const a={count:0,snapshot(){return {notes:0,reads:0,writes:5-this.count,calls:this.count}},async callTool(){this.count++;return {isError:true,content:[{type:'text',text:'SYNTHETIC_DENIED'}]}}};
  const r=await check([{...action(),origin:'untrusted',expected:{decision:'DENY',reason:'UNTRUSTED_ORIGIN',effect:'NONE'}}],{adapterFactory:()=>a});
  assert.equal(r.status,'FAIL');assert.ok(has(r,'NON_MONOTONIC_COUNTER'));
});
test('unknown adapter configuration is not silently ignored',async()=>{
  await assert.rejects(check([action()],{defect:'shell'}),/INVALID_MOCK_DEFECT/);
});

test('detects mixed read/write effects even if write appears authorized',async()=>{
 const a={state:{notes:0,reads:0,writes:0,calls:0},snapshot(){return {...this.state}},async callTool(){
  this.state.notes++;this.state.reads++;this.state.writes++;this.state.calls++;
  return {isError:false,content:[{type:'text',text:'SYNTHETIC_OK'}]};}};
 const r=await check([action()],{adapterFactory:()=>a});
 assert.equal(r.status,'FAIL');assert.ok(has(r,'MIXED_SIDE_EFFECTS'));
});
test('detects fake write counter without note mutation',async()=>{
 const a={state:{notes:0,reads:0,writes:0,calls:0},snapshot(){return {...this.state}},async callTool(){
  this.state.writes++;this.state.calls++;
  return {isError:false,content:[{type:'text',text:'SYNTHETIC_OK'}]};}};
 const r=await check([action()],{adapterFactory:()=>a});
 assert.equal(r.status,'FAIL');assert.ok(has(r,'WRITE_STATE_COUNTER_MISMATCH'));
});
