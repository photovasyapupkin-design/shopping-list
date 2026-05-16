# CODEOWNERS Branch Protection Plan

## Summary

Strengthen the repository's `main` branch protection by requiring CODEOWNERS review before pull requests can merge.

## Key Changes

- Add `.github/CODEOWNERS` so all repository paths have a default maintainer owner.
- Update `.github/rulesets/protect-main.json` to require CODEOWNER review on protected-branch pull requests.
- Keep the existing ruleset behavior for required pull requests, one approval, stale-review dismissal, latest-push approval, resolved review threads, required CI status checks, branch deletion protection, force-push protection, and linear history.

## Verification Plan

- Validate the ruleset JSON parses successfully.
- Review the CODEOWNERS syntax.
- Confirm the ruleset import flow still targets the default branch.

## Follow-Up

- If `photovasyapupkin-design` is an organization, replace the CODEOWNERS owner with a concrete user or team that has write access, such as `@photovasyapupkin-design/maintainers`.
