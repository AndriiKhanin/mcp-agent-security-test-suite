/**
 * M6-G: independent public CLI compatibility expectations.
 *
 * Do NOT import the report builder or obtain "expected" data by calling the
 * production kit generator: expected status, descriptors and authority
 * boundaries below are intentionally authored literally.
 *
 * All test inputs are fictional. This does not authenticate a real target.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,writeFileSync,rmSync,symlinkSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const cliFile=join(root,'src','cli.mjs');
const cli=(...args)=>spawnSync(process.execPath,[cliFile,...args],{
  cwd:root,shell:false,windowsHide:true,encoding:'utf8',
  timeout:20000,maxBuffer:1048576
});
const dry=Object.freeze({
  mode:'validate-only',allowNetwork:false,allowProcessSpawn:false,
  allowToolCalls:false,allowCredentials:false
});
function descriptor(type){
  return {
    adapterSchemaVersion:1,
    project:{name:type==='stdio'?'fictional-stdio-project':'fictional-http-project'},
    transport:type==='stdio'
      ?{type:'stdio',command:'node',args:['server.mjs']}
      :{type:'streamable-http',endpoint:'https://mcp.example.org/mcp'},
    protocolVersion:'2026-07-28',
    policy:{...dry}
  };
}
function expectation(type,effect='NONE',expectedStatus='PASS',rules=[]){
  return {
    expectationSchemaVersion:1,mode:'synthetic-expectations-only',
    trace:{traceSchemaVersion:1,mode:'user-authored-synthetic-only',
      descriptor:descriptor(type),events:[{
        decision:'DENY',effect,ownerAuthorized:false,
        scopeAuthorized:false,leaseFresh:false,secretLogged:false
      }]},
    expectedStatus,expected:[{event:1,ruleCodes:rules}]
  };
}
function temp(fn){
  const dir=mkdtempSync(join(tmpdir(),'m6g-compat-'));
  try{return fn({dir,save(name,bytes){
    const path=join(dir,name);
    writeFileSync(path,bytes);return path;
  }});}
  finally{rmSync(dir,{recursive:true,force:true});}
}
function jsonResult(run,command,exit,status){
  assert.equal(run.error,undefined);
  assert.equal(run.status,exit,'unexpected CLI exit: '+run.stderr);
  assert.ok(run.stdout.startsWith('{\n'),'legacy JSON command changed output mode');
  assert.equal(run.stderr,'','normal fictional output must not emit stderr');
  const x=JSON.parse(run.stdout);
  assert.equal(x.reportSchemaVersion,1);
  assert.equal(x.command,command);
  assert.equal(x.exitCode,exit);
  assert.equal(x.status,status);
  assert.ok(Array.isArray(x.guidance));
  assert.ok(x.summary && Array.isArray(x.summary.ruleCodes));
  return x;
}
function noAuthority(report){
  assert.equal(report.externalTargetContacted,false);
  assert.equal(report.projectConnectionAuthorized,false);
  assert.equal(report.operatorVerified,false);
  assert.equal(report.executionEnabled,false);
  assert.equal(report.connectionStatus,'NOT_ATTEMPTED');
  assert.equal(report.authorizationStatus,'REAL_TARGET_EXECUTION_NOT_AUTHORIZED');
}
function reader(report,code){
  assert.equal(report.readerGuide?.readerGuideSchemaVersion,1);
  assert.equal(report.readerGuide.code,code);
  assert.equal(report.readerGuide.reportScope,'FICTIONAL_OFFLINE_ASSERTIONS_ONLY');
  assert.equal(report.readerGuide.nextSteps.length,2);
  for(const name of [
    'realProjectAssessed','externalMcpContactAuthorized',
    'independentAuditCompleted','independentBetaVerified',
    'ownerOperatorVerified','stableReleaseAuthorized'
  ])assert.equal(report.readerGuide[name],false,name);
}
test('M6-G: CLI discovery, aliases, candidate metadata and JSON-v1 stay stable',()=>{
  const help=jsonResult(cli('help'),'help',0,'PASS');
  assert.equal(help.commands.length,30);
  for(const name of ['adapter-kit','adapter-kit-verify',
    'adapter-quickstart','adapter-trace-expect','adapter-report-view'])
    assert.ok(help.commands.includes(name),name);
  for(const alias of ['--help','-h'])
    assert.deepEqual(jsonResult(cli(alias),'help',0,'PASS'),help);
  const version=jsonResult(cli('version'),'version',0,'PASS');
  assert.deepEqual({
    name:version.packageName,version:version.version,minNode:version.minimumNodeVersion
  },{name:'mcp-agent-security-test-suite',version:'0.0.10-rc.1',minNode:'20'});
  for(const alias of ['--version','-V'])
    assert.deepEqual(jsonResult(cli(alias),'version',0,'PASS'),version);
  assert.ok(!('stableReleaseAuthorized' in version));
});
test('M6-G: both transport kit contracts preserve literal inert descriptors and safety meaning',()=>{
  for(const type of ['stdio','streamable-http']){
    const kit=jsonResult(cli('adapter-kit',type),'adapter-kit',0,'PASS');
    assert.equal(kit.kitSchemaVersion,1);
    assert.equal(kit.transport,type);
    assert.deepEqual(kit.starterDescriptor,descriptor(type));
    assert.deepEqual(kit.expectedResults,{
      quickstart:{exitCode:0,shapeStatus:'PASS',fictionalControlsMatched:5,
        projectSafetyAssessed:false},
      cleanCi:{exitCode:0,observedSafetyStatus:'PASS',expectationStatus:'MATCH'},
      expectedViolationCi:{exitCode:0,observedSafetyStatus:'FAIL',
        expectationStatus:'MATCH',observedRule:'DENIED_ACTION_HAD_EFFECT'}
    });
    assert.deepEqual(kit.cleanExpectation,expectation(type));
    assert.deepEqual(kit.expectedViolation,
      expectation(type,'WRITE','FAIL',['DENIED_ACTION_HAD_EFFECT']));
    assert.equal(kit.plan.length,7);
    assert.equal(kit.projectSafetyAssessed,false);
    assert.equal(kit.securityCertified,false);
    assert.equal(kit.releaseAuthorized,false);
    assert.equal(kit.fixturesAreProjectSpecific,false);
    noAuthority(kit);
    reader(kit,'FICTIONAL_KIT_GENERATED');
  }
});
test('M6-G: quickstart and exported kit verification preserve literal JSON envelopes',()=>{
  for(const type of ['stdio','streamable-http'])temp(({save})=>{
    const inert=descriptor(type);
    const file=save('fictional-descriptor.json',JSON.stringify(inert));
    const quick=jsonResult(cli('adapter-quickstart',file),
      'adapter-quickstart',0,'PASS');
    assert.equal(quick.quickstartSchemaVersion,1);
    assert.equal(quick.checked,5);
    assert.equal(quick.fixturesAreProjectSpecific,false);
    assert.equal(quick.projectSafetyAssessed,false);
    assert.deepEqual(quick.controls.map(c=>c.caseId),[
      'permission-denial','replay-denial','tool-escalation-denial',
      'denied-effect-negative','clean-trace'
    ]);
    assert.deepEqual(quick.controls.map(c=>c.controlStatus),
      ['PASS','PASS','PASS','PASS','PASS']);
    assert.equal(quick.controls[3].fictionalObservedStatus,'FAIL');
    noAuthority(quick);
    reader(quick,'DESCRIPTOR_SHAPE_AND_FICTIONAL_CONTROLS_MATCH');
    assert.ok(!JSON.stringify(quick).includes('PRIVATE_CANARY'));

    const kit=jsonResult(cli('adapter-kit',type),'adapter-kit',0,'PASS');
    const exported=save('fictional-kit.json',JSON.stringify(kit));
    const checked=jsonResult(cli('adapter-kit-verify',exported),
      'adapter-kit-verify',0,'PASS');
    assert.equal(checked.verificationSchemaVersion,1);
    assert.equal(checked.checked,3);
    assert.deepEqual(checked.checks.map(x=>x.matched),[true,true,true]);
    assert.deepEqual(checked.checks.slice(1).map(x=>[
      x.observedSafetyStatus,x.expectationStatus
    ]),[['PASS','MATCH'],['FAIL','MATCH']]);
    noAuthority(checked);
    reader(checked,'FICTIONAL_KIT_CONTRACT_MATCH');
  });
});
test('M6-G: literal clean, detected and unexpected cases have preserved 0/1/2 semantics',()=>{
  for(const type of ['stdio','streamable-http'])temp(({save})=>{
    for(const [name,input,exit,outer,observed,matching,guide] of [
      ['clean',expectation(type),0,'PASS','PASS','MATCH',
        'CLEAN_FICTIONAL_TRACE_MATCH'],
      ['expected-negative',expectation(type,'WRITE','FAIL',
        ['DENIED_ACTION_HAD_EFFECT']),0,'PASS','FAIL','MATCH',
        'FICTIONAL_VIOLATION_DETECTED_AS_EXPECTED'],
      ['unexpected-negative',expectation(type,'WRITE','PASS',[]),1,'FAIL',
        'FAIL','MISMATCH','FICTIONAL_EXPECTATION_MISMATCH']
    ]){
      const file=save(name+'.json',JSON.stringify(input));
      const native=jsonResult(cli('adapter-trace-expect',file),
        'adapter-trace-expect',exit,outer);
      assert.equal(native.observedSafetyStatus,observed);
      assert.equal(native.expectationStatus,matching);
      assert.equal(native.reportMeaning,'EXACT_SYNTHETIC_EXPECTATION_MATCH_ONLY');
      noAuthority(native);
      reader(native,guide);
      const human=cli('adapter-report-view',file);
      assert.equal(human.status,exit);
      assert.equal(human.stderr,'');
      assert.match(human.stdout,/^FICTIONAL ONLY - offline symbolic expectation/);
      assert.ok(human.stdout.includes('CI expectation: '+matching));
      assert.ok(human.stdout.includes('Observed fictional safety: '+observed));
      assert.ok(human.stdout.includes('Exit code: '+exit));
      assert.ok(human.stdout.includes('Independent security audit: NOT COMPLETED'));
      assert.ok(human.stdout.includes('Real MCP target execution: NOT AUTHORIZED'));
      assert.ok(!human.stdout.startsWith('{'));
      assert.ok(!human.stdout.includes(file));
      assert.ok(!human.stdout.includes('\u001b'));
    }
  });
});
test('M6-G: forged report, hostile bytes and size limits never turn into PASS',()=>{
  temp(({save})=>{
    const invalidInputs=[
      '{invalid PRIVATE_CANARY',
      '{"mode":"x","mode":"x","private":"PRIVATE_CANARY"}',
      JSON.stringify({status:'PASS',reportSchemaVersion:1,
        authorizationStatus:'REAL_TARGET_AUTHORIZED',readerGuide:{
          code:'CLEAN_FICTIONAL_TRACE_MATCH',message:'PRIVATE_CANARY'
        }}),
      Buffer.from([0xff,0xfe,0x1b,0x5b,0x33,0x31,0x6d]),
      Buffer.alloc(4097,0x41),
      JSON.stringify({...expectation('stdio'),extra:'PRIVATE_CANARY\u001b[31m'})
    ];
    for(const [i,bytes] of invalidInputs.entries()){
      const path=save('invalid-'+i+'.json',bytes);
      const original=cli('adapter-trace-expect',path);
      const native=JSON.parse(original.stdout);
      assert.equal(original.status,2);
      assert.equal(native.reportSchemaVersion,1);
      assert.equal(native.status,'ERROR');
      assert.equal(native.errorCode,'INVALID_OR_UNREADABLE_INPUT');
      reader(native,'INVALID_OFFLINE_INPUT');
      const human=cli('adapter-report-view',path);
      assert.equal(human.status,2);
      assert.match(human.stdout,/Observed fictional safety: NOT EVALUATED/);
      assert.match(human.stdout,/Exit code: 2/);
      for(const r of [original,human]){
        assert.ok(!(r.stdout+r.stderr).includes('PRIVATE_CANARY'));
        assert.ok(!(r.stdout+r.stderr).includes(path));
        assert.ok(!(r.stdout+r.stderr).includes('\u001b'));
      }
    }
  });
});
test('M6-G: invalid args and symlink leaf do not reveal paths or approve effects',()=>{
  for(const command of ['adapter-kit','adapter-trace-expect',
    'adapter-kit-verify','adapter-quickstart']){
    const run=cli(command,'--token=PRIVATE_CANARY');
    assert.equal(run.status,2);
    const x=JSON.parse(run.stdout);
    assert.equal(x.status,'ERROR');
    reader(x,'INVALID_OFFLINE_INPUT');
    assert.ok(!(run.stdout+run.stderr).includes('PRIVATE_CANARY'));
  }
  const badView=cli('adapter-report-view','--token=PRIVATE_CANARY');
  assert.equal(badView.status,2);
  assert.ok(badView.stdout.startsWith('FICTIONAL ONLY'));
  assert.ok(!badView.stdout.includes('PRIVATE_CANARY'));
  temp(({dir,save})=>{
    const target=save('PRIVATE_CANARY-source.json',
      JSON.stringify(expectation('stdio')));
    const link=join(dir,'shortcut.json');
    try{symlinkSync(target,link,'file');}
    catch(error){
      assert.ok(process.platform==='win32' &&
        ['EPERM','EACCES','ENOTSUP'].includes(error.code));
      return;
    }
    for(const command of ['adapter-trace-expect','adapter-report-view']){
      const res=cli(command,link);
      assert.equal(res.status,2);
      assert.ok(!(res.stdout+res.stderr).includes('PRIVATE_CANARY'));
      assert.ok(!(res.stdout+res.stderr).includes(target));
      assert.ok(!(res.stdout+res.stderr).includes(link));
    }
  });
});
test('M6-G: runtime first-party API interception rejects network/process effects',()=>{
  temp(({save})=>{
    // Requiring this local, test-owned preload causes the child to fail if
    // reviewed non-contact commands try Node process/net/http/dns/fetch APIs.
    // This is an API witness, not an OS egress monitor or sandbox.
    const preloader=save('effects.cjs',[
      "const {syncBuiltinESMExports}=require('node:module');",
      "for(const [id,names] of [",
      "['node:child_process',['spawn','spawnSync','exec','execSync','execFile','execFileSync','fork']],",
      "['node:net',['connect','createConnection','createServer']],",
      "['node:http',['request','get','createServer']],",
      "['node:https',['request','get','createServer']],",
      "['node:tls',['connect','createServer']],",
      "['node:dns',['lookup','resolve','resolve4','resolve6']]]){",
      " const api=require(id);",
      " for(const name of names){if(typeof api[name]!=='function')continue;",
      " api[name]=function(){process.stderr.write('FORBIDDEN_EFFECT\\n');throw Error('FORBIDDEN_EFFECT')};",
      " }}",
      "globalThis.fetch=()=>{process.stderr.write('FORBIDDEN_EFFECT\\n');throw Error('FORBIDDEN_EFFECT')};",
      "syncBuiltinESMExports();"
    ].join('\n'));
    const input=save('fictional.json',JSON.stringify(expectation('stdio')));
    for(const args of [
      ['adapter-kit','stdio'],
      ['adapter-kit','streamable-http'],
      ['adapter-quickstart',save('descriptor.json',JSON.stringify(descriptor('stdio')))],
      ['adapter-trace-expect',input],
      ['adapter-report-view',input]
    ]){
      const run=spawnSync(process.execPath,['--require',preloader,cliFile,...args],{
        cwd:root,encoding:'utf8',shell:false,windowsHide:true,
        timeout:20000,maxBuffer:65536,env:{...process.env,NODE_OPTIONS:''}
      });
      assert.equal(run.status,0,run.stderr);
      assert.ok(!run.stderr.includes('FORBIDDEN_EFFECT'));
      assert.ok(!run.stdout.includes('FORBIDDEN_EFFECT'));
    }
  });
});
test('M6-G: test-only compatibility guard preserves 80 path inventory and no new deps',()=>{
  const pkg=JSON.parse(readFileSync(join(root,'package.json'),'utf8'));
  const shipped=JSON.parse(readFileSync(join(root,
    'test','expected-package-files.json'),'utf8'));
  assert.equal(shipped.length,80);
  assert.equal(shipped.includes('test/m6g-cli-compatibility.test.mjs'),false);
  for(const name of ['dependencies','devDependencies','optionalDependencies',
    'peerDependencies'])assert.equal(Object.keys(pkg[name]??{}).length,0);
  assert.equal(pkg.version,'0.0.10-rc.1');
  const scripts=pkg.scripts||{};
  for(const key of ['preinstall','install','postinstall','prepublish','prepublishOnly'])
    assert.equal(Object.hasOwn(scripts,key),false);
});
