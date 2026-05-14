/**
 * RafSkoru — Risk Motoru Manuel Senaryo Kontrolü
 * apps/mobile/src/riskEngine/runRiskEngineScenarios.ts
 *
 * Amaç: riskEngineScenarios.ts içindeki her senaryoyu çalıştırıp
 * expectedWarningCodes ile karşılaştırmak.
 *
 * Çalıştırma (tsx kuruluysa):
 *   npx tsx src/riskEngine/runRiskEngineScenarios.ts
 *
 * Çalıştırma (ts-node kuruluysa):
 *   npx ts-node --project tsconfig.json src/riskEngine/runRiskEngineScenarios.ts
 *
 * Sadece tip kontrolü:
 *   npx tsc --noEmit
 *
 * Not: Bu dosya React Native runtime'a dahil edilmez.
 * Yalnızca geliştirici terminalinde manuel kontrol için kullanılır.
 */

declare const process: { exitCode?: number };

import { riskEngineScenarios } from './riskEngineScenarios';
import { evaluateProductRisks } from './riskEngine';

function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((value, index) => value === b[index]);
}

let passed = 0;
let failed = 0;

for (const scenario of riskEngineScenarios) {
  const result = evaluateProductRisks(scenario.input);
  const receivedCodes = result.warnings.map((warning) => warning.code);
  const expectedCodes = scenario.expectedWarningCodes;

  if (arraysEqual(receivedCodes, expectedCodes)) {
    console.log(`PASS  ${scenario.id}  —  ${scenario.title}`);
    passed++;
  } else {
    console.log(`FAIL  ${scenario.id}  —  ${scenario.title}`);
    console.log(`  Expected : [${expectedCodes.join(', ')}]`);
    console.log(`  Received : [${receivedCodes.join(', ')}]`);
    failed++;
  }
}

const total = passed + failed;

console.log('');
console.log(`${passed}/${total} scenarios passed`);

if (failed > 0) {
  process.exitCode = 1;
}