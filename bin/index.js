#!/usr/bin/env node

import inquirer from "inquirer";
import { Command } from "commander";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import runCleaner from "../lib/cleaner.js";

/**
 * Resolve package.json (ESM-safe)
 */
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const pkg = JSON.parse(
  readFileSync(join(__dirname, "../package.json"), "utf-8")
);

const program = new Command();

/**
 * CLI definition
 */
program
  .name("gitlab-stale-branch-cleaner")
  .description(
    "Safely delete stale GitLab branches with dry-run support.\n" +
    "Designed for CI automation and repository hygiene."
  )
  .version(pkg.version)
  .option("--project-id <id>", "GitLab project ID")
  .option("--token <token>", "GitLab personal access token (scope: api)")
  .option(
    "--stale-days <number>",
    "Delete branches inactive for N days (default: 90)",
    (value) => {
      const parsed = Number(value);
      if (!Number.isInteger(parsed) || parsed <= 0) {
        throw new Error("--stale-days must be a positive integer");
      }
      return parsed;
    },
    90
  )
  .option(
    "--exclude <names>",
    "Comma-separated branch names to exclude (e.g. main,develop,release)",
    (value) => value.split(",").map(v => v.trim())
  )
  .option(
    "--main-branch <name>",
    "Main branch name (default: main)",
    "main"
  )
  .option(
    "--dry-run",
    "Preview deletions without deleting (default: true)",
    true
  )
  .addHelpText(
    "after",
    `
EXAMPLES:

  Dry run (recommended first):
    npx gitlab-stale-branch-cleaner \\
      --project-id 12345 \\
      --token $GITLAB_TOKEN \\
      --dry-run

  Actual deletion:
    npx gitlab-stale-branch-cleaner \\
      --project-id 12345 \\
      --token $GITLAB_TOKEN \\
      --stale-days 90 \\
      --dry-run=false
`
  )
  .configureHelp({
    sortSubcommands: false,
    sortOptions: false,
  });

program.parse(process.argv);

const options = program.opts();

/**
 * Interactive fallback (if required options missing)
 */
async function promptForMissingOptions() {
  const questions = [];

  if (!options.token) {
    questions.push({
      type: "password",
      mask: "*",
      name: "token",
      message: "GitLab Personal Access Token:",
      validate: input => input ? true : "Token is required",
    });
  }

  if (!options.projectId) {
    questions.push({
      name: "projectId",
      message: "GitLab Project ID:",
      validate: input => input ? true : "Project ID is required",
    });
  }

  if (!options.mainBranch) {
    questions.push({
      name: "mainBranch",
      message: "Main Branch Name:",
      default: "main",
    });
  }

  if (!options.staleDays) {
    questions.push({
      name: "staleDays",
      message: "Days to consider a branch stale:",
      default: 90,
      validate: input =>
        !isNaN(input) && Number(input) > 0
          ? true
          : "Enter a valid number",
    });
  }

  if (!options.exclude) {
    questions.push({
      name: "exclude",
      message: "Branches to exclude (space-separated):",
      filter: input => input.trim().split(/\s+/),
    });
  }

  if (typeof options.dryRun !== "boolean") {
    questions.push({
      type: "confirm",
      name: "dryRun",
      message: "Dry run (only preview deletions)?",
      default: true,
    });
  }

  return questions.length ? inquirer.prompt(questions) : {};
}

(async function run() {
  try {
    const interactiveInput = await promptForMissingOptions();

    const finalInput = {
      gitlabToken: options.token ?? interactiveInput.token,
      projectId: options.projectId ?? interactiveInput.projectId,
      mainBranch: options.mainBranch ?? interactiveInput.mainBranch ?? "main",
      staleDays: options.staleDays ?? interactiveInput.staleDays ?? 90,
      excludedBranches:
        options.exclude ?? interactiveInput.exclude ?? [],
      dryRun:
        typeof options.dryRun === "boolean"
          ? options.dryRun
          : interactiveInput.dryRun ?? true,
    };

    /**
     * Final safety validation
     */
    if (!finalInput.gitlabToken || !finalInput.projectId) {
      console.error(
        "ERROR: --project-id and --token are required (flag or interactive)."
      );
      process.exit(1);
    }

    await runCleaner(finalInput);
    process.exit(0);

  } catch (err) {
    console.error("ERROR:", err.message);
    process.exit(2);
  }
})();
