---
name: grill-me
description: Interview the user relentlessly about a plan or design until reaching shared understanding, resolving each branch of the decision tree. Use when user wants to stress-test a plan, get grilled on their design, or mentions "grill me".
---

Interview me relentlessly about every aspect of this plan until we reach a shared understanding. Walk down each branch of the design tree, resolving dependencies between decisions one-by-one. For each question, provide your recommended answer.

Ask the questions one at a time.

If Pi is the current agent harness, use the `ask_user` extension to ask me these questions. In other agent harnesses, ask each question using the harness's normal interaction mechanism.

If a question can be answered by exploring the codebase, explore the codebase instead.
