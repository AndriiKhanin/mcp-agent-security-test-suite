#!/usr/bin/env node
/**
 * M7-P/Q: voluntary one-command fictional beta preflight (source checkout only).
 * Read-only local Git metadata followed by five fixed bundled symbolic tests.
 * This cannot attest source provenance, independent execution, or MCP security.
 * No user-supplied paths, server connections, shell or automatic submissions.
 */
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {inspectLocalCheckout} from './beta-checkout-receipt.mjs';
import {runBeta} from '../examples/beta-acceptance-check.mjs';
import {buildBetaFeedbackCard} from './beta-feedback-card.mjs';

const failure=(code)=>({
  exitCode:2,
  text:'ERROR: '+code+'\n'
});
const SHA=/^[0-9a-f]{40}$/u;

/** Compare only prevalidated local-SHA receipt with fixed fictional results.
 * This method performs no I/O, emits no private file paths or raw test output. */
export function buildBetaReview(receipt,beta){
  if(!receipt || receipt.status!=='PASS' ||
     receipt.exitCode!==0 || receipt.workingTree!=='NO_REPORTED_CHANGES' ||
     receipt.sourceVerification!=='LOCAL_GIT_METADATA_ONLY' ||
     typeof receipt.sourceSha!=='string' || !SHA.test(receipt.sourceSha) ||
     receipt.remoteIdentityVerified!==false ||
     receipt.commitSignatureVerified!==false ||
     receipt.independentOriginVerified!==false ||
     receipt.actualBetaExecutionVerified!==false ||
     receipt.externalMcpContacted!==false ||
     receipt.betaGateSatisfied!==false ||
     receipt.releaseAuthorized!==false)
    throw new TypeError('INVALID_FICTIONAL_BETA_REVIEW_INPUT');
  const card=buildBetaFeedbackCard(beta); // exact fixed-source symbolic case checker
  return [
    '# Offline fictional beta review — local source only',
    '',
    'Local Git HEAD (not independently verified): '+receipt.sourceSha,
    'Local working tree: NO_REPORTED_CHANGES',
    'Public source identity: NOT VERIFIED — manually compare SHA to reviewed GitHub commit',
    'Independent tester: NOT VERIFIED',
    'Real MCP target assessment: NOT PERFORMED',
    '',
    card.trimEnd()
  ].join('\n')+'\n';
}
export function runBetaReview(args){
  if(!Array.isArray(args) || args.length!==0)
    return failure('BETA_REVIEW_ARGUMENTS_NOT_ALLOWED');
  try{
    const receipt=inspectLocalCheckout([]);
    // Stop before the five symbolic tests on dirty or unverifiable worktrees.
    if(receipt.status==='FAIL')
      return {exitCode:1,text:'FAIL: CHECKOUT_HAS_CHANGES — use a clean public source checkout\n'};
    if(receipt.status!=='PASS')return failure('LOCAL_CHECKOUT_NOT_VERIFIABLE');
    const beta=runBeta([]);
    const text=buildBetaReview(receipt,beta);
    return {exitCode:beta.exitCode,text};
  }catch{
    return failure('FICTIONAL_BETA_REVIEW_UNAVAILABLE');
  }
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const result=runBetaReview(process.argv.slice(2));
  process.stdout.write(result.text);
  process.exitCode=result.exitCode;
}
