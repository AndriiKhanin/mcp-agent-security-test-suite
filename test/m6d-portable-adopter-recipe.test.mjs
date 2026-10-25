/**
 * M6-D: prepublication test of an INACTIVE, copy-only adopter CI recipe.
 * The recipe runs fixed fictional samples; it is not an external user MCP test.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  readFileSync, readdirSync, cpSync, mkdirSync, mkdtempSync, rmSync
} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join,dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const source=readFileSync(
  join(root,'.github','examples','fictional-adopter-ci.yml'),'utf8'
).replace(/\r\n/g,'\n');
const pin='e05288d854aef3604fd014ea94ed72503bc13104';
function runBlock(){
  const marker='      - name: Run pure fictional kit and expectation checks (no npm install)\n        shell: bash\n        run: |\n';
  assert.ok(source.includes(marker),'M6D_MISSING_BASH_RUN_BLOCK');
  const lines=source.split(marker)[1].split('\n');
  const block=[];
  for(const line of lines){
    if(line && !line.startsWith('          '))break;
    block.push(line.startsWith('          ')?line.slice(10):'');
  }
  return block.join('\n').trimEnd()+'\n';
}
const bash=spawnSync('bash',['--version'],{encoding:'utf8',timeout:5000});
const canBash=!bash.error && bash.status===0;

test('M6-D: copy-only adopter recipe is not installed or automatically activated',()=>{
  assert.ok(source.startsWith('# COPY-ONLY example'));
  assert.ok(source.includes('NOT an active workflow'));
  assert.ok(source.includes('on:\n  pull_request:\n  workflow_dispatch:'));
  assert.ok(source.includes('permissions:\n  contents: read'));
  assert.ok(source.includes('persist-credentials: false'));
  assert.ok(source.includes('path: adopter'));
  assert.ok(source.includes('path: reviewed-suite'));
  assert.ok(!source.includes('on:\n  push:'));
  const expected=JSON.parse(readFileSync(
    join(root,'test','expected-package-files.json'),'utf8'));
  assert.equal(expected.length,80);
  assert.ok(!expected.includes('.github/examples/fictional-adopter-ci.yml'));
  assert.ok(!expected.includes('test/m6d-portable-adopter-recipe.test.mjs'));
});
test('M6-D: only reviewed public source SHA and pinned GitHub Actions are used',()=>{
  assert.match(pin,/^[a-f0-9]{40}$/);
  assert.ok(source.includes('repository: AndriiKhanin/mcp-agent-security-test-suite'));
  assert.ok(source.includes('ref: '+pin));
  assert.ok(source.includes('git -C reviewed-suite rev-parse HEAD'));
  assert.ok(source.includes('test "$(git -C reviewed-suite rev-parse HEAD)" = "'+pin+'"'));
  assert.ok(source.includes("version !== '0.0.10-rc.1'"));
  assert.ok(source.includes('os: [ubuntu-latest, windows-latest]'));
  assert.ok(source.includes('node-version: [20, 22]'));
  const actions=[...source.matchAll(/uses: ([^\s]+)/g)].map(x=>x[1]);
  assert.equal(actions.length,3);
  for(const action of actions)assert.match(action,/@[a-f0-9]{40}$/);
  assert.deepEqual(actions.slice(0,2),[actions[0],actions[0]]);
});
test('M6-D: workflow is deliberately minimal privileges, no npm or target execution',()=>{
  const commands=runBlock();
  assert.ok(commands.includes('adapter-kit stdio'));
  assert.ok(commands.includes('adapter-kit-verify'));
  assert.ok(commands.includes('adapter-trace-expect'));
  assert.ok(commands.includes('offline-ci-check.mjs'));
  assert.ok(commands.includes('observedSafetyStatus!=="FAIL"'));
  assert.ok(commands.includes('expectationStatus!=="MATCH"'));
  assert.ok(commands.includes('test "$?" -eq 1'));
  assert.ok(commands.includes('trap '));
  assert.ok(!/npm (?:install|ci|publish)|npx\s|curl\s|wget\s|tools\/call|fetch\s*\(/i.test(commands));
  assert.ok(!source.includes('secrets.'));
  assert.ok(!source.includes('id-token: write'));
  assert.ok(!source.includes('pull_request_target:'));
  assert.ok(!source.includes('workflow_run:'));
  assert.ok(!source.includes('GH_TOKEN'));
});
test('M6-D: Bash recipe is syntactically valid (where bash is available)',()=>{
  assert.ok(runBlock().length>1000);
  if(!canBash){
    assert.equal(process.platform,'win32','bash expected on Unix');
    return; // Run the same Node CLI contract through cross-platform JS test below.
  }
  const out=spawnSync('bash',['-n'],{
    input:runBlock(),encoding:'utf8',timeout:5000
  });
  assert.equal(out.status,0,out.stderr);
});
function isolated(fn){
  const work=mkdtempSync(join(tmpdir(),'m6d-adopter-recipe-'));
  try {
    const reviewed=join(work,'reviewed-suite');
    mkdirSync(reviewed);
    for(const rel of ['src','examples','fixtures'])
      cpSync(join(root,rel),join(reviewed,rel),{recursive:true});
    cpSync(join(root,'package.json'),join(reviewed,'package.json'));
    mkdirSync(join(work,'adopter'));
    mkdirSync(join(work,'scratch'));
    const env={...process.env,TMP:join(work,'scratch'),
      TEMP:join(work,'scratch'),TMPDIR:join(work,'scratch')};
    return fn({work,env});
  }finally{rmSync(work,{recursive:true,force:true});}
}
test('M6-D: execute literal exported-kit recipe in disposable adopter workspace',()=>{
  if(!canBash){
    assert.equal(process.platform,'win32');
    return;
  }
  isolated(({work,env})=>{
    const completed=spawnSync('bash',['-c',runBlock()],{
      cwd:work,env,encoding:'utf8',timeout:60000,maxBuffer:100000
    });
    assert.equal(completed.status,0,
      'M6D_RECIPE_EXECUTION_FAILED: '+(completed.stderr||'').slice(-700));
    assert.match(completed.stdout,/DEMO_PASS/);
    assert.deepEqual(readdirSync(join(work,'scratch')),[],
      'temporary fictional kit artifacts must be deleted in trap');
  });
});
test('M6-D: CI failure propagates if the reviewed kit source command is corrupted',()=>{
  if(!canBash){
    assert.equal(process.platform,'win32');
    return;
  }
  isolated(({work,env})=>{
    const broken=runBlock().replace(
      'node reviewed-suite/src/cli.mjs adapter-kit stdio >',
      'node reviewed-suite/src/cli.mjs adapter-kit UNAUTHORIZED_PRIVATE_EXEC >'
    );
    assert.notEqual(broken,runBlock());
    const completed=spawnSync('bash',['-c',broken],{
      cwd:work,env,encoding:'utf8',timeout:25000,maxBuffer:65536
    });
    assert.notEqual(completed.status,0,'hostile selector must break CI');
    assert.ok(!(completed.stdout+completed.stderr).includes('PRIVATE_EXEC'));
    assert.deepEqual(readdirSync(join(work,'scratch')),[]);
  });
});
test('M6-D: docs explain separation from actual security assessment and beta evidence',()=>{
  const docs=readFileSync(join(root,'docs','GETTING_STARTED.md'),'utf8');
  const adapter=readFileSync(join(root,'docs','UNIVERSAL_ADAPTER.md'),'utf8');
  const roadmap=readFileSync(join(root,'ROADMAP.md'),'utf8');
  for(const v of [docs,adapter,roadmap]){
    assert.ok(v.includes('M6-D'));
    assert.ok(v.includes('fictional')||v.includes('Fictional'));
  }
  assert.ok(docs.includes('.github/examples/fictional-adopter-ci.yml'));
  assert.ok(docs.includes('e05288d854aef3604fd014ea94ed72503bc13104'));
  assert.ok(docs.includes('adapter-kit-verify'));
  assert.ok(docs.includes('adapter-trace-expect'));
  assert.ok(docs.includes('NOT a security audit'));
  assert.ok(docs.includes('#21'));
  assert.ok(docs.includes('#43'));
  assert.ok(docs.includes('#59'));
});
