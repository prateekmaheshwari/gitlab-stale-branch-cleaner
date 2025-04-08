import axios from 'axios';
import chalk from 'chalk';

export default async function runCleaner({ gitlabToken, projectId, mainBranch, staleDays, dryRun, excludedBranches = [] }) {
  const api = axios.create({
    baseURL: `https://gitlab.com/api/v4/projects/${encodeURIComponent(projectId)}`,
    headers: { 'PRIVATE-TOKEN': gitlabToken }
  });

  async function getBranches() {
    let branches = [];
    let page = 1;
    const perPage = 100;

    while (true) {
      const { data } = await api.get('/repository/branches', {
        params: { per_page: perPage, page },
      });
      branches = branches.concat(data);
      if (data.length < perPage) break;
      page++;
    }

    return branches;
  }

  function isBranchStale(branch) {
    const updatedAt = new Date(branch.commit.committed_date);
    const daysSinceLastUpdate = (Date.now() - updatedAt.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceLastUpdate > Number(staleDays);
  }

  async function deleteBranch(branchName) {
    try {
      if (dryRun) {
        console.log(chalk.yellow(`🟡 [Dry Run] Would delete: ${branchName}`));
        return;
      }

      await api.delete(`/repository/branches/${encodeURIComponent(branchName)}`);
      console.log(chalk.green(`✅ Deleted branch: ${branchName}`));
    } catch (err) {
      console.error(chalk.red(`❌ Failed to delete ${branchName}:`), err.response?.data || err.message);
    }
  }

  try {
    console.log(chalk.blue('🔍 Fetching branches...'));
    const branches = await getBranches();

    const staleBranches = branches.filter(branch =>
      branch.name !== mainBranch &&
      !branch.protected &&
      isBranchStale(branch) &&
      !excludedBranches.includes(branch.name)
    );

    console.log(chalk.cyan(`🧹 Found ${staleBranches.length} stale branches.\n`));

    for (const branch of staleBranches) {
      await deleteBranch(branch.name);
    }

    const excludedBranchesSummary = `Excluded branches: ${excludedBranches.length ? excludedBranches.join(', ') : 'None'}`;
    const actionType = dryRun ? 'would be deleted' : 'deleted';
    const summary = `${dryRun ? 'Dry run' : 'Cleanup'} complete - ${staleBranches.length} branches ${actionType}.\n🚯 ${excludedBranchesSummary}`;
    console.log(chalk.greenBright(`🎉 ${summary}`));
    
  } catch (err) {
    console.error(chalk.red('🚨 Error:'), err.message);
  }
}
