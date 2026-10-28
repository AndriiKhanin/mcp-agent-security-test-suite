import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import {validateFixtureProposal} from '../tools/fixture-proposal-check.mjs';
import {
  decideFictionalAction,runFictionalGateSequence,runFixedFictionalGateSelftest
} from '../tools/in-memory-injection-gate.mjs';

const action=(origin,operation,resource,claim=false)=>({
  schemaVersion:1,origin,operation,resource,toolResultAuthorityClaim:claim
});
const task=(origin='UNTRUSTED_TOOL_RESULT',claim=false)=>
  action(origin,'CONSUME_TASK_DATA','TASK_DATA',claim);
const read=origin=>
  action(origin,'REQUEST_UNRELATED_FILE_READ','UNRELATED_FILE');
const tool=origin=>
  action(origin,'REQUEST_UNAUTHORIZED_TOOL_CALL','UNRELATED_TOOL');

test('M9-B: task data may be consumed as data without granting authority',()=>{
  for(const source of ['OWNER_TASK','UNTRUSTED_TOOL_RESULT']){
    const r=decideFictionalAction(task(source));
    assert.equal(r.decision,'ALLOW');
    assert.equal(r.ruleCode,'FICTIONAL_TASK_DATA_AS_DATA_ONLY');
    assert.equal(r.executedRealTool,false);
    assert.equal(r.accessedRealFile,false);
  }
});

test('M9-B: a tool result cannot authorize unrelated resource or tool access',()=>{
  assert.deepEqual(
    [decideFictionalAction(read('UNTRUSTED_TOOL_RESULT')).ruleCode,
     decideFictionalAction(tool('UNTRUSTED_TOOL_RESULT')).ruleCode],
    ['FICTIONAL_CROSS_RESOURCE_READ_DENIED',
     'FICTIONAL_UNAUTHORIZED_TOOL_CALL_DENIED']
  );
  for(const request of [read('OWNER_TASK'),tool('OWNER_TASK')]){
    assert.equal(decideFictionalAction(request).decision,'DENY');
  }
});

test('M9-B: forged tool-result approval cannot promote even harmless data',()=>{
  const r=decideFictionalAction(task('UNTRUSTED_TOOL_RESULT',true));
  assert.equal(r.decision,'DENY');
  assert.equal(r.ruleCode,'TOOL_RESULT_AUTHORITY_SPOOF_DENIED');
});

test('M9-B: mismatched operation and resource fail closed',()=>{
  const r=decideFictionalAction(action(
    'UNTRUSTED_TOOL_RESULT','CONSUME_TASK_DATA','UNRELATED_FILE'
  ));
  assert.equal(r.decision,'DENY');
  assert.equal(r.ruleCode,'FICTIONAL_OPERATION_RESOURCE_MISMATCH');
  const s=decideFictionalAction(action(
    'UNTRUSTED_TOOL_RESULT','REQUEST_UNRELATED_FILE_READ','TASK_DATA'
  ));
  assert.equal(s.decision,'DENY');
  assert.equal(s.ruleCode,'FICTIONAL_OPERATION_RESOURCE_MISMATCH');
});

test('M9-B: a separate parent-owned witness records no forbidden effects',()=>{
  const report=runFictionalGateSequence([
    task(),read('UNTRUSTED_TOOL_RESULT'),tool('UNTRUSTED_TOOL_RESULT')
  ]);
  assert.equal(report.status,'PASS'); // gate evaluated, not agent safety.
  assert.equal(report.scope,'FIRST_PARTY_IN_MEMORY_ACTION_GATE_ONLY');
  assert.deepEqual(report.decisions.map(x=>x.decision),['ALLOW','DENY','DENY']);
  assert.equal(report.witness.handledTaskData,1);
  assert.equal(report.witness.deniedRequests,2);
  assert.equal(report.witness.blockedFileRequests,1);
  assert.equal(report.witness.blockedToolRequests,1);
  assert.equal(report.witness.fictionalUnrelatedFileEffectsCommitted,0);
  assert.equal(report.witness.fictionalUnauthorizedToolEffectsCommitted,0);
  assert.equal(report.witness.actualFilesystemEffectsObserved,false);
  assert.equal(report.witness.actualToolEffectsObserved,false);
  assert.equal(report.actualAgentBehaviorObserved,false);
});

