#!/usr/bin/env node

/**
 * File coverage report tool focused on specific key files
 * This script displays coverage for critical files in the project
 */

import fs from 'fs';
import path from 'path';

// Check if coverage results are available
try {
  // Read the coverage report
  const coverage = JSON.parse(fs.readFileSync('./coverage/coverage-final.json', 'utf8'));

  // Critical files to check coverage for
  const criticalFiles = [
    'src/components/App.ts',
    'src/components/Counter.ts',
    'src/components/MathDemo.ts',
    'src/utils/math-lib-wrapper.ts',
    'src/services/router.ts',
    'src/services/pwa.ts',
    'src/services/sw-builder.ts',
    'src/utils/coordinate-utils.ts',
  ];

  // Find paths that match our critical files
  const criticalFilePaths = Object.keys(coverage).filter((filePath) =>
    criticalFiles.some((pattern) => filePath.includes(pattern))
  );

  console.log('\n📊 Coverage Summary for Critical Files:');
  console.log('-----------------------------------');

  // Function to calculate percentage
  const calculatePercentage = (covered, total) =>
    total === 0 ? 100 : Math.round((covered / total) * 100);

  // Calculate coverage metrics for each file
  criticalFilePaths.forEach((filePath) => {
    const fileData = coverage[filePath];
    const fileName = path.basename(filePath);

    // Get statement coverage
    const stmtTotal = Object.keys(fileData.statementMap).length;
    const stmtCovered = Object.values(fileData.s).filter((v) => v > 0).length;
    const stmtPct = calculatePercentage(stmtCovered, stmtTotal);

    // Get branch coverage
    let branchTotal = 0;
    let branchCovered = 0;
    Object.values(fileData.b).forEach((branches) => {
      branchTotal += branches.length;
      branchCovered += branches.filter((c) => c > 0).length;
    });
    const branchPct = calculatePercentage(branchCovered, branchTotal);

    // Get function coverage
    const fnTotal = Object.keys(fileData.fnMap).length;
    const fnCovered = Object.values(fileData.f).filter((v) => v > 0).length;
    const fnPct = calculatePercentage(fnCovered, fnTotal);

    // Get line coverage
    const lineTotal = Object.keys(fileData.statementMap).length; // Approximation
    const lineCovered = Object.values(fileData.s).filter((v) => v > 0).length;
    const linePct = calculatePercentage(lineCovered, lineTotal);

    // Display the coverage metrics for this file
    console.log(`\nFile: ${fileName}`);
    console.log(`  Statements: ${stmtPct}% (${stmtCovered}/${stmtTotal})`);
    console.log(`  Branches:   ${branchPct}% (${branchCovered}/${branchTotal})`);
    console.log(`  Functions:  ${fnPct}% (${fnCovered}/${fnTotal})`);
    console.log(`  Lines:      ${linePct}% (${lineCovered}/${lineTotal})`);

    // Show branch details for sw-builder.ts
    if (filePath.includes('sw-builder.ts')) {
      console.log('\n  Branch details for sw-builder.ts:');
      Object.entries(fileData.branchMap).forEach(([branchId, branch]) => {
        const counts = fileData.b[branchId];
        const covered = counts.every((count) => count > 0);
        console.log(
          `    ${covered ? '✅' : '❌'} Branch ${branchId} (${branch.type}) at line ${branch.line}`
        );

        if (!covered) {
          counts.forEach((count, idx) => {
            console.log(`      Path ${idx}: ${count > 0 ? 'Covered' : 'Not covered'}`);
          });
        }
      });
    }
  });
} catch (error) {
  console.error(`Error processing coverage data: ${error.message}`);
  console.error('Make sure to run tests with coverage first: npm run test:coverage');
}
