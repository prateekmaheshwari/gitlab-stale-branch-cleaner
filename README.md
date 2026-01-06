# GitLab Stale Branch Cleaner

![npm](https://img.shields.io/npm/v/gitlab-stale-branch-cleaner)
![downloads](https://img.shields.io/npm/dm/gitlab-stale-branch-cleaner)
![license](https://img.shields.io/github/license/prateekmaheshwari/gitlab-stale-branch-cleaner)

Safely clean up **stale, unmerged GitLab branches** using a configurable CLI with **dry-run support**.  
Built for engineering teams that want **repository hygiene without accidental deletions**.

---

## Why this exists

Over time, GitLab repositories accumulate:

- Old feature branches
- Abandoned experiments
- Forgotten WIP branches

These lead to:
- Slower navigation
- Higher cognitive load
- Maintenance and ownership risk

**GitLab Stale Branch Cleaner** automates this cleanup in a **safe, predictable, and CI-friendly** way.

---

## Key Features

- **Dry-run mode** (preview before deleting)
- **Configurable stale threshold** (e.g. 30 / 60 / 90 days)
- **Protected & custom branch exclusions**
- Targets only **stale, inactive branches**
- **GitLab CI ready** (ideal for scheduled jobs)
- Simple CLI — no dashboards, no lock-in

---

## Installation


No global install required. Run directly using npx:

```bash
npx gitlab-stale-branch-cleaner
```

Or install globally:

```bash
npm install -g gitlab-stale-branch-cleaner
```
---

# Prerequisites

You will need:

- GitLab Project ID

- GitLab Personal Access Token

    - Required scope: ```api```

Recommended: set token as an environment variable

```bash
export GITLAB_TOKEN=your_token_here
```
---

## Usage

### Dry-run (recommended first)

```bash
npx gitlab-stale-branch-cleaner \
  --project-id 123456 \
  --token $GITLAB_TOKEN \
  --stale-days 60 \
  --dry-run
```

Example output:

```bash
[DRY RUN] Found 12 stale branches
[DRY RUN] Would delete: feature/login-refactor
[DRY RUN] Would delete: bugfix/old-validation
```
**Nothing is deleted in dry-run mode.**

### Actual deletion

```bash
npx gitlab-stale-branch-cleaner \
  --project-id 123456 \
  --token $GITLAB_TOKEN \
  --stale-days 60 \
  --dry-run=false
```

**CLI Options**
| Option         | Description                                        | Required |
| -------------- | -------------------------------------------------- | -------- |
| `--project-id` | GitLab project ID                                  | ✅        |
| `--token`      | GitLab API token                                   | ✅        |
| `--stale-days` | Inactivity threshold in days (default: 60)         | ❌        |
| `--dry-run`    | Preview deletions without deleting (default: true) | ❌        |
| `--exclude`    | Comma-separated branch names to exclude            | ❌        |

Example:

```bash
--exclude main,develop,release
```

### GitLab CI Integration (Recommended)

Run branch cleanup automatically on a schedule:

```bash
cleanup_stale_branches:
  image: node:18
  stage: cleanup
  script:
    - npx gitlab-stale-branch-cleaner \
        --project-id $CI_PROJECT_ID \
        --token $GITLAB_TOKEN \
        --stale-days 60 \
        --dry-run=false
  rules:
    - if: '$CI_PIPELINE_SOURCE == "schedule"'
```

**Best practice**

Run initially with --dry-run=true, review output, then enable deletion.

---

# Safety Guarantees

This tool **will not**:

- Delete protected branches

- Delete recently updated branches

- Delete anything unless --dry-run=false is explicitly set

Designed to be **boring, predictable, and safe**.

---

# When should you use this?

- Medium to large GitLab repositories

- Teams with frequent feature branching

- CI-driven repo maintenance

- Engineering teams that value automation & hygiene

---

# Contributing

Issues, suggestions, and PRs are welcome.

If something feels unsafe or unclear, please open an issue — safety comes first.

If this tool saved you time, consider ⭐ starring the repository.

---

## License

MIT
