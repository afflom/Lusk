# Claude Automation Guide

This document explains how the Claude AI automation works in this repository for implementing GitHub issues automatically.

## Overview

The repository includes a GitHub Actions workflow that uses Claude AI to automatically implement solutions for issues labeled with "claude". This enables rapid development and implementation of well-defined feature requests, bug fixes, and improvements.

## How It Works

1. **Issue Creation**: A detailed issue is created following our issue templates
2. **Label Application**: A repository maintainer reviews the issue and adds the "claude" label if suitable
3. **Automated Implementation**: Once labeled, Claude AI:
   - Analyzes the issue description and requirements
   - Understands the codebase context
   - Implements a solution (code changes, documentation, etc.)
   - Creates a pull request with the implementation
   - Links the PR back to the original issue

## Issue Requirements for Claude Automation

For an issue to be successfully implemented by Claude, it should include:

1. **Clear Description**: Explain the problem or request clearly
2. **Specific Requirements**: List concrete, testable requirements
3. **Acceptance Criteria**: Provide criteria to determine when the issue is resolved
4. **Context**: Explain how the issue fits into the larger codebase
5. **Edge Cases**: Mention any edge cases that should be handled

## Example Issue Template

```markdown
## Description
[Clear, concise explanation of the feature/bug/improvement]

## Requirements
- [Requirement 1]
- [Requirement 2]
- [Requirement 3]

## Acceptance Criteria
- [ ] [Criteria 1]
- [ ] [Criteria 2]
- [ ] [All tests pass]

## Additional Context
[Any relevant background information, screenshots, code references]

## Edge Cases to Consider
- [Edge case 1]
- [Edge case 2]
```

## Usage for Contributors

If you're creating an issue that you think could be implemented by Claude:

1. Use the appropriate issue template
2. Provide clear, detailed information
3. Be specific about requirements and edge cases
4. **Do not** add the "claude" label yourself
5. Wait for a maintainer to review and potentially add the "claude" label

## For Maintainers

Only repository maintainers can add the "claude" label to trigger the automation:

1. Review incoming issues for clarity and completeness
2. Evaluate if the issue is suitable for Claude implementation
3. If appropriate, add the "claude" label
4. Monitor the resulting pull request for review

### Requirements for Enabling Automation

The repository must have the following GitHub secrets configured:

- `ANTHROPIC_API_KEY`: An API key for the Anthropic Claude API
- `GITHUB_TOKEN`: Already provided by GitHub Actions

### Workflow Configuration

The Claude automation workflow is defined in `.github/workflows/claude-automation.yml`. Maintainers can customize:

- Which labels trigger the automation
- The Claude model to use
- Branch naming conventions
- PR metadata and templates
- Notification settings

## Limitations

Claude Automation works best for:

- Well-defined, scoped features
- Bug fixes with clear reproduction steps
- Documentation improvements
- Test additions

It may not be suitable for:

- Complex architectural changes
- Performance optimizations requiring deep system knowledge
- Security-critical implementations
- Major refactoring efforts

## Troubleshooting

If the Claude automation fails to implement an issue:

1. Check the GitHub Actions logs for detailed error information
2. Consider if the issue description is clear and specific enough
3. Break down complex issues into smaller, more focused issues
4. Ensure all necessary context is provided in the issue description