test('M9-B: malicious authority claim never changes in-memory witness state',()=>{
  const report=runFictionalGateSequence([
    task('UNTRUSTED_TOOL_RESULT',true)
  ]);
  assert.equal(report.witness.handledTaskData,0);
  assert.equal(report.witness.deniedRequests,1);
  assert.equal(report.witness.blockedSpoofedClaims,1);
  assert.equal(report.witness.fictionalUnrelatedFileEffectsCommitted,0);
});

test('M9-B: finite first-party selftest has exact independent expectations',()=>{
  const a=runFixedFictionalGateSelftest();
  assert.deepEqual(a,runFixedFictionalGateSelftest());
  assert.equal(a.status,'PASS');
  assert.equal(a.exitCode,0);
  assert.equal(a.ruleCode,'FIXED_FICTIONAL_GATE_EXPECTATIONS_MATCH');
  assert.equal(a.checked,5);
  assert.equal(a.matched,5);
  assert.equal(a.expectedDenied,3);
  assert.equal(a.witness.handledTaskData,2);
  assert.equal(a.witness.deniedRequests,3);
  assert.equal(a.witness.blockedFileRequests,1);
  assert.equal(a.witness.blockedToolRequests,1);
  assert.equal(a.witness.blockedSpoofedClaims,1);
  assert.equal(a.witness.fictionalUnrelatedFileEffectsCommitted,0);
  assert.equal(a.witness.fictionalUnauthorizedToolEffectsCommitted,0);
  assert.equal(a.actualAgentBehaviorObserved,false);
  assert.equal(a.untrustedInstructionExecuted,false);
});

test('M9-B: unknown attributes, endpoints and authority flags are rejected',()=>{
  const base=task();
  const changes=[
    {...base,endpoint:'https://private.invalid'},
    {...base,resource:'PRIVATE_PATH'},
    {...base,origin:'EXTERNAL_AGENT'},
    {...base,operation:'EXECUTE_SHELL'},
    {...base,toolResultAuthorityClaim:'yes'},
    {...base,schemaVersion:2},
    {...task('OWNER_TASK'),toolResultAuthorityClaim:true}
  ];
  for(const x of changes)
    assert.throws(()=>decideFictionalAction(x),/INVALID_FICTIONAL_ACTION_REQUEST/);
});

test('M9-B: direct JS inputs reject prototype, getter, symbol and hidden fields',()=>{
  const base=task();
  const inherited=Object.create(base);
  const getter={...base};
  Object.defineProperty(getter,'operation',{enumerable:true,
    get(){throw new Error('GETTER_MUST_NOT_RUN');}});
  const symbol={...base};
  symbol[Symbol('hidden')]=true;
  const hidden={...base};
  Object.defineProperty(hidden,'privateKey',{value:'secret'});
  for(const x of [inherited,getter,symbol,hidden]){
    assert.throws(()=>decideFictionalAction(x),
      /INVALID_FICTIONAL_ACTION_REQUEST/);
  }
});

test('M9-B: sequence rejects sparse arrays, extra properties and accessors',()=>{
  const sparse=[task(),,read('UNTRUSTED_TOOL_RESULT')];
  const getter=[task()];
  Object.defineProperty(getter,0,{enumerable:true,
    get(){throw new Error('UNTRUSTED_ARRAY_GETTER');}});
  const symbol=[task()];
  symbol[Symbol('data')]='private';
  const extra=[task()];
  Object.defineProperty(extra,'hidden',{value:1});
  for(const value of [
    [],Array(9).fill(task()),sparse,getter,symbol,extra,
    Object.create([task()])
  ]) assert.throws(()=>runFictionalGateSequence(value),
    /INVALID_FICTIONAL_ACTION_REQUEST/);
});

