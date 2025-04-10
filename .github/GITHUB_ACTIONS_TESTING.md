# GitHub Actions Workflow Testing

This project uses [Act](https://github.com/nektos/act) to test GitHub Actions workflows locally before pushing changes to the remote repository. This helps prevent CI failures and ensures your code will deploy correctly.

## How Act Integration Works

Act allows you to run GitHub Actions workflows locally by simulating the GitHub Actions environment. Our setup:

1. **Automatically tests workflows before push**: The pre-push hook validates GitHub Actions workflows using Act
2. **Prevents pushing code that would fail in CI**: If workflows fail locally, the push is prevented
3. **Guarantees deployment readiness**: Ensures your code will build and deploy correctly in GitHub Actions

## Setting Up Act

Act is automatically installed when needed, but you can manually install it:

```bash
npm run setup:act
```

## Testing Workflows

### Using NPM Scripts

```bash
# Test the default workflow (deploy.yml)
npm run test:actions

# List all available workflows
npm run test:actions:list

# Run a complete validation suite (tests and GitHub Actions)
npm run test:ci
```

### Using the Script Directly

For more control, you can use the script directly:

```bash
# Run a specific workflow
bash scripts/run-act.sh --workflow workflow-name.yml

# Get help with script options
bash scripts/run-act.sh --help
```

## Act in the Pre-Push Hook

The pre-push Git hook automatically runs Act to validate workflows before allowing code to be pushed:

1. First runs code quality checks (typecheck, lint, format)
2. Runs unit and integration tests
3. **Validates GitHub Actions workflows with Act**
4. Ensures the app builds correctly
5. Only allows the push if all checks pass

You can bypass these checks in development with:

```bash
git push --no-verify
```

## Troubleshooting Act

If you encounter issues with Act:

1. **Missing Docker**: Act requires Docker to run. Ensure Docker is installed and running
2. **Resource limitations**: Consider using `--container-architecture linux/amd64` if running on ARM
3. **Workflow secrets**: For workflows requiring secrets, create a `.secrets` file in the root directory

## CI/CD Pipeline Protection

This setup protects the CI/CD pipeline by:

1. **Early detection**: Finding issues before they reach GitHub
2. **Preventing failed deployments**: Ensuring code will deploy successfully
3. **Maintaining deployment stability**: Only allowing pushes with working workflows