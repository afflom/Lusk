#!/usr/bin/env node

/**
 * Script to trigger and validate GitHub Actions workflows remotely
 * Requires GITHUB_TOKEN environment variable to be set
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// Configuration
const TIMEOUT_MS = 60 * 5 * 1000; // 5 minutes
const POLLING_INTERVAL_MS = 10 * 1000; // 10 seconds
const GITHUB_API_URL = 'https://api.github.com';

// Check if GITHUB_TOKEN is available
if (!process.env.GITHUB_TOKEN) {
  console.error('❌ ERROR: GITHUB_TOKEN environment variable is required.');
  console.error('   Set it using: export GITHUB_TOKEN=your_github_token');
  process.exit(1);
}

// Get repository information
let repoOwner, repoName;
try {
  const remoteUrl = execSync('git remote get-url origin', { encoding: 'utf8' }).trim();
  const match = remoteUrl.match(/github\.com[/:]([\w.-]+)\/([\w.-]+)(?:\.git)?$/);
  if (match) {
    [, repoOwner, repoName] = match;

    // Handle .git extension
    if (repoName.endsWith('.git')) {
      repoName = repoName.slice(0, -4);
    }
  } else {
    throw new Error('Could not parse GitHub repository from remote URL');
  }
} catch (error) {
  console.error('❌ ERROR: Failed to get repository information:', error.message);
  process.exit(1);
}

// Get current branch
let currentBranch;
try {
  currentBranch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
} catch (error) {
  console.error('❌ ERROR: Failed to get current branch:', error.message);
  process.exit(1);
}

console.log(`Repository: ${repoOwner}/${repoName}`);
console.log(`Branch: ${currentBranch}`);

// Get workflows from the repository
function getWorkflows() {
  try {
    const workflowsDir = path.join(process.cwd(), '.github', 'workflows');
    if (!fs.existsSync(workflowsDir)) {
      console.error('❌ ERROR: No workflow directory found (.github/workflows)');
      process.exit(1);
    }

    const files = fs
      .readdirSync(workflowsDir)
      .filter((file) => file.endsWith('.yml') || file.endsWith('.yaml'))
      .map((file) => path.join(workflowsDir, file));

    if (files.length === 0) {
      console.error('❌ ERROR: No workflow files found in .github/workflows');
      process.exit(1);
    }

    return files;
  } catch (error) {
    console.error('❌ ERROR: Failed to read workflow files:', error.message);
    process.exit(1);
  }
}

// Make GitHub API request
async function makeGitHubRequest(endpoint, method = 'GET', data = null) {
  const url = `${GITHUB_API_URL}${endpoint}`;
  const options = {
    method,
    headers: {
      Authorization: `token ${process.env.GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  };

  if (data) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `API request failed: ${response.status} ${response.statusText} - ${errorText}`
      );
    }
    return await response.json();
  } catch (error) {
    console.error(`❌ ERROR: GitHub API request failed (${url}):`, error.message);
    throw error;
  }
}

// Trigger workflow run
async function triggerWorkflow(workflowId, branch = currentBranch) {
  try {
    const endpoint = `/repos/${repoOwner}/${repoName}/actions/workflows/${workflowId}/dispatches`;
    await makeGitHubRequest(endpoint, 'POST', { ref: branch });
    console.log(`✅ Triggered workflow ${workflowId} on branch ${branch}`);
    return true;
  } catch (error) {
    console.error(`❌ ERROR: Failed to trigger workflow ${workflowId}:`, error.message);
    return false;
  }
}

// Get workflow runs
async function getWorkflowRuns(workflowId, branch = currentBranch) {
  try {
    const endpoint = `/repos/${repoOwner}/${repoName}/actions/workflows/${workflowId}/runs?branch=${branch}&per_page=5`;
    const data = await makeGitHubRequest(endpoint);
    return data.workflow_runs || [];
  } catch (error) {
    console.error(`❌ ERROR: Failed to get workflow runs for ${workflowId}:`, error.message);
    return [];
  }
}

// Wait for workflow to complete
async function waitForWorkflowCompletion(workflowId, initialRuns, branch = currentBranch) {
  console.log(`⏳ Waiting for workflow ${workflowId} to complete...`);

  const startTime = Date.now();
  const initialRunIds = initialRuns.map((run) => run.id);

  while (Date.now() - startTime < TIMEOUT_MS) {
    const runs = await getWorkflowRuns(workflowId, branch);

    // Find the newest run that wasn't in the initial list
    const newRuns = runs.filter((run) => !initialRunIds.includes(run.id));

    if (newRuns.length > 0) {
      const latestRun = newRuns[0]; // Runs are sorted by recency

      if (latestRun.status === 'completed') {
        console.log(`✅ Workflow ${workflowId} completed with conclusion: ${latestRun.conclusion}`);
        return {
          success: latestRun.conclusion === 'success',
          run: latestRun,
        };
      } else {
        console.log(`⏳ Workflow ${workflowId} is still running (status: ${latestRun.status})...`);
      }
    } else {
      console.log(`⏳ Waiting for workflow ${workflowId} to start...`);
    }

    // Wait before polling again
    await new Promise((resolve) => setTimeout(resolve, POLLING_INTERVAL_MS));
  }

  console.error(`❌ ERROR: Timed out waiting for workflow ${workflowId} to complete`);
  return { success: false };
}

// Extract workflow ID from file
function getWorkflowId(filePath) {
  return path.basename(filePath);
}

// Main function
async function main() {
  const workflowFiles = getWorkflows();
  console.log(`Found ${workflowFiles.length} workflow files`);

  // Process deploy.yml first if it exists
  const deployWorkflow = workflowFiles.find((file) => path.basename(file) === 'deploy.yml');
  const otherWorkflows = workflowFiles.filter((file) => path.basename(file) !== 'deploy.yml');
  const orderedWorkflows = deployWorkflow ? [deployWorkflow, ...otherWorkflows] : workflowFiles;

  let allSucceeded = true;

  for (const workflowFile of orderedWorkflows) {
    const workflowId = getWorkflowId(workflowFile);
    console.log(`\nTesting workflow: ${workflowId}`);

    // Get current runs before triggering
    const initialRuns = await getWorkflowRuns(workflowId);

    // Trigger the workflow
    const triggered = await triggerWorkflow(workflowId);

    if (triggered) {
      // Wait for completion
      const result = await waitForWorkflowCompletion(workflowId, initialRuns);

      if (!result.success) {
        allSucceeded = false;
        console.error(`❌ Workflow ${workflowId} failed`);
        if (result.run && result.run.html_url) {
          console.error(`   See details: ${result.run.html_url}`);
        }
      }
    } else {
      allSucceeded = false;
    }
  }

  if (allSucceeded) {
    console.log('\n✅ All workflows completed successfully!');
    process.exit(0);
  } else {
    console.error('\n❌ One or more workflows failed.');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});
