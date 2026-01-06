import axios from "axios";
import chalk from "chalk";

/**
 * Classify GitLab API errors into human-readable messages
 */
function formatGitLabError(err) {
  if (!err.response) {
    return {
      type: "network",
      message: "Network error while communicating with GitLab.",
      action: "Check internet connectivity or GitLab availability.",
    };
  }

  const { status, data } = err.response;

  switch (status) {
    case 401:
      return {
        type: "auth",
        message: "Unauthorized: Invalid GitLab API token.",
        action: "Verify that the token is correct and not expired.",
      };
    case 403:
      return {
        type: "permission",
        message: "Forbidden: Insufficient permissions.",
        action: "Ensure the token has 'api' scope and project access.",
      };
    case 404:
      return {
        type: "not_found",
        message: "Project not found.",
        action: "Verify the GitLab Project ID.",
      };
    case 429:
      return {
        type: "rate_limit",
        message: "Rate limit exceeded by GitLab API.",
        action: "Retry later or reduce request frequency.",
      };
    default:
      return {
        type: "unknown",
        message: `GitLab API error (${status}).`,
        action: data?.message || "Inspect GitLab API response.",
      };
  }
}

/**
 * Main cleaner function
 */
export default async function runCleaner({
  gitlabToken,
  projectId,
  mainBranch,
  staleDays,
  dryRun,
  excludedBranches = [],
  json = false,
}) {
  const api = axios.create({
    baseURL: `https://gitlab.com/api/v4/projects/${encodeURIComponent(
      projectId
    )}`,
    headers: { "PRIVATE-TOKEN": gitlabToken },
    timeout: 15000,
  });

  const result = {
    projectId,
    dryRun,
    branchesScanned: 0,
    branchesEligible: 0,
    branchesDeleted: 0,
    branchesFailed: 0,
    failedBranches: [],
    excludedBranches,
    success: true,
  };

  let deletedCount = 0;
  let failedCount = 0;

  async function getBranches() {
    let branches = [];
    let page = 1;
    const perPage = 100;

    try {
      while (true) {
        const { data } = await api.get("/repository/branches", {
          params: { per_page: perPage, page },
        });

        branches = branches.concat(data);
        if (data.length < perPage) break;
        page++;
      }
    } catch (err) {
      const error = formatGitLabError(err);
      if (!json) {
        console.error(chalk.red(`❌ ${error.message}`));
        console.error(chalk.yellow(`👉 ${error.action}`));
      }
      throw new Error("Failed to fetch branches from GitLab.");
    }

    return branches;
  }

  function isBranchStale(branch) {
    const updatedAt = new Date(branch.commit.committed_date);
    const daysSinceLastUpdate =
      (Date.now() - updatedAt.getTime()) / (1000 * 60 * 60 * 24);

    return daysSinceLastUpdate > Number(staleDays);
  }

  async function deleteBranch(branchName) {
    if (dryRun) {
      if (!json) {
        console.log(chalk.yellow(`🟡 [Dry Run] Would delete: ${branchName}`));
      }
      return;
    }

    try {
      await api.delete(
        `/repository/branches/${encodeURIComponent(branchName)}`
      );
      deletedCount++;
      result.branchesDeleted++;
      if (!json) {
        console.log(chalk.green(`✅ Deleted branch: ${branchName}`));
      }
    } catch (err) {
      failedCount++;
      result.branchesFailed++;
      result.failedBranches.push(branchName);
      result.success = false;

      if (!json) {
        const error = formatGitLabError(err);
        console.error(
          chalk.red(`❌ Failed to delete '${branchName}': ${error.message}`)
        );
      }
    }
  }

  try {
    if (!json) {
      console.log(chalk.blue("🔍 Fetching branches from GitLab..."));
    }

    const branches = await getBranches();
    result.branchesScanned = branches.length;

    const staleBranches = branches.filter(
      (branch) =>
        branch.name !== mainBranch &&
        !branch.protected &&
        isBranchStale(branch) &&
        !excludedBranches.includes(branch.name)
    );

    result.branchesEligible = staleBranches.length;

    if (!json) {
      console.log(
        chalk.cyan(`🧹 Found ${staleBranches.length} stale branches.\n`)
      );
    }

    for (const branch of staleBranches) {
      await deleteBranch(branch.name);
    }

    if (!json) {
      console.log("\n" + chalk.greenBright("📊 Summary"));
      console.log(
        chalk.green(`✔ Branches eligible: ${staleBranches.length}`)
      );
      console.log(
        chalk.green(
          `✔ Branches ${dryRun ? "previewed" : "deleted"}: ${deletedCount}`
        )
      );

      if (failedCount > 0) {
        console.log(chalk.red(`✖ Failed deletions: ${failedCount}`));
      }

      const excludedSummary = excludedBranches.length
        ? excludedBranches.join(", ")
        : "None";

      console.log(chalk.gray(`🚯 Excluded branches: ${excludedSummary}`));
    }

    if (json) {
      console.log(JSON.stringify(result, null, 2));
    }

    if (failedCount > 0) {
      process.exit(2);
    }
  } catch (err) {
    result.success = false;

    if (json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.error(chalk.red("🚨 Cleanup aborted."));
      console.error(chalk.red(err.message));
    }

    process.exit(2);
  }
}
