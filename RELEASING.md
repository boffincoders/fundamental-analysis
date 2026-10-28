# Releasing 1.3.0 (rename to `fundamental-analysis`)

Follow the steps in order. Run every command from the repository root
(`/Users/boffincoders/Manoj/Projects/finance-calculator`) unless a step says
otherwise. Don't skip the "Check" line: if a check fails, stop and read
[If something goes wrong](#if-something-goes-wrong).

**Why the GitHub rename comes before the push:** the docs site is built for
the path `/fundamental-analysis/`, and package.json points at the new
repository URL. If you push first, the Pages workflow deploys to the old path
with broken asset links, and the npm page links to a repository that doesn't
exist yet.

**Before you start:** the current git remote URL has a GitHub access token
written into it. Revoke that token on GitHub (Settings → Developer settings →
Personal access tokens) and sign in with `gh auth login` or SSH instead.

---

## 1. Confirm you are logged in to npm as `boffincoders`

```bash
npm whoami
```
- **What this does:** shows which npm account will publish.
- **Check:** it prints `boffincoders`. If not, run `npm login` and repeat.

## 2. Confirm the new name is still free

```bash
npm view fundamental-analysis
```
- **What this does:** asks the npm registry whether `fundamental-analysis` exists.
- **Check:** it fails with `404 Not Found`. If it prints package details, **stop** — someone has taken the name.

## 3. Rename the GitHub repository

On github.com, open **boffincoders/finance-calculator → Settings → General**.
Under **Repository name**, type `fundamental-analysis`, then click **Rename**.

While you're there:
- Open **Settings → Pages** and check that **Source** is still **GitHub Actions**.
- On the repository front page, click the ⚙ next to **About** and set **Website** to `https://boffincoders.github.io/fundamental-analysis/`.

- **What this does:** renames the repository. GitHub redirects the old repository URL; it does **not** redirect the old docs URL.
- **Check:** `https://github.com/boffincoders/fundamental-analysis` opens the repository.

## 4. Point your local git remote at the new repository name

```bash
git remote set-url Finance_Calculator "$(git remote get-url Finance_Calculator | sed 's#/finance-calculator\.git#/fundamental-analysis.git#')"
```
- **What this does:** changes only the repository name in the remote URL and keeps whatever authentication the URL already uses, without printing it. If you revoked the embedded token, run `git remote set-url Finance_Calculator https://github.com/boffincoders/fundamental-analysis.git` instead and sign in with `gh auth login`.
- **Check:** `git ls-remote Finance_Calculator HEAD` prints a commit hash and no error.

## 5. Merge the release branch into master

```bash
git checkout master && git merge --ff-only fix/correctness-1.3.0
```
- **What this does:** moves `master` to the release commits. `--ff-only` refuses if master has changed since the branch was made.
- **Check:** `git log --oneline -1` shows the newest release commit, and `git status` says the working tree is clean.

## 6. Clean install, build and test

```bash
npm ci && npm test && npm run build && npm pack --dry-run
```
- **What this does:** installs exact dependencies, runs the test suite, builds `dist/`, and lists what would be published.
- **Check:** `317 passed`, three `Build success` lines, and the pack list shows `fundamental-analysis@1.3.0` with 8 files: CHANGELOG.md, LICENSE, README.md, package.json and four `dist/` files.

## 7. Push master and the tag

```bash
git push Finance_Calculator master && git tag v1.3.0 && git push Finance_Calculator v1.3.0
```
- **What this does:** publishes the code to GitHub. The push to `master` starts the "Deploy Docs site to Pages" workflow.
- **Check:** both pushes finish without errors, and the tag appears under **Releases/Tags** on GitHub.

## 8. Confirm the docs deployed, then open the new URL

```bash
gh run list --workflow "Deploy Docs site to Pages" --limit 1
```
- **What this does:** shows the latest docs deployment. If it isn't listed or it failed, start it again with `gh workflow run "Deploy Docs site to Pages"` and repeat this step after a minute.
- **Check:** the status is `completed` / `success`, and https://boffincoders.github.io/fundamental-analysis/ loads the docs. Also open a deep link such as `/fundamental-analysis/metrics/peg/`.

## 9. Publish `fundamental-analysis@1.3.0`

```bash
npm publish
```
- **What this does:** publishes the new package. If your account uses two-factor authentication, add `--otp=<6-digit code>`.
- **Check:** `npm view fundamental-analysis version` prints `1.3.0`.

## 10. Publish the same fixed code as `finance-calculator-pro@1.3.0`

```bash
npm pkg set name=finance-calculator-pro && npm publish; git checkout -- package.json && git status --short
```
- **What this does:** temporarily renames the package, publishes it under the old name so users still on `finance-calculator-pro` get the corrected numbers, then restores `package.json` whether or not the publish succeeded. Add `--otp=<code>` after `npm publish` if needed.
- **Check:** `npm view finance-calculator-pro version` prints `1.3.0`, and `git status --short` prints nothing (the repository is clean).

## 11. Deprecate the old name

```bash
npm deprecate finance-calculator-pro "Renamed to fundamental-analysis. Install: npm i fundamental-analysis"
```
- **What this does:** shows that message to anyone who installs any version of `finance-calculator-pro`. It must come **after** step 10, because versions published later are not deprecated.
- **Check:** `npm view finance-calculator-pro deprecated` prints the message.

## 12. Final checks

```bash
cd "$(mktemp -d)" && npm init -y >/dev/null && npm i fundamental-analysis && node -e "console.log(require('fundamental-analysis').peg(30, 0.15))" && node --input-type=module -e "import { peg } from 'fundamental-analysis'; console.log(peg(30, 0.15))"
```
- **What this does:** installs the published package into an empty temporary folder and imports it with both CommonJS and ES modules.
- **Check:** it prints `2` twice.

Then open these pages and confirm each one:
- https://www.npmjs.com/package/fundamental-analysis shows 1.3.0, the README, the MIT licence and the GitHub link.
- https://www.npmjs.com/package/finance-calculator-pro shows the deprecation banner.
- https://boffincoders.github.io/fundamental-analysis/ shows the docs.

Last, in Google Search Console, add the new docs URL as a property and submit
`https://boffincoders.github.io/fundamental-analysis/sitemap.xml`.

---

## If something goes wrong

- **The name is taken (step 2):** stop. Don't publish anything. Choose another name (a scoped name such as `@boffincoders/fundamental-analysis` is always available to you). Changing it means editing package.json, the README, the CHANGELOG and the docs again.
- **`npm publish` failed (network, OTP, permissions):** a publish either completes or doesn't happen, so just fix the cause and run the same command again. `npm view <name> version` tells you whether the version exists.
- **Published something wrong:** you can't publish the same version twice. Fix it and publish `1.3.1`. `npm unpublish <name>@1.3.0` only works within 72 hours of publishing and only if no other package depends on it. Even then, that version number can never be reused. Prefer a new version over unpublishing.
- **Step 10 left package.json changed:** run `git checkout -- package.json`.
- **Step 10 published but step 11 failed:** just run step 11 again.
- **Deprecated by mistake:** `npm deprecate finance-calculator-pro ""` removes the message.
- **Docs show 404 or unstyled pages after the rename:** check **Settings → Pages → Source = GitHub Actions**, run `gh workflow run "Deploy Docs site to Pages"`, and wait a few minutes; Pages can be slow to update.
- **You pushed before renaming the repository:** nothing is lost. Rename it (step 3), then re-run the docs workflow (step 8).
- **The merge in step 5 refuses (`Not possible to fast-forward`):** master has new commits. Run `git merge fix/correctness-1.3.0`, resolve any conflicts, then run step 6 again before pushing.
