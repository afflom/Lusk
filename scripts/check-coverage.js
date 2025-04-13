#!/usr/bin/env node

/**
 * Standard coverage report checker using Vitest's built-in reporting
 * This script checks the coverage report against configured thresholds
 */

import fs from 'fs';
import path from 'path';

// Configuration - must match vitest.config.js thresholds
const COVERAGE_THRESHOLDS = {
  statements: 70, // Project threshold for statement coverage
  branches: 50, // Project threshold for branch coverage
  functions: 85, // Project threshold for function coverage
  lines: 70, // Project threshold for line coverage
};

// Path to the coverage report
const COVERAGE_SUMMARY = './coverage/coverage-summary.json';

// Check if coverage file exists
if (!fs.existsSync(COVERAGE_SUMMARY)) {
  console.error('❌ ERROR: Coverage summary not found. Run tests with coverage first.');
  process.exit(1);
}

// Read the coverage summary
try {
  const coverageSummary = JSON.parse(fs.readFileSync(COVERAGE_SUMMARY, 'utf8'));

  // Get the total coverage metrics
  const total = coverageSummary.total;

  // Display the current coverage metrics
  console.log('📊 Current coverage metrics:');
  console.log(`- Statements: ${total.statements.pct}%`);
  console.log(`- Branches: ${total.branches.pct}%`);
  console.log(`- Functions: ${total.functions.pct}%`);
  console.log(`- Lines: ${total.lines.pct}%`);

  // Check if any metric is below the required threshold
  const failedMetrics = [];

  if (total.statements.pct < COVERAGE_THRESHOLDS.statements) {
    failedMetrics.push({
      name: 'statements',
      value: total.statements.pct,
      threshold: COVERAGE_THRESHOLDS.statements,
    });
  }

  if (total.branches.pct < COVERAGE_THRESHOLDS.branches) {
    failedMetrics.push({
      name: 'branches',
      value: total.branches.pct,
      threshold: COVERAGE_THRESHOLDS.branches,
    });
  }

  if (total.functions.pct < COVERAGE_THRESHOLDS.functions) {
    failedMetrics.push({
      name: 'functions',
      value: total.functions.pct,
      threshold: COVERAGE_THRESHOLDS.functions,
    });
  }

  if (total.lines.pct < COVERAGE_THRESHOLDS.lines) {
    failedMetrics.push({
      name: 'lines',
      value: total.lines.pct,
      threshold: COVERAGE_THRESHOLDS.lines,
    });
  }

  // Show detailed file information for files that didn't meet thresholds
  if (failedMetrics.length > 0) {
    console.log('\n🔍 Files with coverage below thresholds:');

    // Check each file's coverage
    Object.entries(coverageSummary).forEach(([file, metrics]) => {
      // Skip the 'total' entry
      if (file === 'total') return;

      const fileFailures = [];

      if (metrics.statements.pct < COVERAGE_THRESHOLDS.statements) {
        fileFailures.push(`statements: ${metrics.statements.pct}%`);
      }

      if (metrics.branches.pct < COVERAGE_THRESHOLDS.branches) {
        fileFailures.push(`branches: ${metrics.branches.pct}%`);
      }

      if (metrics.functions.pct < COVERAGE_THRESHOLDS.functions) {
        fileFailures.push(`functions: ${metrics.functions.pct}%`);
      }

      if (metrics.lines.pct < COVERAGE_THRESHOLDS.lines) {
        fileFailures.push(`lines: ${metrics.lines.pct}%`);
      }

      if (fileFailures.length > 0) {
        console.log(`\n${file}:`);
        fileFailures.forEach((failure) => console.log(`  - ${failure}`));
      }
    });
  }

  // Report fail or success
  if (failedMetrics.length > 0) {
    console.error(`\n❌ Coverage requirements not met for ${failedMetrics.length} metrics:`);
    failedMetrics.forEach(({ name, value, threshold }) => {
      console.error(`- ${name}: ${value}% (need ${threshold}%)`);
    });
    process.exit(1);
  } else {
    console.log('\n✅ All coverage metrics meet or exceed their requirements!');
    process.exit(0);
  }
} catch (error) {
  console.error('❌ ERROR: Failed to parse coverage data:', error.message);
  process.exit(1);
}
