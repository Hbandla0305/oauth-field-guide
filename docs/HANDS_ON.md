# Hands-on setup attempts (about 45 minutes)

These are the strongest evidence in the submission: a person actually did the setup and recorded what happened.
Each one checks specific claims the research agents made. Record what you **see**, especially where it differs from the guide.

**Rules:** use free accounts, never paste client secrets anywhere (screenshots: crop or blur the secret), delete the apps afterwards if you like.

Put screenshots in `docs/evidence/` (e.g. `github-1-oauth-form.png`). Write timings and notes straight into the tables below.

---

## A. GitHub (about 15 min)

Start a timer when you open the first page.

| # | Do this | Check this claim from our guide | What you saw (fill in) |
|---|---|---|---|
| 1 | Open https://github.com/settings/applications/new (OAuth App) | Registration is one form, no review | |
| 2 | Fill name, homepage `https://example.com`, callback `http://localhost:3000/callback`. **Don't submit yet:** screenshot the form | Is there an **"Expire user access tokens"** checkbox, and is it **checked by default**? (The agent claims it now is. This is our least certain GitHub claim.) | |
| 3 | Register the app | Client ID shows immediately; you generate a secret yourself | |
| 4 | Paste in your browser: `https://github.com/login/oauth/authorize?client_id=YOUR_CLIENT_ID&scope=repo` and screenshot the consent screen (don't need to approve) | Any GitHub user can reach consent immediately; no "unverified" warning | |
| 5 | Open https://github.com/settings/apps/new (GitHub App) and scroll | GitHub App form has "Request user authorization (OAuth) during installation" and fine-grained permissions | |
| 6 | Optional: if you're in an org, check Org settings → Third-party access → OAuth app policy | "Access restrictions" are on by default for new orgs | |

**Total time to a working dev app:** ___ min. (Guide says 15–60 min.)

## B. Google (about 30 min)

| # | Do this | Check this claim from our guide | What you saw (fill in) |
|---|---|---|---|
| 1 | https://console.cloud.google.com/projectcreate → create project `oauth-guide-test` | Self-serve, free, no billing account needed | |
| 2 | Go to https://console.cloud.google.com/auth/overview → Get started | Current names are **Google Auth Platform** with **Branding / Audience / Clients / Data Access / Verification Center** in the side menu. Screenshot the menu. | |
| 3 | Fill app name and support email, choose **External** audience | External vs Internal choice. Internal is only available with a Workspace org | |
| 4 | **Data Access** → Add scopes → search `gmail`. Add `gmail.readonly` and `gmail.send`. Screenshot the scope table | `gmail.readonly` is listed as **restricted**, `gmail.send` as **sensitive** | |
| 5 | **Audience** page: screenshot the Testing status and test-user section | Testing mode, **100 test-user cap**; mentions the 7-day token expiry? | |
| 6 | **Clients** → Create client → Web application, redirect `https://developers.google.com/oauthplayground` | Client created instantly | |
| 7 | Open https://developers.google.com/oauthplayground → gear icon → "Use your own OAuth credentials" → paste client ID/secret → choose Gmail API `gmail.readonly` → Authorize. Screenshot every warning screen | You see **"Google hasn't verified this app"** (or a test-user block if you didn't add yourself as a test user; note which!) | |
| 8 | Audience → **Publish app** (click, screenshot the dialog, then cancel) | Publishing with restricted scopes requires verification; dialog mentions it | |
| 9 | Verification Center: screenshot what it asks for | Brand verification first; restricted scopes need a security assessment | |

**Total time to a working dev app (steps 1–7):** ___ min. (Guide says 30–90 min.)

---

After each run, every row is recorded in `VERIFICATION.md` §3 as ✅ confirmed, ✏️ corrected or ❓ couldn't verify, and the guide is updated: corrections go into its "What we corrected" list, and it's marked as checked by a person with the date.
