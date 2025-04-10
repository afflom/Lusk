#!/usr/bin/env node

// Use ESM imports since package.json has "type": "module"
import { execSync } from 'child_process';
import readline from 'readline';
import https from 'https';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// ANSI color codes
const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
};

console.log(`${COLORS.blue}=== Dev Environment Deployment Tool ===${COLORS.reset}`);
console.log('This script will build and deploy your app to the dev environment.\n');

// Run tests first
try {
  console.log(`${COLORS.yellow}Running tests...${COLORS.reset}`);
  execSync('npm test', { stdio: 'inherit' });
} catch (error) {
  console.error(`${COLORS.red}Tests failed. Fix the issues before deploying.${COLORS.reset}`);
  process.exit(1);
}

// Check for GitHub token
let githubToken = process.env.GITHUB_TOKEN;

// In Codespaces, try to use the GitHub CLI to get a token
if (!githubToken) {
  try {
    console.log(
      `${COLORS.yellow}GITHUB_TOKEN not found in environment, trying GitHub CLI...${COLORS.reset}`
    );
    githubToken = execSync('gh auth token', { stdio: ['pipe', 'pipe', 'ignore'] })
      .toString()
      .trim();
    console.log(`${COLORS.green}Successfully obtained token from GitHub CLI${COLORS.reset}`);
  } catch (error) {
    // When in pre-push hook context, we still need proper deployment verification
    if (process.env.GH_WORKFLOW_DISPATCH === 'true') {
      console.log(`${COLORS.yellow}Running in pre-push hook environment.${COLORS.reset}`);
      console.log(
        `${COLORS.yellow}Deployment verification is required. Attempting to continue...${COLORS.reset}`
      );

      // If we're running in pre-push hook context but don't have a token yet
      // Try some additional access methods specific to GitHub Codespaces or Actions
      try {
        // Try getting token from git config
        try {
          githubToken = execSync('git config --get github.token', {
            stdio: ['pipe', 'pipe', 'ignore'],
          })
            .toString()
            .trim();
          console.log(`${COLORS.green}Successfully obtained token from git config${COLORS.reset}`);
        } catch (configError) {
          // Check for GitHub CLI presence and try to get token
          if (process.env.CODESPACES || process.env.GITHUB_CODESPACE_TOKEN) {
            try {
              githubToken = execSync('gh auth token', { stdio: ['pipe', 'pipe', 'ignore'] })
                .toString()
                .trim();
              console.log(
                `${COLORS.green}Successfully obtained token from GitHub CLI in Codespace${COLORS.reset}`
              );
            } catch (ghError) {
              // Try one more method for GitHub Actions
              if (process.env.GITHUB_TOKEN) {
                githubToken = process.env.GITHUB_TOKEN;
                console.log(`${COLORS.green}Using GITHUB_TOKEN from environment${COLORS.reset}`);
              } else {
                throw new Error('All authentication methods failed');
              }
            }
          } else {
            throw new Error('No GitHub token available and not in a Codespace');
          }
        }
      } catch (error) {
        console.error(`${COLORS.red}Error: Unable to obtain GitHub token.${COLORS.reset}`);
        console.log('To deploy to dev environment:');
        console.log(
          '1. Create a personal access token with "workflow" scope at https://github.com/settings/tokens'
        );
        console.log(
          '2. Export it as GITHUB_TOKEN in your shell: export GITHUB_TOKEN=your_token_here'
        );
        console.log('   Or save it to git config: git config github.token your_token_here');
        console.log('   Or run "gh auth login" if using GitHub CLI');
        process.exit(1);
      }
    } else {
      console.error(`${COLORS.red}Error: Unable to obtain GitHub token.${COLORS.reset}`);
      console.log('To deploy to dev environment:');
      console.log(
        '1. Create a personal access token with "workflow" scope at https://github.com/settings/tokens'
      );
      console.log(
        '2. Export it as GITHUB_TOKEN in your shell: export GITHUB_TOKEN=your_token_here'
      );
      process.exit(1);
    }
  }
}

// Get repo details
let repoPath;
try {
  const remoteUrl = execSync('git remote get-url origin').toString().trim();

  if (remoteUrl.startsWith('https://github.com/')) {
    repoPath = remoteUrl.replace('https://github.com/', '').replace('.git', '');
  } else if (remoteUrl.startsWith('git@github.com:')) {
    repoPath = remoteUrl.replace('git@github.com:', '').replace('.git', '');
  } else {
    throw new Error('Unsupported git remote format');
  }
} catch (error) {
  console.error(`${COLORS.red}Error: Failed to get repository information.${COLORS.reset}`);
  console.error(error.message);
  process.exit(1);
}

// Check if running in non-interactive mode
const nonInteractive = process.argv.includes('--no-interactive');

