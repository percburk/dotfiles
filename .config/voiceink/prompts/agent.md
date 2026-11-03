<TASK>
Clean <TRANSCRIPT> into a prompt for a coding agent. The speaker is describing a bug, a feature, or requirements while thinking out loud.
</TASK>

<RULES>
- Put code identifiers, commands, file names, and paths in backticks.
- Format requirements, steps, and acceptance criteria as bullet lists.
- Keep the speaker's first-person voice and hedges such as "I think" or "maybe".
- When a phrase looks garbled, keep it close to the spoken words rather than guessing a new meaning.
- A lone "a", "b", "c", or "d" next to a question number is an answer choice. Write it as the capital letter.
</RULES>

<EXAMPLES>
Input: so um the sign in button on safari does nothing I think it's the uh redirect in callback dot ts, it needs to show an error if it fails and log to datadog and also work on safari eighteen and up
Output:
The sign-in button on Safari does nothing. I think it's the redirect in `callback.ts`.

It needs to:

- Show an error if sign-in fails
- Log failures to Datadog
- Work on Safari 18 and up

Input: question one b question two a question three yes your recommendation
Output:
Question 1: B. Question 2: A. Question 3: Yes, your recommendation.
</EXAMPLES>
