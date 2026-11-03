---
name: hunk
description: Address the user's comments in a live Hunk review session.
disable-model-invocation: true
---

Run `hunk skill path`, then read that skill for the `hunk session` commands. If your shell runs in a sandbox, run `hunk` outside it so you can reach the daemon.

The user's Hunk comments are your work list: **address** each one. Use the bundled skill's "Guiding a review" flow only when the user asks for a walkthrough.

1. List the user's comments with `hunk session comment list --repo <path> --type user --json`. Without `--type user`, the list returns only agent notes. If it is empty, tell the user and ask what they want.
2. Address each comment: edit the code for a change request, answer a question, and ask the user about anything unclear before acting.
3. Reply in the comment's Hunk thread (`--reply-to <comment-id>`) when the diff doesn't speak for itself: an answer to a question, a fix that isn't obvious, or a choice that departs from what the user asked. Keep replies to a sentence or two, and pass `--focus` on the first one so agent notes become visible.
4. Reload the session if it doesn't show your edits. User comments survive reloads.
5. In chat, summarize what you changed in a few lines, naming only the comments waiting on the user.

Done when every user comment is fixed, answered, or waiting on the user.
