# Ship the desks — four steps, about eight minutes

**Written 2026-08-11, for finishing without Claude in the room.** Do these in order.
Steps 2–4 are things Claude can also do on request; step 1 is the one it cannot, because
Supabase writes are refused by a permission classifier in this environment.

Nothing here is risky. Step 1 is additive and safe to re-run, and step 2 is revertible
with one click.

---

## Step 1 — Run the migration (≈2 min) · **only you can do this**

1. Open the SQL editor:
   **https://supabase.com/dashboard/project/ofrcpmiytqgziozsourn/sql/new**
2. Paste the **entire** contents of `RUN-THIS-IN-SUPABASE.sql` (Claude sent it in chat).
3. Press **Run**.

**You should see exactly this at the bottom:**

| passphrase_rows | read_stamps | new_note_columns |
|---|---|---|
| 1 | 2 | 5 |

- **Any other numbers → stop.** Don't do step 2. Paste the output to Claude.
- Re-running the file is harmless; every statement is guarded.

This creates `studio_idea_replies`, `studio_desk_reads` and `studio_access`, adds five
columns to `studio_ideas`, and sets the studio passphrase to **`Rahoria2026`**
(only its scrypt hash is stored — the phrase itself never touches the database).

---

## Step 2 — Merge the pull request (≈1 min)

1. Open **https://github.com/RaheemMoore/Card-Game/pull/38**
2. Click **Merge pull request** → **Confirm merge**.

It is already `MERGEABLE / CLEAN` against `main` — no conflicts. 12 files, all in
`studio-wiki/` except one new `.sql` migration file, which is not shipped code.

**Do not do this before step 1.** The new code expects the new columns; deploying it
against an unmigrated database would replace your working (if annoying) signed-in desk
with a broken one.

---

## Step 3 — Wait for the deploy (≈2 min)

Vercel builds `studio-wiki` from `main` automatically once the merge lands.

**How to know it worked:** reload
**https://card-engine-studio-wiki.vercel.app/work/raheem**
and you should get a panel reading **"The studio is locked."**

If after ~5 minutes you still see the old *"Sign in with your Card Engine account"* form,
the deploy did not run. Check **Vercel → studio-wiki → Deployments**; the project may be
set to a different production branch, or the git connection may need a nudge. There is no
`.vercel` folder in the repo, so that wiring lives only in the dashboard.

---

## Step 4 — Verify it actually works (≈3 min)

On **https://card-engine-studio-wiki.vercel.app/work/raheem**:

1. **Unlock** — type `Rahoria2026`. Case matters. The desk should open.
2. **Sidebar** — bottom left shows **WHO IS AT THE DESK** with *Raheem* / *Tori*.
   Leave it on **Raheem**.
3. **Write** — type something in "Add to Raheem's desk", press **Add note**. It appears.
4. **The actual point** — click **Tori** in the sidebar, then edit the note you just
   wrote. It should let you. Add a tag, hit **Pin**, open **Reply** and post one.
5. **The other desk** — go to `/work/tori`. It should have its *own composer*, not just
   a wall of text. Tori's lore ledger sits collapsed at the bottom.
6. **Clean up** — delete the test note (**Delete** → **Delete for both of you?**).

If all six behave, it is live and you are done.

---

## If something goes wrong

- **Desks show "The studio is locked" but the passphrase is refused** → step 1's insert
  didn't land. Re-run the `.sql` and check `passphrase_rows` is 1.
- **Desks show "The desk service is not answering"** → `SUPABASE_URL` or
  `SUPABASE_SERVICE_ROLE_KEY` is missing on the studio-wiki Vercel project. Both were
  confirmed present on 2026-08-11, so this would mean something changed.
- **Anything else** → revert PR #38 on GitHub ("Revert" button). The wiki returns to
  today's behaviour immediately. The migration can be left in place; it breaks nothing.

---

## After it's live

- **Change the passphrase with Tori.** `Rahoria2026` has been typed into a Claude chat
  transcript. The desk toolbar has a **Change passphrase** button — no dashboard, no
  redeploy, about ten seconds. Pick one together tomorrow.
- Work through [TORI_MEETING_FOLLOWUPS.md](TORI_MEETING_FOLLOWUPS.md) §B in the meeting.
- Delete this file once it's all done.
