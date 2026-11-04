---
name: save-ai-prompt
description: Preserve the AI prompt used for a change in prompts/ and prepare the AI-marked commit message (project rule NFR-07). Use whenever AI generated code, tests, docs or architecture that will be committed.
---

# Save the AI prompt

1. List `prompts/`. If an existing prompt already covers this task type, reuse it: do not create a new file,
   just reference it in the commit. If it needed changes, edit it (the change is reviewed in the PR).
2. Otherwise create `prompts/NN-short-description.md`:
   * `NN` = next two-digit number after the highest existing one.
   * Copy the structure of `prompts/TEMPLATE.md`.
   * `Approved on`: leave `pending (PR #<n>)` until the PR is approved.
   * `Prompt`: the real prompt text, generalised so a teammate can reuse it (replace one-off names with
     `<placeholders>`). Remove secrets, tokens and personal data.
   * `Notes`: tool and model used, known limitations, manual fixes that were needed.
3. Propose the commit message (do not commit unless the user asks):
   ```
   <type>(<scope>): <description> (#<task>)

   AI-assisted. Prompt: prompts/NN-short-description.md
   Co-Authored-By: <tool / model> <noreply@...>
   ```
4. Remind the user that the prompt file must be committed in the same PR.
