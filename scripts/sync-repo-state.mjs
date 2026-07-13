#!/usr/bin/env node
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const gitDir = path.join(repoRoot, '.git');
if (!fs.existsSync(gitDir)) {
  console.log('[mobile] No .git directory found; skipping repository sync.');
  process.exit(0);
}

try {
  execSync('git fetch origin --prune', { cwd: repoRoot, stdio: 'inherit' });
  const branch = process.env.GITHUB_HEAD_REF || process.env.GITHUB_REF_NAME || process.env.BRANCH_NAME || '';
  if (branch) {
    try {
      execSync(`git checkout -B "${branch}" "origin/${branch}"`, { cwd: repoRoot, stdio: 'inherit' });
    } catch {
      execSync(`git checkout -B "${branch}"`, { cwd: repoRoot, stdio: 'inherit' });
    }
    execSync(`git pull --ff-only origin "${branch}"`, { cwd: repoRoot, stdio: 'inherit' });
  }
  console.log('[mobile] Repository state refreshed.');
} catch (error) {
  console.warn('[mobile] Repository sync skipped due to Git environment constraints:', error.message);
}
