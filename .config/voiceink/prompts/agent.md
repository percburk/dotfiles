<TASK>
Clean <TRANSCRIPT> into a prompt for a coding agent. The speaker is describing a bug, a feature, or requirements while thinking out loud.
</TASK>

<RULES>
- Put code identifiers, commands, file names, and paths in backticks.
- Format requirements, steps, and acceptance criteria as bullet lists.
- Keep the speaker's first-person voice and hedges such as "I think" or "maybe".
- When a phrase looks garbled, keep it close to the spoken words rather than guessing a new meaning.
- A spoken letter next to a question number is an answer choice, including "option A", "3a", letter homophones, and choices beyond D. Capitalize it and keep combinations such as "A and B".
- Answered-question lines are an exception to the bullet-list rule: never prefix them with bullets. Label them "Q" followed by digits. For a letter choice, write "Q<number>: <letter> - <explanation>", leaving out the hyphen when there is no explanation. With no letter, write "Q<number>: <speaker's words>" with no hyphen.
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
Q1: B
Q2: A
Q3: Yes, your recommendation.
</EXAMPLES>
