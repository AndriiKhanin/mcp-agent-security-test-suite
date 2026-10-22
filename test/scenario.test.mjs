import test from 'node:test';
import assert from 'node:assert/strict';
import { runScenario } from '../src/scenario.mjs';
const policy={owner:'o1',resource:'mcp://a',scopes:['note:read','note:write','note:delete'],generation:2};
const grant={owner:'o1',resource:'mcp://a',scopes:['note:read','note:write','note:delete'],generation:2,notBefore:0,expiresAt:999,nonce:'n1'};
const action={tool:'write-note',owner:'o1',resource:'mcp://a',origin:'owner',grant,expected:{decision:'ALLOW',effect:'WRITE'}};
const run=(actions,final)=>runScenario({version:1,id:'test-case',clock:100,policy,actions,expectedFinal:final});
const deny=(changes,reason)=>({...action,...changes,grant:{...grant,...changes.grant},expected:{decision:'DENY',reason,effect:'NONE'}});
test('valid allowed write changes in-memory notes',()=>assert.deepEqual(run([action],{allowed:1,denied:0,writes:1,notes:1}).actualFinal,{allowed:1,denied:0,reads:0,writes:1,notes:1}));
test('untrusted instructions cannot change notes',()=>{const r=run([deny({origin:'untrusted'},'UNTRUSTED_ORIGIN')],{writes:0,notes:0});assert.equal(r.status,'PASS')});
test('cross tenant denied with no side effect',()=>assert.equal(run([deny({owner:'o2'},'OWNER_MISMATCH')],{writes:0}).status,'PASS'));
test('wrong resource denies execution',()=>assert.equal(run([deny({resource:'mcp://b'},'AUDIENCE_MISMATCH')],{writes:0}).status,'PASS'));
test('missing approval prevents deletion',()=>assert.equal(run([deny({tool:'delete-note'},'APPROVAL_REQUIRED')],{writes:0}).status,'PASS'));
test('unknown tool cannot execute arbitrary code',()=>assert.equal(run([deny({tool:'process-execute'},'UNKNOWN_TOOL')],{writes:0}).status,'PASS'));
test('expired grant denies',()=>assert.equal(run([deny({grant:{expiresAt:50}},'EXPIRED_GRANT')],{writes:0}).status,'PASS'));
test('stale grant denies',()=>assert.equal(run([deny({grant:{generation:0}},'STALE_GENERATION')],{writes:0}).status,'PASS'));
test('precommit crash has no effect',()=>assert.equal(run([deny({fault:'before-commit'},'SIMULATED_PRECOMMIT_FAILURE')],{writes:0}).status,'PASS'));
test('commit-with-unknown-outcome is replay-safe',()=>{
 const first={...action,fault:'after-commit',expected:{decision:'ALLOW',effect:'WRITE',outcome:'UNKNOWN'}};
 const retry={...action,expected:{decision:'DENY',reason:'REPLAYED_NONCE',effect:'NONE'}};
 const r=run([first,retry],{writes:1,notes:1,denied:1});
 assert.equal(r.status,'PASS'); assert.equal(r.steps[1].reason,'REPLAYED_NONCE');
});
test('unique nonce allows second write',()=>assert.equal(run([action,{...action,grant:{...grant,nonce:'n2'}}],{writes:2,notes:2}).status,'PASS'));
test('read path can be exercised without mutation',()=>{
 const read={...action,tool:'read-note',expected:{decision:'ALLOW',effect:'READ'}};
 assert.equal(run([read],{reads:1,writes:0,notes:0}).status,'PASS');
});
test('explicit expectation mismatch fails a scenario',()=>{
 const x={...action,expected:{decision:'DENY'}};const r=run([x]);
 assert.equal(r.status,'FAIL');assert.deepEqual(r.mismatches,[{step:1,field:'decision',rule:'EXPECTATION_MISMATCH'}]);
});
test('final-state mismatch fails a scenario',()=>assert.equal(run([action],{writes:0}).status,'FAIL'));
test('output never includes nonce or grant content',()=>{
 const r=run([{...action,grant:{...grant,nonce:'PRIVATE_NONCE_SENTINEL'}}]);
 assert.equal(JSON.stringify(r).includes('PRIVATE_NONCE_SENTINEL'),false);
});
test('policy is side-effect free (no state shared across runs)',()=>{
 assert.equal(run([action]).status,'PASS');assert.equal(run([action]).status,'PASS');
});
