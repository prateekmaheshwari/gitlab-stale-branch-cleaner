#!/usr/bin/env node

import inquirer from 'inquirer';
import runCleaner from '../lib/cleaner.js';

const questions = [
  {
    type: 'password',
    mask: '*',
    name: 'gitlabToken',
    message: 'GitLab Personal Access Token:',
    validate: input => input ? true : 'Token is required',
  },
  {
    name: 'projectId',
    message: 'GitLab Project ID:',
    validate: input => input ? true : 'Project ID is required',
  },
  {
    name: 'mainBranch',
    message: 'Main Branch Name:',
    default: 'main',
  },
  {
    name: 'staleDays',
    message: 'Days to consider a branch stale:',
    default: 90,
    validate: input => !isNaN(input) && Number(input) > 0 ? true : 'Enter a valid number',
  },
  {
    name: 'excludedBranches',
    message: 'Branches to exclude (space-separated):',
    filter: input => input.trim().split(/\s+/)
  },
  {
    type: 'confirm',
    name: 'dryRun',
    message: 'Dry run (only preview deletions)?',
    default: true,
  }
];

const userInput = await inquirer.prompt(questions);

await runCleaner(userInput);
