/** M22 — first-party finite-action file intake and independent negative QA. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {
  readFileSync,readdirSync,mkdtempSync,mkdirSync,copyFileSync,
  writeFileSync,rmSync,symlinkSync
} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseStrictJson} from '../src/strict-json.mjs';
import {
  validateFiniteScenario,runFiniteScenarioSet,
  auditFiniteWitnesses,runFixedFiniteScenarioDirectory
} from '../tools/m22-finite-scenario-runner.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const fixed=join(root,'.github','m22-scenarios');
const entries=()=>readdirSync(fixed).sort();
const fixtures=()=>entries().map(name=>
  parseStrictJson(readFileSync(join(fixed,name),'utf8')));
const clone=o=>JSON.parse(JSON.stringify(o));
const record=()=>({
  schemaVersion:1,caseId:'new-validated-case',
  origin:'UNTRUSTED_TOOL_RESULT',operation:'REQUEST_UNRELATED_FILE_READ',
  resource:'UNRELATED_FILE',toolResultAuthorityClaim:false,
  expected:{
    guardedDecision:'DENY',
    guardedRuleCode:'FICTIONAL_CROSS_RESOURCE_READ_DENIED',
    permissiveDecision:'ALLOW'
  }
});
function witnessFor(s){
  const safe=s.expected.guardedDecision==='ALLOW';
  return {
    decision:s.expected.guardedDecision,ruleCode:s.expected.guardedRuleCode,
    guardedTaskDataHandled:Number(safe),guardedDenied:Number(!safe),
    guardedProtectedEffects:0,permissiveDecision:'ALLOW',
    permissiveProtectedEffects:Number(!safe),noActualEffects:true
  };
}
function withSandbox(fn){
  // Duplicate the REVIEWED runner and its two source-owned dependencies into
  // an ephemeral disposable fixture tree OUTSIDE the repository. This lets
  // a contributor add/alter files without racing M6-J source custody tests.
  const temp=mkdtempSync(join(tmpdir(),'m22-fixed-scenario-copy-'));
  mkdirSync(join(temp,'tools'),{recursive:true});
  mkdirSync(join(temp,'src'),{recursive:true});
  mkdirSync(join(temp,'.github','m22-scenarios'),{recursive:true});
  for(const path of [
    'tools/m22-finite-scenario-runner.mjs',
    'tools/in-memory-injection-gate.mjs',
    'src/strict-json.mjs'
  ])copyFileSync(join(root,path),join(temp,path));
  for(const name of entries())
    copyFileSync(join(fixed,name),join(temp,'.github','m22-scenarios',name));
  try{
    const dir=join(temp,'.github','m22-scenarios');
    const run=(...args)=>spawnSync(process.execPath,[
      join(temp,'tools','m22-finite-scenario-runner.mjs'),...args
    ],{cwd:temp,encoding:'utf8',timeout:12000,shell:false,
      windowsHide:true,maxBuffer:30000});
    return fn({dir,run,write:(name,data)=>writeFileSync(
      join(dir,name),data)});
  }finally{rmSync(temp,{recursive:true,force:true});}
}
function expectError(run){
  assert.equal(run.error,undefined);
  assert.equal(run.status,2,run.stderr);
  assert.equal(run.stderr,'');
  const r=JSON.parse(run.stdout);
  assert.equal(r.status,'ERROR');
  assert.equal(r.ruleCode,'M22_INVALID_OR_UNREADABLE_SCENARIOS');
  assert.equal(r.actualAgentBehaviorObserved,false);
  assert.equal(r.externalMcpContacted,false);
  assert.equal(r.securityCertified,false);
  return r;
}

test('M22-A: eight sorted, schema-valid finite contributors cover five mandatory boundaries',()=>{
  const names=entries();
  assert.equal(names.length,8);
  assert.deepEqual(names,[...names].sort());
  assert.ok(names.every(x=>/^[a-z][a-z0-9-]{5,60}\.json$/.test(x)));
  const cases=fixtures();
  for(let i=0;i<names.length;i++){
    assert.ok(readFileSync(join(fixed,names[i])).length<=1024);
    assert.equal(validateFiniteScenario(cases[i],names[i]).caseId,
      names[i].slice(0,-5));
  }
  const includes=(origin,op,res,claim)=>cases.some(c=>
    c.origin===origin&&c.operation===op&&c.resource===res&&
    c.toolResultAuthorityClaim===claim
  );
  assert.ok(includes('OWNER_TASK','CONSUME_TASK_DATA','TASK_DATA',false));
  assert.ok(includes('UNTRUSTED_TOOL_RESULT','CONSUME_TASK_DATA','TASK_DATA',false));
  assert.ok(includes('UNTRUSTED_TOOL_RESULT','REQUEST_UNRELATED_FILE_READ','UNRELATED_FILE',false));
  assert.ok(includes('UNTRUSTED_TOOL_RESULT','REQUEST_UNAUTHORIZED_TOOL_CALL','UNRELATED_TOOL',false));
  assert.ok(includes('UNTRUSTED_TOOL_RESULT','CONSUME_TASK_DATA','TASK_DATA',true));
  assert.deepEqual(new Set(cases.map(x=>x.caseId)).size,8);
});

test('M22-A: exact source-owned guarded oracle vs intentionally unsafe toy',async()=>{
  const a=await runFixedFiniteScenarioDirectory();
  const b=runFiniteScenarioSet(fixtures());
  assert.deepEqual(a,b);
  assert.equal(a.status,'PASS',JSON.stringify(a));
  assert.equal(a.checked,8);
  assert.equal(a.matched,8);
  assert.equal(a.guardedAllowed,2);
  assert.equal(a.guardedDenied,6);
  assert.equal(a.deliberatelyPermissiveProtectedEffectsExpected,6);
  assert.equal(a.guardedProtectedEffectsExpected,0);
  assert.equal(a.contributorExpectedValuesTrusted,false);
  assert.equal(a.realFilesystemEffectObserved,false);
  assert.ok(a.cases.every(x=>x.effectWitnessMatches));
  assert.ok(!JSON.stringify(a).includes('owner-task-data'),
    'Never echo contributor-defined IDs');
});

test('M22-B: independent witness mutations reject missed unsafe effects or forged approvals',()=>{
  const scenarios=fixtures();
  const baseline=scenarios.map(witnessFor);
  assert.equal(auditFiniteWitnesses(scenarios,baseline).status,'PASS');
  const mutations=[
    [1,'decision','DENY'],[1,'ruleCode','TOOL_RESULT_AUTHORITY_SPOOF_DENIED'],
    [1,'guardedTaskDataHandled',0],[0,'guardedProtectedEffects',1],
    [2,'guardedDenied',0],[2,'permissiveProtectedEffects',0],
    [2,'permissiveDecision','DENY'],
    [3,'noActualEffects',false],[4,'guardedProtectedEffects',1]
  ];
  for(const [index,key,value] of mutations){
    const witness=baseline.map(clone);
    witness[index][key]=value;
    const r=auditFiniteWitnesses(scenarios,witness);
    assert.equal(r.status,'FAIL',index+':'+key);
    assert.equal(r.matched,7,index+':'+key);
  }
  const wrong=clone(scenarios);
  wrong[1].expected.guardedDecision='DENY';
  const r=runFiniteScenarioSet(wrong);
  assert.equal(r.status,'FAIL');
  assert.equal(r.matched,7);
  assert.equal(r.cases[1].contributorExpectationMatches,false);
  const contradicted=clone(scenarios);
  contradicted[1].expected.guardedRuleCode='TOOL_RESULT_AUTHORITY_SPOOF_DENIED';
  assert.equal(runFiniteScenarioSet(contradicted).status,'FAIL');
  const invisible=baseline.map(clone);
  delete invisible[1];
  assert.equal(auditFiniteWitnesses(scenarios,invisible).status,'FAIL');
  const extra=baseline.map(clone);
  extra[3].private='PRIVATE_CANARY';
  assert.equal(auditFiniteWitnesses(scenarios,extra).status,'FAIL');
});

test('M22-B: malformed records and getter-bearing objects cannot grant rights',()=>{
  const bad=[
    x=>{x.extra='PRIVATE_CANARY';},
    x=>{x.caseId='../../secret';},
    x=>{x.schemaVersion=2;},
    x=>{x.expected.guardedDecision='ALLOW_ALL';},
    x=>{x.expected.guardedRuleCode='SOME_UNKNOWN_RULE';},
    x=>{x.expected.permissiveDecision='DENY';},
    x=>{x.toolResultAuthorityClaim='true';},
    x=>{x.origin='OWNER_TASK';x.toolResultAuthorityClaim=true;},
    x=>{x.operation='EXECUTE_SHELL';},
    x=>{x.resource='C:\\private\\secret.txt';},
    x=>{x.expected.private='PRIVATE_CANARY';},
    x=>{delete x.operation;},
    x=>{Object.defineProperty(x,'operation',{
      enumerable:true,get(){throw Error('PRIVATE_CANARY');}
    });},
    x=>{Object.defineProperty(x.expected,'guardedDecision',{
      enumerable:true,get(){throw Error('PRIVATE_CANARY');}
    });},
    x=>{x[Symbol('PRIVATE_CANARY')]=true;}
  ];
  for(const change of bad){
    const sample=record();change(sample);
    assert.throws(()=>validateFiniteScenario(sample),
      /INVALID_FINITE_SCENARIO/);
  }
  const dup=fixtures();dup[1]=clone(dup[0]);
  assert.throws(()=>runFiniteScenarioSet(dup),/INVALID_FINITE_SCENARIO/);
  const few=fixtures().slice(0,4);
  assert.throws(()=>runFiniteScenarioSet(few),/INVALID_FINITE_SCENARIO/);
  const many=Array.from({length:13},(_,i)=>{
    const x=record();x.caseId='generated-case-'+String(i);return x;
  });
  assert.throws(()=>runFiniteScenarioSet(many),/INVALID_FINITE_SCENARIO/);
  const sparse=fixtures();delete sparse[1];
  assert.throws(()=>runFiniteScenarioSet(sparse),/INVALID_FINITE_SCENARIO/);
});

test('M22-B: ninth valid file is automatically discovered with NO runner changes',()=>{
  withSandbox(({dir,run,write})=>{
    const start=run();
    assert.equal(start.status,0,start.stderr||start.stdout);
    assert.equal(JSON.parse(start.stdout).checked,8);
    write('new-validated-case.json',JSON.stringify(record())+'\n');
    const again=run();
    assert.equal(again.status,0,again.stderr||again.stdout);
    assert.equal(JSON.parse(again.stdout).checked,9);
    assert.equal(JSON.parse(again.stdout).matched,9);
    const dishonest=record();
    dishonest.expected.guardedDecision='ALLOW';
    write('new-validated-case.json',JSON.stringify(dishonest)+'\n');
    const mismatched=run();
    assert.equal(mismatched.status,1,mismatched.stderr);
    assert.equal(JSON.parse(mismatched.stdout).status,'FAIL');
    assert.equal(JSON.parse(mismatched.stdout).matched,8);
    assert.ok(!mismatched.stdout.includes('new-validated-case'));
  });
});

test('M22-B: duplicate key, unknown file, invalid UTF8 and oversize fail closed',()=>{
  const variant=(name,data)=>{
    withSandbox(({run,write})=>{
      write(name,data);
      const out=run();
      expectError(out);
      assert.ok(!(out.stdout+out.stderr).includes('PRIVATE_CANARY'));
      assert.ok(!(out.stdout+out.stderr).includes(name));
    });
  };
  variant('new-validated-case.json',
    '{"schemaVersion":1,"schemaVersion":2,"PRIVATE_CANARY":"bad"}');
  variant('new-validated-case.json',Buffer.from([0xff,0xfe]));
  variant('new-validated-case.json',Buffer.alloc(1025,0x41));
  variant('PRIVATE_CANARY.txt','not a JSON scenario');
  variant('bad.json',JSON.stringify(record()));
  variant('new-validated-case.json',JSON.stringify({...record(),
    caseId:'wrong-filename-case'}));
});

test('M22-B: symlink and >12-file intake never escape fixed sandbox root',()=>{
  withSandbox(({dir,run})=>{
    const target=join(dir,'owner-task-data.json');
    const link=join(dir,'new-validated-case.json');
    try{symlinkSync(target,link,'file');}
    catch(error){
      assert.ok(process.platform==='win32'&&
        ['EPERM','EACCES','ENOTSUP'].includes(error.code));
      return;
    }
    expectError(run());
  });
  withSandbox(({run,write})=>{
    for(let i=0;i<5;i++){
      const s=record();s.caseId='additional-case-'+i;
      write(s.caseId+'.json',JSON.stringify(s));
    }
    expectError(run());
  });
});

test('M22-C: zero arguments, never echo contributor values, source-only custody',()=>{
  withSandbox(({run})=>{
    const ok=run();
    assert.equal(ok.status,0,ok.stderr);
    for(const value of ['owner-task-data','UNTRUSTED_TOOL_RESULT',
      'PRIVATE_CANARY','C:\\','http://']){
      assert.ok(!ok.stdout.includes(value),value);
    }
    for(const arg of ['--dir=PRIVATE_CANARY','--target=https://private.invalid',
      '../secret.json','--token=PRIVATE_CANARY']){
      const bad=run(arg);expectError(bad);
      assert.ok(!(bad.stdout+bad.stderr).includes(arg));
    }
  });
  const pkg=JSON.parse(readFileSync(join(root,'package.json'),'utf8'));
  const published=JSON.parse(readFileSync(join(root,
    'test/expected-package-files.json'),'utf8'));
  assert.equal(published.length,80);
  assert.ok(!pkg.files.includes('tools'));
  assert.ok(!pkg.files.includes('.github'));
  assert.ok(!published.some(p=>p.includes('m22-scenarios')));
  assert.ok(!published.includes('tools/m22-finite-scenario-runner.mjs'));
});