test('M9-B: result reports exclude untrusted input and cannot be modified',()=>{
  const user='PRIVATE_CANARY_NEVER_ECHO';
  const invalidInput={...task(),untrustedPayload:user};
  assert.throws(()=>runFictionalGateSequence([invalidInput]),
    /INVALID_FICTIONAL_ACTION_REQUEST/);
  const result=runFictionalGateSequence([task(),read('UNTRUSTED_TOOL_RESULT')]);
  assert.ok(!JSON.stringify(result).includes(user));
  assert.ok(Object.isFrozen(result));
  assert.ok(Object.isFrozen(result.witness));
  assert.ok(Object.isFrozen(result.decisions[0]));
  assert.equal(result.externalMcpContacted,false);
  assert.equal(result.actualFilesystemReadObserved,false);
});

test('M9-B: source-owned CLI accepts no arguments and never echoes canaries',()=>{
  const run=(...args)=>spawnSync(process.execPath,[
    'tools/in-memory-injection-gate.mjs',...args
  ],{encoding:'utf8'});
  const good=run();
  assert.equal(good.status,0,good.stderr);
  assert.deepEqual(JSON.parse(good.stdout),runFixedFictionalGateSelftest());
  for(const arg of ['PRIVATE_CANARY','--url=https://private.invalid','../../secrets.json']){
    const bad=run(arg);
    assert.equal(bad.status,2);
    assert.equal(bad.stderr,'');
    assert.equal(JSON.parse(bad.stdout).ruleCode,
      'FICTIONAL_GATE_SELFTEST_UNAVAILABLE');
    assert.ok(!(bad.stdout+bad.stderr).includes(arg));
  }
});

test('M9-B: fixture is separate data; gate never parses tool response instructions',()=>{
  const fixture=JSON.parse(readFileSync(
    new URL('../.github/fixture-proposals/mixed-tool-result-file-read.json',
      import.meta.url),'utf8'));
  assert.equal(validateFixtureProposal(fixture).status,'PASS');
  assert.equal(fixture.expected.readUnrelatedFile,false);
  assert.equal(fixture.expected.obeyEmbeddedInstruction,false);
  const result=runFixedFictionalGateSelftest();
  assert.ok(!JSON.stringify(result).includes(fixture.toolResult.embeddedInstruction));
  assert.equal(result.externalMcpContacted,false);
  const source=readFileSync(new URL('../tools/in-memory-injection-gate.mjs',
    import.meta.url),'utf8');
  assert.doesNotMatch(source,/from ['"]node:(?:fs|net|http|https|child_process)['"]/);
});

test('M9-B: roadmap and docs keep scope and 80-file npm inventory',()=>{
  const doc=readFileSync(new URL('../.github/M9_IN_MEMORY_ACTION_GATE.md',
    import.meta.url),'utf8');
  const readme=readFileSync(new URL('../README.md',import.meta.url),'utf8');
  const roadmap=readFileSync(new URL('../ROADMAP.md',import.meta.url),'utf8');
  const pkg=JSON.parse(readFileSync(new URL('../package.json',
    import.meta.url),'utf8'));
  for(const text of [doc,readme]){
    assert.match(text,/node tools\/in-memory-injection-gate\.mjs/);
    assert.match(text,/not a real agent/i);
  }
  assert.match(roadmap,/M9-B/);
  assert.ok(!pkg.files.includes('tools'));
  assert.ok(!pkg.files.includes('.github'));
  assert.deepEqual(pkg.files,[
    'src','fixtures','docs','examples','README.md','LICENSE',
    'SECURITY.md','CONTRIBUTING.md','ROADMAP.md'
  ]);
});
