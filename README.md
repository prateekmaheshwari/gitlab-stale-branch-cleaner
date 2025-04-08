# GitLab Stale Branch Cleaner

A Node.js CLI to delete stale branches from your GitLab projects.

## Installation

Run directly using npx:

```bash
npx gitlab-stale-cleaner
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
