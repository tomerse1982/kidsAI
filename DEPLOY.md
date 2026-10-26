# Deployment

**Shareable link: https://kidsai.purplecliff-668e4cb5.westeurope.azurecontainerapps.io**

Only people you add can open it: visitors sign in with Microsoft and must be assigned to the
site (see [Access](#add-or-remove-a-persons-access)). Search engines are told not to index it
(`robots.txt`, `<meta name="robots">`, `X-Robots-Tag`).

| Part | Where | Notes |
| --- | --- | --- |
| App | Azure Container Apps `kidsai` in resource group `kidsai-rg` (West Europe), subscription *Azure subscription 1* | 1 vCPU / 2 GiB, scales to zero, max 1 replica |
| Image | `ghcr.io/tomerse1982/kidsai:<commit sha>` | built by GitHub Actions from the root `Dockerfile` |
| Database | Neon, project `royal-rice-30080112`, branch `production` (Frankfurt) | migrations run at container start |
| Sign-in | Microsoft Entra ID app `kidsai-web` (directory linkcaring.com), "assignment required" | Container Apps built-in authentication |

## Deploy an update

```sh
git push origin main
```

GitHub Actions (`.github/workflows/deploy-azure.yml`) builds the image, pushes it to ghcr.io and
rolls the app to it. It takes about 5 minutes; follow it under the repository's **Actions** tab.
Database migrations in `prisma/migrations` are applied automatically when the new version starts.

The deploy step authenticates with OIDC (no stored password). It needs these settings in
GitHub → *Settings → Secrets and variables → Actions*:

| Kind | Name | Value |
| --- | --- | --- |
| Secret | `AZURE_CLIENT_ID` | client ID of the Entra app `kidsai-github-deploy` |
| Secret | `AZURE_TENANT_ID` | directory (tenant) ID |
| Secret | `AZURE_SUBSCRIPTION_ID` | subscription ID |
| Variable (optional) | `AZURE_RESOURCE_GROUP` | defaults to `kidsai-rg` |
| Variable (optional) | `AZURE_CONTAINER_APP` | defaults to `kidsai` |

Without the secrets the image is still built, but the app is not updated (the run shows a warning).
The deploy identity can only act on the `kidsai-rg` resource group, and only workflows on `main` can use it:
its federated credential (Entra app `kidsai-github-deploy`) trusts exactly the subject
`repo:tomerse1982@209470757/kidsAI@1428599179:ref:refs/heads/main`. GitHub sends this immutable
form (owner and repository IDs); a credential with the plain `repo:tomerse1982/kidsAI:...` subject
fails with `AADSTS700213`. Renaming or recreating the repository changes the IDs.

## Add or remove a person's access

Requires the Azure CLI signed in to the linkcaring.com directory (`az login`).

```sh
npm run access -- list
npm run access -- add someone@example.com
npm run access -- remove someone@example.com
```

`add` invites people from outside the directory as guests: Microsoft emails them an invitation,
they accept it once and then sign in with their own email. `remove` takes away access to the site
(an open session ends within about an hour); the guest account stays in the directory. Without the
script: Azure portal → *Microsoft Entra ID → Enterprise applications → kidsai-web → Users and groups*.

## Roll back to a previous version

Preferred (keeps git and the site in step):

```sh
git revert <bad commit>
git push origin main
```

Immediate (points the app at an image that was already built; every pushed commit has one,
tagged with its full commit sha):

```sh
az containerapp update -n kidsai -g kidsai-rg --image ghcr.io/tomerse1982/kidsai:<previous full sha>
az containerapp revision list -n kidsai -g kidsai-rg -o table   # what ran when
```

The next push to `main` deploys that commit again, so fix or revert in git as well.
A schema migration is not undone by rolling back the image; Neon can restore the database to an
earlier point in time (console → Branches → *production* → Restore).

## Test locally before pushing

```sh
npm run typecheck && npm run lint
npm test                    # unit tests
npm run test:integration    # needs the local Postgres (TEST_DATABASE_URL in .env)
npm run build               # the same build the image runs
npm run dev                 # http://127.0.0.1:3000 in a normal browser (not the Claude browser pane)
```

`.env` points at the local database; local work never touches the cloud. To try the production
build against the cloud database (careful: writes are real):

```sh
set -a; . ./.env.neon; set +a; npm run build && npm start
```

## Configuration and secrets

Never commit secrets: every `.env*` file except `.env.example` is gitignored.

| Value | Kept in |
| --- | --- |
| `DATABASE_URL` (Neon pooled), `DATABASE_URL_UNPOOLED` (Neon direct) | container app secrets `db-url`, `db-url-unpooled`; locally `.env.neon` (`neon env pull --file .env.neon`) |
| `SESSION_SECRET` | container app secret `session-secret`; locally `.env.azure` |
| Sign-in client secret | container app secret created by `az containerapp auth microsoft update` (expires after 2 years: rerun it with a new `az ad app credential reset --id <kidsai-web app id> --append` value) |

Non-secret settings (`MODEL_DIR`, `IMPORT_WORKER_MODE=external`, ...) are in the `Dockerfile`.
Content imports (admin upload) are disabled in the cloud: import locally, then copy the content
to an empty Neon database with `sh scripts/copy-db-to-cloud.sh`.

## Cost

The subscription is an Azure Free Trial with a spending limit, so nothing is charged unless it is
upgraded. Container Apps' monthly free grant (180,000 vCPU-seconds, 360,000 GiB-seconds, 2 million
requests) covers light use because the app scales to zero; the first visit after an idle period
takes about 30-60 seconds. A budget `kidsai-1usd` on `kidsai-rg` emails at 50 % and 100 % of $1 per
month. When the trial ends (30 days or the credit used), upgrade to pay-as-you-go to keep the site
running; the free grant still applies. No log workspace is attached (the paid part); live logs:
`az containerapp logs show -n kidsai -g kidsai-rg --follow`.

## Notes

- Region: West Europe. Germany West Central had no Container Apps capacity when this was set up.
- If `az` fails with "Connection reset", this machine's IPv6 path to `management.azure.com` is
  unreliable; Windows was set to prefer IPv4 (`netsh interface ipv6 set prefixpolicy ::ffff:0:0/96 45 4`,
  revert with `35 4`).
- On Windows, call `az` with arguments containing `&` (database URLs) through
  `"C:\Program Files\Microsoft SDKs\Azure\CLI2\python.exe" -IBm azure.cli ...`: `az.cmd` mangles them.
