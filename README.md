# Dyeing & Finishing Performance Dashboard

Live performance intelligence for the **Dyeing** and **Finishing** departments of
**Clifton Apparels Ltd.**

Author: **Ikramul Hasan Rakib** — Executive, Central IE Department, Clifton Group
Portfolio: <https://rakib-orion.vercel.app/>
Licence: Proprietary, all rights reserved — see [LICENSE](LICENSE) and [NOTICE](NOTICE).

---

## What this is

A static dashboard (HTML + CSS + vanilla JS + Apache ECharts) fed by a small Python
ETL pipeline (`openpyxl`) that reads two Excel workbooks:

| Workbook | Sheets used |
|---|---|
| `DYEING PERFORMANCE OVERVIEW.xlsx` | `Production Report`, `RFT Report` |
| `FINISHING PERFORMANCE OVERVIEW.xlsx` | `Database`, `Summary` |

The pipeline produces one **encrypted** bundle consumed by the page:

```
dashboard/data/data.enc.js   # window.DASHBOARD_DATA_ENC = {...}  (AES-256-GCM)
build/data.json              # plaintext copy for local tooling (git-ignored)
```

The source workbooks and the plaintext JSON are **not committed** to this repository.
The published `data.enc.js` contains only ciphertext and KDF parameters; the browser
decrypts it in memory after a successful sign-in.

---

## Access

The dashboard opens on a sign-in screen:

- **Username:** `clifton-dyeing` (change in `dashboard/assets/auth.js`)
- **Password:** the password used to build the bundle — it is *not* stored in the repo

The password is verified by AES-GCM decryption itself: a wrong password cannot
produce readable data. A successful sign-in is remembered for the browser tab for
12 hours; the **sign-out** button clears it.

### Where the password lives

The build reads the encryption password from, in order:

1. the `CLIFTON_DATA_PASSWORD` environment variable, or
2. the **git-ignored** `.data-password` file in the project root.

Create `.data-password` with the dashboard password (one line, no quotes):

```
your-strong-passphrase
```

To change the password: edit `.data-password`, run `python scripts/build.py`, commit
the regenerated `dashboard/data/data.enc.js`, and push. Anyone with the old password
will no longer be able to decrypt the new bundle.

> **Use a long passphrase.** The published ciphertext can be downloaded by anyone,
> so a short password like `dyeing123` can be brute-forced offline. 16+ random
> characters (or 4–5 unrelated words) is appropriate.

---

## Run it locally

```bash
pip install -r requirements.txt
python scripts/build.py         # rebuild the encrypted bundle from the workbooks
```

Then open `dashboard/index.html` in a browser and sign in. It works from `file://`.

**Windows one-click:** double-click `start_dashboard.bat` — it installs dependencies
if needed, builds the data, opens the dashboard and then watches the workbooks,
rebuilding automatically every time you save an Excel file.

---

## Publishing an update

1. Update the workbook(s) locally.
2. Rebuild and publish:
   - double-click `update.bat` (builds, commits and pushes), **or**
   - run `python scripts/build.py`, then `git add dashboard/data/data.enc.js` plus any
     changed dashboard files, commit and push.
3. GitHub Actions verifies the bundle is encrypted, then deploys the site.

The workflow **does not build from Excel** — the workbooks are not in the repository.
The build must happen on a machine that has the workbooks and `.data-password`.

### Deploying (GitHub Pages)

The site is published by [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)
on every push to `main` (or manually from the Actions tab). It uploads the committed
`dashboard/` folder; it fails if a plaintext `data.js` / `data.json` is ever present.

### One-time setup

1. Create a repository on GitHub and push this project to it.
2. **Settings → Pages → Build and deployment → Source = "GitHub Actions"**.
3. Your site will be live at `https://<your-user>.github.io/<repo>/`.

> GitHub Pages for a **private** repository requires a paid GitHub plan. On the free
> plan the repository must be public for Pages to deploy. The dashboard data is
> encrypted either way.

---

## Project layout

```
dashboard/               the published website (site root)
  index.html             entry point (sign-in screen + dashboard shell)
  assets/app.js          application layer (renders every tab / chart)
  assets/auth.js         sign-in gate + in-browser decryption
  assets/styles.css      design system
  assets/vendor/         Apache ECharts
  data/data.enc.js       generated, AES-256-GCM encrypted bundle
build/data.json          generated plaintext copy (git-ignored, never published)
scripts/build.py         ETL: Excel -> encrypted data bundle
scripts/watch.py         rebuild on workbook save (local convenience)
start_dashboard.bat      Windows launcher (build + open + watch)
update.bat               Windows one-click build + commit + push (local tool)
.data-password           local encryption password (git-ignored)
requirements.txt         Python dependencies
LICENSE, NOTICE          proprietary licence and third-party attributions
```

---

## Security notes

- **What the encryption protects:** the numbers in the published bundle. Without the
  password, `data.enc.js` is just ciphertext.
- **What it does not protect:** the HTML/CSS/JS is public, and anyone who obtains the
  password can read the data. Use a strong, unique passphrase and share it privately.
- **Git history:** earlier commits may still contain the source workbooks or old
  plaintext bundles if they were committed before this change. To remove them from
  history you must rewrite the repository history (e.g. `git filter-repo`) and
  force-push. Treat anything that was ever public as potentially disclosed.
- The dashboard author credit and licence remain visible on the site by design.
