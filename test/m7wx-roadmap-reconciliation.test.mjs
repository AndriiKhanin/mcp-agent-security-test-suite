/** M7-W/X: roadmap status must not regress to stale unfinished engineering claims. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const root=new URL('../',import.meta.url);
const read=p=>readFileSync(new URL(p,root),'utf8');
const road=read('ROADMAP.md');
test('M7-W: roadmap has one well-formed engineering milestone table row',()=>{
 const rows=road.split('\n').filter(l=>l.startsWith('| **M7 — Usable offline adopter onboarding** |'));
 assert.equal(rows.length,1);
 assert.equal(rows[0].split('|').length,7,'five table columns');
 assert.match(rows[0],/ENGINEERING DONE/);
 assert.match(rows[0],/independent evaluation NOT VERIFIED/);
 assert.ok(!rows[0].includes('follow-on PR pending'));
 assert.ok(!road.includes('M7-D/E — in progress'));
});
test('M7-W: all seven merged roadmap PRs and post-merge evidence are linked',()=>{
 for(let pr=188;pr<=194;pr++)assert.ok(road.includes(`[PR #${pr}](../../pull/${pr})`),`PR #${pr}`);
 assert.ok(road.includes('main CI #40358493703'));
 assert.ok(road.includes('4/4 PASS'));
 assert.ok(road.includes('Windows/Ubuntu'));
});
test('M7-X: separate M5-06 gate stays open and external beta not asserted',()=>{
 assert.ok(road.includes('M5-06 #59'));
 assert.ok(road.includes('stays **OPEN**'));
 assert.ok(road.includes('independent developer'));
 assert.ok(road.includes('Independent audit'));
 assert.ok(road.includes('external MCP target') || road.includes('actual MCP target'));
 assert.ok(road.includes('opt-in public invitation'));
});
test('M7-X: volunteer handoff is unshipped and referenced in roadmap',()=>{
 assert.ok(road.includes('.github/BETA_VOLUNTEER_HANDOFF.md'));
 assert.ok(read('.github/BETA_VOLUNTEER_HANDOFF.md').includes('Issue [#59]'));
 const inventory=JSON.parse(read('test/expected-package-files.json'));
 assert.ok(!inventory.includes('.github/BETA_VOLUNTEER_HANDOFF.md'));
});
