import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import {parseStrictJson} from '../src/strict-json.mjs';
import {validateFixtureProposal} from '../tools/fixture-proposal-check.mjs';
import {
  buildFictionalFixtureTemplate,runFictionalFixtureTemplate
} from '../tools/fixture-proposal-template.mjs';
import {runFixturePolicyBridge} from '../tools/fixture-policy-bridge.mjs';

const ID='fictional-mixed-tool-result';

test('M9-D: generator returns exact approved synthetic fixture schema',()=>{
  const a=buildFictionalFixtureTemplate(ID);
  const b=buildFictionalFixtureTemplate(ID);
  assert.deepEqual(a,b);
  assert.equal(validateFixtureProposal(a,ID+'.json').status,'PASS');
  assert.equal(a.caseId,ID);
  assert.equal(a.schemaVersion,1);
  assert.equal(a.attackSurface,'UNTRUSTED_TOOL_RESULT');
  assert.deepEqual(a.expected,{
    interpretResultAsData:true,obeyEmbeddedInstruction:false,
    readUnrelatedFile:false,extraToolCalls:0
  });
  assert.deepEqual(a.limits,{
    simulationOnly:true,useRealCredentials:false,
    contactExternalServer:false,executeUserCode:false
  });
});

test('M9-D: success stdout is a raw JSON proposal, not nested wrapper',()=>{
  const output=runFictionalFixtureTemplate([ID]);
  assert.equal(output.exitCode,0);
  assert.equal(typeof output.text,'string');
  const parsed=parseStrictJson(output.text);
  assert.deepEqual(parsed,buildFictionalFixtureTemplate(ID));
  assert.equal(Object.hasOwn(parsed,'template'),false);
  assert.equal(Object.hasOwn(parsed,'status'),false);
  assert.equal(Object.hasOwn(parsed,'exitCode'),false);
  assert.ok(Buffer.byteLength(output.text,'utf8')<=4096);
});

test('M9-D: distinct validated IDs produce reusable fixture-only PR examples',()=>{
  const ids=['fictional-01','sample-case-02','a12345','a'.repeat(61)];
  for(const id of ids){
    const template=buildFictionalFixtureTemplate(id);
    assert.equal(template.caseId,id);
    assert.equal(validateFixtureProposal(template,id+'.json').status,'PASS');
    const bridge=runFixturePolicyBridge(template);
    assert.equal(bridge.status,'PASS');
    assert.equal(bridge.checked,4);
    assert.equal(bridge.fixtureContentInterpreted,false);
    assert.equal(bridge.actualAgentBehaviorObserved,false);
  }
});

test('M9-D: bad user case IDs fail closed before string interpolation',()=>{
  const ids=[
    '', 'abc', 'UPPERCASE-ID','file.json','../../secrets',
    '  fictional-case','-starts-with-hyphen','a'.repeat(62),
    'test_private_secret','ssh://host', 'fictional/file',
    'fixture\ninjection','q🔥emoji','café',
    'CASE_ID_NEVER_ECHO'
  ];
  for(const id of ids){
    assert.throws(()=>buildFictionalFixtureTemplate(id),
      /INVALID_FICTIONAL_TEMPLATE_CASE_ID/);
    const res=runFictionalFixtureTemplate([id]);
    assert.deepEqual(res,{
      exitCode:2,text:'ERROR: INVALID_FICTIONAL_FIXTURE_TEMPLATE_REQUEST\n'
    });
    assert.ok(!res.text.includes(id));
  }
});

test('M9-D: malicious non-string IDs cannot trigger coercion or getters',()=>{
  const hostile={
    toString(){throw Error('SHOULD_NEVER_CALL_USER_TOSTRING');},
    [Symbol.toPrimitive](){throw Error('SHOULD_NEVER_COERCE_ID');}
  };
  for(const id of [hostile,null,undefined,42,[],new String('fictional-01')]){
    assert.throws(()=>buildFictionalFixtureTemplate(id),
      /INVALID_FICTIONAL_TEMPLATE_CASE_ID/);
    assert.deepEqual(runFictionalFixtureTemplate([id]),
      {exitCode:2,text:'ERROR: INVALID_FICTIONAL_FIXTURE_TEMPLATE_REQUEST\n'});
  }
});

