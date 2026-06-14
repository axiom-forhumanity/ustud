# EOD CEO Brief — GitHub Secrets Setup

The end-of-day brief workflow (`.github/workflows/eod-ceo-brief.yml`) sends a daily AI summary to the CEO.

## Required secrets

Configure these in **GitHub → axiom-forhumanity/ustud → Settings → Secrets and variables → Actions**:

| Secret | Description |
|--------|-------------|
| `OPENAI_API_KEY` | OpenAI API key for generating the brief |
| `CEO_EMAIL` | Your email address |
| `RESEND_API_KEY` | API key from [resend.com](https://resend.com) |

## Optional secrets

| Secret | Description |
|--------|-------------|
| `RESEND_FROM` | Sender address (must be verified in Resend). Default: `AXIOM Brief <onboarding@resend.dev>` |

## Until secrets are configured

The workflow runs but skips sending email with a log message. Employee workflow is unaffected.

## Manual trigger

Go to **Actions → EOD CEO Brief → Run workflow** to send a brief on demand.

## Schedule

Default: 11:00 PM UTC daily. Edit the `cron` in `.github/workflows/eod-ceo-brief.yml` to match employee end-of-day timezone.