const deployApp = () => {
  // Get current branch
  const currentBranch = execSync('git symbolic-ref --short HEAD').toString().trim();

  console.log(
    `${COLORS.green}Triggering deployment to dev environment from branch ${currentBranch}...${COLORS.reset}`
  );

  // Prepare the request data
  const data = JSON.stringify({
    ref: currentBranch,
    inputs: {
      environment: 'dev',
    },
  });

  // Setup the request options
  const options = {
    hostname: 'api.github.com',
    path: `/repos/${repoPath}/actions/workflows/deploy.yml/dispatches`,
    method: 'POST',
    headers: {
      Accept: 'application/vnd.github.v3+json',
      Authorization: `token ${githubToken}`,
      'User-Agent': 'Node.js',
      'Content-Type': 'application/json',
      'Content-Length': data.length,
    },
  };

  return new Promise((resolve, reject) => {
    // Send the request
    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 204) {
          console.log(`${COLORS.green}Deployment triggered successfully!${COLORS.reset}`);
          console.log(
            `${COLORS.blue}Check your GitHub Actions workflow status at: https://github.com/${repoPath}/actions${COLORS.reset}`
          );
          console.log(
            `${COLORS.blue}Your app will be available at: https://<username>.github.io/${repoPath.split('/')[1]}/dev${COLORS.reset}`
          );

          // Wait for workflow to complete if in non-interactive mode
          if (nonInteractive) {
            checkWorkflowStatus(repoPath, githubToken, resolve, reject);
          } else {
            resolve(true);
          }
        } else {
          const errorMessage = `Error: Received status code ${res.statusCode}. Response: ${responseData}`;
          console.error(`${COLORS.red}${errorMessage}${COLORS.reset}`);
          reject(new Error(errorMessage));
        }
      });
    });

    req.on('error', (error) => {
      console.error(`${COLORS.red}Error: ${error.message}${COLORS.reset}`);
      reject(error);
    });

    req.write(data);
    req.end();
  });
};

// Function to check workflow status
const checkWorkflowStatus = (repoPath, githubToken, resolve, reject) => {
  console.log(`${COLORS.yellow}Waiting for workflow to complete...${COLORS.reset}`);

  // Sleep briefly to allow GitHub API to register the workflow
  setTimeout(() => {
    let maxTries = 30;
    let tries = 0;

    const checkStatus = () => {
      tries++;

      // Get the latest run ID for the workflow
      try {
        const runsResponse = execSync(
          `curl -s -H "Accept: application/vnd.github.v3+json" -H "Authorization: token ${githubToken}" "https://api.github.com/repos/${repoPath}/actions/workflows/deploy.yml/runs?per_page=1"`
        ).toString();
        const runsData = JSON.parse(runsResponse);

        if (!runsData.workflow_runs || runsData.workflow_runs.length === 0) {
          if (tries >= maxTries) {
            const errorMessage = 'Timed out waiting for workflow to start';
            console.error(`${COLORS.red}ERROR: ${errorMessage}${COLORS.reset}`);
            reject(new Error(errorMessage));
            return;
          }

          console.log(
            `${COLORS.yellow}Waiting for workflow to start... (${tries}/${maxTries})${COLORS.reset}`
          );
          setTimeout(checkStatus, 5000);
          return;
        }

        const runId = runsData.workflow_runs[0].id;
        const status = runsData.workflow_runs[0].status;
        const conclusion = runsData.workflow_runs[0].conclusion;

        console.log(
          `${COLORS.blue}Deployment status: ${status} (${tries}/${maxTries})${COLORS.reset}`
        );

        if (status === 'completed') {
          if (conclusion === 'success') {
            console.log(`${COLORS.green}Dev deployment completed successfully.${COLORS.reset}`);
            resolve(true);
          } else {
            const errorMessage = `Dev deployment failed with conclusion: ${conclusion}`;
            console.error(`${COLORS.red}ERROR: ${errorMessage}${COLORS.reset}`);
            console.error(
              `${COLORS.red}Check GitHub Actions for more details: https://github.com/${repoPath}/actions${COLORS.reset}`
            );
            reject(new Error(errorMessage));
          }
          return;
        }

        if (status === 'failure' || status === 'cancelled') {
          const errorMessage = `Dev deployment failed with status: ${status}`;
          console.error(`${COLORS.red}ERROR: ${errorMessage}${COLORS.reset}`);
          console.error(
            `${COLORS.red}Check GitHub Actions for more details: https://github.com/${repoPath}/actions${COLORS.reset}`
          );
          reject(new Error(errorMessage));
          return;
        }

        if (tries >= maxTries) {
          const errorMessage = 'Timed out waiting for workflow to complete';
          console.error(`${COLORS.red}ERROR: ${errorMessage}${COLORS.reset}`);
          console.error(
            `${COLORS.red}Check GitHub Actions for current status: https://github.com/${repoPath}/actions${COLORS.reset}`
          );
          reject(new Error(errorMessage));
          return;
        }

        // Continue checking
        setTimeout(checkStatus, 10000);
      } catch (error) {
        console.error(
          `${COLORS.red}Error checking workflow status: ${error.message}${COLORS.reset}`
        );
        if (tries >= maxTries) {
          reject(error);
        } else {
          setTimeout(checkStatus, 10000);
        }
      }
    };

    checkStatus();
  }, 5000);
};

// Run the deployment based on the mode
if (nonInteractive) {
  deployApp()
    .then(() => {
      console.log(`${COLORS.blue}=== Deployment script completed successfully ===${COLORS.reset}`);
      process.exit(0);
    })
    .catch((error) => {
      console.error(`${COLORS.red}=== Deployment failed: ${error.message} ===${COLORS.reset}`);
      process.exit(1);
    });
} else {
  rl.question(
    `${COLORS.yellow}Do you want to deploy to the dev environment? (y/n) ${COLORS.reset}`,
    (answer) => {
      if (answer.toLowerCase() !== 'y') {
        console.log('Deployment canceled.');
        rl.close();
        return;
      }

      deployApp()
        .then(() => {
          rl.close();
        })
        .catch((error) => {
          console.error(`${COLORS.red}=== Deployment failed: ${error.message} ===${COLORS.reset}`);
          rl.close();
          process.exit(1);
        });
    }
  );

  rl.on('close', () => {
    console.log(`${COLORS.blue}=== Deployment script completed ===${COLORS.reset}`);
  });
}