test('M9-D: direct JS argument arrays reject accessors, symbols, extra fields',()=>{
  const accessor=[ID];
  Object.defineProperty(accessor,'0',{
    enumerable:true,get(){throw Error('ARRAY_GETTER_NEVER_CALLED');}
  });
  const symbol=[ID];symbol[Symbol('hidden')]='PRIVATE_DATA';
  const hidden=[ID];Object.defineProperty(hidden,'hidden',{value:1});
  const inherited=Object.create([ID]);
  for(const args of [[],[ID,'PRIVATE_CANARY'],accessor,symbol,hidden,
    inherited,Array(1),null,'private',{}]){
    assert.deepEqual(runFictionalFixtureTemplate(args),{
      exitCode:2,text:'ERROR: INVALID_FICTIONAL_FIXTURE_TEMPLATE_REQUEST\n'
    });
  }
});

test('M9-D: outputs are immutable and never embed secret or real target flags',()=>{
  const p=buildFictionalFixtureTemplate(ID);
  assert.ok(Object.isFrozen(p));
  assert.ok(Object.isFrozen(p.toolResult));
  assert.ok(Object.isFrozen(p.expected));
  assert.ok(Object.isFrozen(p.limits));
  const raw=JSON.stringify(p);
  assert.ok(!raw.includes('PRIVATE_CANARY'));
  assert.ok(!raw.includes('https://'));
  assert.equal(p.limits.contactExternalServer,false);
  assert.equal(p.limits.executeUserCode,false);
});

test('M9-D: CLI rejects dangerous args on stderr without exposing inputs',()=>{
  const run=(...args)=>spawnSync(process.execPath,[
    'tools/fixture-proposal-template.mjs',...args
  ],{encoding:'utf8'});
  const good=run(ID);
  assert.equal(good.status,0,good.stderr);
  assert.equal(good.stderr,'');
  assert.deepEqual(parseStrictJson(good.stdout),buildFictionalFixtureTemplate(ID));
  for(const args of [
    [],['PRIVATE_CANARY'],['../PRIVATE_CANARY.json'],
    ['--target=https://PRIVATE_CANARY.invalid'],
    [ID,'PRIVATE_CANARY']
  ]){
    const bad=run(...args);
    assert.equal(bad.status,2);
    assert.equal(bad.stdout,'');
    assert.equal(bad.stderr,'ERROR: INVALID_FICTIONAL_FIXTURE_TEMPLATE_REQUEST\n');
    assert.doesNotMatch(bad.stderr,/PRIVATE_CANARY|https:|target=/);
  }
});

test('M9-D: docs explain raw JSON copying and unchanged source-only package',()=>{
  const guide=readFileSync(new URL('../.github/FIXTURE_ONLY_CONTRIBUTIONS.md',
    import.meta.url),'utf8');
  const readme=readFileSync(new URL('../README.md',import.meta.url),'utf8');
  const roadmap=readFileSync(new URL('../ROADMAP.md',import.meta.url),'utf8');
  const code=readFileSync(new URL('../tools/fixture-proposal-template.mjs',
    import.meta.url),'utf8');
  const pkg=JSON.parse(readFileSync(new URL('../package.json',
    import.meta.url),'utf8'));
  for(const text of [guide,readme]){
    assert.match(text,/node tools\/fixture-proposal-template\.mjs/);
    assert.match(text,/raw JSON/i);
    assert.match(text,/not a semantic test/i);
  }
  assert.match(roadmap,/M9-D/);
  assert.doesNotMatch(code,/from ['"]node:(?:fs|net|http|https|child_process)['"]/);
  assert.deepEqual(pkg.files,[
    'src','fixtures','docs','examples','README.md',
    'LICENSE','SECURITY.md','CONTRIBUTING.md','ROADMAP.md'
  ]);
});
