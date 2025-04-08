# GitLab Stale Branch Cleaner

A lightweight Node.js CLI tool to automatically delete stale, unmerged GitLab branches based on last commit date. Supports dry-run, branch exclusion, and secure prompts — perfect for keeping your repositories clean and organized.

## Installation

Run directly using npx:

```bash
npx gitlab-stale-branch-cleaner
```

## Features

- Deletes branches that haven't been updated in X days.
- Skips protected and main branches.
- Skips custom branch names(space-separated)
- Dry run mode to preview deletions.

## Usage

Follow the prompts after executing:

```bash
npx gitlab-stale-cleaner
```

## License

MIT
