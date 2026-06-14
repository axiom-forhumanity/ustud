/**
 * AXIOM End-of-Day CEO Brief Generator
 *
 * Reads progress logs and today's git activity, generates an AI summary,
 * and emails it to the CEO via Resend.
 *
 * Required GitHub secrets:
 *   OPENAI_API_KEY  — OpenAI API key
 *   CEO_EMAIL       — CEO email address
 *   RESEND_API_KEY  — Resend API key (https://resend.com)
 *   RESEND_FROM     — (optional) sender email, default: AXIOM Brief <onboarding@resend.dev>
 *
 * Usage: node scripts/generate-eod-brief.mjs
 */

import { readFileSync, existsSync } from "fs";
import { execSync } from "child_process";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const CEO_EMAIL = process.env.CEO_EMAIL;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM = process.env.RESEND_FROM || "AXIOM Brief <onboarding@resend.dev>";

function readFile(path) {
  if (!existsSync(path)) return null;
  return readFileSync(path, "utf8");
}

function getTodayCommits() {
  try {
    const today = new Date().toISOString().slice(0, 10);
    return execSync(
      `git log --since="${today} 00:00:00" --pretty=format:"%h %s (%an)" --name-only`,
      { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 }
    ).trim();
  } catch {
    return "(no commits today or git unavailable)";
  }
}

async function generateBrief(context) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an executive briefing assistant for AXIOM Mission Control.
Summarize the employee's daily progress for the CEO in a clear, scannable format.
Include: what happened, what's working, what's not, blockers, direction alignment, risks, and CEO action items.
Be concise but thorough. Use markdown formatting.`,
        },
        {
          role: "user",
          content: context,
        },
      ],
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI API error: ${response.status} ${err}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

async function sendEmail(subject, body) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: RESEND_FROM,
      to: [CEO_EMAIL],
      subject,
      html: body.replace(/\n/g, "<br>"),
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Resend API error: ${response.status} ${err}`);
  }

  return response.json();
}

async function main() {
  const today = new Date().toISOString().slice(0, 10);

  if (!OPENAI_API_KEY || !CEO_EMAIL || !RESEND_API_KEY) {
    console.log("Skipping EOD brief: missing required secrets.");
    console.log("Configure OPENAI_API_KEY, CEO_EMAIL, and RESEND_API_KEY in GitHub repo secrets.");
    process.exit(0);
  }

  const dailyLog = readFile("progress/DAILY_LOG.md") || "(no daily log found)";
  const blockers = readFile("progress/BLOCKERS.md") || "(no blockers file)";
  const currentState = readFile("progress/CURRENT_STATE.md") || "(no current state file)";
  const projectBrief = readFile("docs/PROJECT_BRIEF.md") || "";
  const commits = getTodayCommits();

  const context = `
# End-of-Day Brief Request — ${today}

## Project Brief (for alignment reference)
${projectBrief.slice(0, 2000)}

## Daily Log
${dailyLog.slice(-4000)}

## Current State
${currentState.slice(0, 2000)}

## Blockers
${blockers.slice(0, 2000)}

## Today's Git Activity
${commits.slice(0, 3000)}
`;

  console.log("Generating AI brief...");
  const brief = await generateBrief(context);

  const subject = `AXIOM Daily Brief — UStud — ${today}`;
  const body = `# AXIOM Daily Brief\n\n**Date:** ${today}\n**Project:** UStud\n\n---\n\n${brief}`;

  console.log("Sending email to CEO...");
  await sendEmail(subject, body);

  console.log(`EOD brief sent to ${CEO_EMAIL}`);
}

main().catch((err) => {
  console.error("EOD brief failed:", err.message);
  process.exit(1);
});
