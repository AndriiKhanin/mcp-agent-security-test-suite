import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
const cwd=resolve(dirname(fileURLToPath(import.meta.url)),'..');
function cli(...args){return spawnSync(process.execPath,['src/cli.mjs',...args],{cwd,encoding:'utf8'});}
test('passing synthetic scenario yields exit 0',()=>assert.equal(cli('scenario','fixtures/scenario-denial.json').status,0));
test('recovery synthetic scenario yields exit 0',()=>assert.equal(cli('scenario','fixtures/scenario-recovery.json').status,0));
test('passing trace yields exit 0',()=>assert.equal(cli('trace','fixtures/trace-safe.jsonl').status,0));
test('failing trace yields exit 1',()=>assert.equal(cli('trace','fixtures/trace-unsafe.jsonl').status,1));
test('missing file returns exit 2 without echoing path',()=>{let r=cli('scenario','privatepath-SENTINEL.json');assert.equal(r.status,2);assert.equal(r.stderr.includes('privatepath-SENTINEL'),false)});
test('CLI blocks arbitrary subcommands',()=>assert.equal(cli('execute','notreal').status,2));
test('CLI requires exact args',()=>assert.equal(cli('scenario').status,2));
test('result excludes synthetic nonce values',()=>assert.equal(cli('scenario','fixtures/scenario-denial.json').stdout.includes('fictional-nonce'),false));
test('mock adapter access-boundary fixture exits 0',()=>assert.equal(cli('mock','fixtures/scenario-denial.json').status,0));
test('mock adapter recovery fixture exits 0',()=>assert.equal(cli('mock','fixtures/scenario-recovery.json').status,0));
test('mock adapter rejects malformed arguments with exit 2',()=>assert.equal(cli('mock','not-a-fixture.json').status,2));
test('mock result does not echo synthetic grant nonce',()=>{
 const r=cli('mock','fixtures/scenario-denial.json');
 assert.equal(r.status,0); assert.equal(r.stdout.includes('fictional-nonce'),false);
});
