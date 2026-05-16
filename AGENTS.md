<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Planning And Walkthroughs

- Keep implementation plans in the `plans/` folder. Do not move completed plans out of that folder.
- After implementing a plan, create a matching walkthrough document in the `walkthrough/` folder.
- Name the walkthrough file after the original plan file. For example, `plans/secure-shopping-list-app-plan.md` should produce `walkthrough/secure-shopping-list-app-plan.md`.
- Each walkthrough should document what was implemented, important lessons learned, verification results, and what remains to be done.

## CI And Lockfile Notes

- GitHub Actions uses Node 22 with npm 10.9.7. When `package-lock.json` changes, verify it with `npx --yes npm@10.9.7 ci`, not only the locally installed npm version.
- If CI fails at `npm ci` with missing `esbuild@0.28.0` or `@esbuild/*@0.28.0` entries, regenerate the lockfile with `npx --yes npm@10.9.7 install --package-lock-only` and rerun `npx --yes npm@10.9.7 ci`.
