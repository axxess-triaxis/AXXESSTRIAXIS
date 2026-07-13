# Mobile Rollback Plan

1. Revert the release tag or the Git commit that introduced the problem.
2. Re-run the relevant mobile build workflow against the prior known-good commit.
3. Re-upload the artifact to the relevant distribution channel.
4. Notify the founders and internal QA team about the rollback.
