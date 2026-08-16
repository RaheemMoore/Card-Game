# Play the game yourself

You do not need to ask anyone to start the game. Two keystrokes and it opens in
your browser.

## The fast way

Press **Ctrl + Shift + B**.

That runs **Card Game: Start the Game**. A terminal opens at the bottom, the
game builds for a few seconds, and your browser opens on the castle courtyard.

That is the whole thing.

## The menu way

If you would rather see the list:

1. **Terminal** menu at the top → **Run Task…**
2. Pick the one you want from the list.

Every task in that list starts with `Card Game:` so they are easy to find.

## Two ways to run it, and when to use each

| Task | Opens | What it is |
|---|---|---|
| **Card Game: Start the Game** | `localhost:5173/castle` | The full version — includes the admin pages and the developer test pages. This is the one to use while working on something. |
| **Card Game: Play as a Player** | `localhost:5175/castle` | Exactly what a player downloads. No admin, no developer pages. |

**Run "Play as a Player" before you merge `development` into `main`.** That is
the build `main` would ship, so it is the honest answer to "is this ready?" The
full version can hide a problem simply by having extra pages available that a
player would never get.

They use different ports on purpose, so you can run both at once and flip
between the browser tabs to compare.

## Stopping it

The game keeps running until you stop it. In the terminal panel at the bottom,
click the **trash-can icon** on the right. That closes the terminal and stops
the server.

Closing the browser tab does **not** stop it — the server is still running in
VS Code.

## If something goes wrong

**"Port 5173 is already in use."** Something is already running there — usually
a game server you started earlier and forgot, or one an assistant started. Stop
the old one first (trash-can icon in its terminal), then run the task again.

This error is deliberate. The task is set to fail loudly rather than quietly
moving to another port, because a server on an unexpected port is how you end up
staring at the wrong version of the game and wondering why your change is not
there.

**The browser did not open.** The server may still be fine — check the terminal
for a line reading `Local: http://localhost:5173/`. If it is there, type
`localhost:5173/castle` into your browser yourself.

**A blank page, or errors about missing keys.** The game needs a `.env` file
inside `card-engine`. That file holds private keys and is deliberately not in
the repository. Ask before creating one.

## What you are looking at

`/castle` is the courtyard — the walkable hub with the Card-wright, the
buildings, the pond and the training enemy. It is the part of the game that is
most finished, which is why both tasks open it directly instead of the home
page.

Controls are listed on-screen in the bottom-left corner while you play.
