export default defineEventHandler(() => {
  return {
    format: 'doot-markdown',
    guide: `Write a Doot party game as a Markdown spec, then validate and save to add it to the user's Doot account. Output ONLY the spec when you show it, no code fences.

== SHAPE ==
# Game Title
theme: doot                 (optional; one of: doot, wizard, cutesie, cyber, professional, playful)
description: A one-liner.    (optional; shown on cards + the detail page, <=300 chars)
visibility: private         (optional; private | unlisted | public. Default private.)
remixable: no               (optional; yes/no.)
tags: trivia, party         (optional; up to 8 short comma-separated tags)

Then one or more rounds. Each round is a "## <block>" heading, then "key: value" lines and "- item" lines.

== STANDALONE BLOCKS ==
* "## guess": multiple choice, ONE right answer (scored: faster correct = more). Fields: prompt, image, timer (default 20). List 2+ "- choice"; mark the right one "(correct)".
* "## answer": type-the-answer trivia (players TYPE it). Fields: prompt, timer (default 30), "answers:" (the accepted answer; add synonyms split by " | ").
* "## poll": opinion, no right answer. Fields: prompt, timer (default none). 2+ "- choice".
* "## rank": players drag items into order. Fields: prompt, timer (default none). 2+ "- item".
* "## rate": score subjects on a scale. Fields: prompt, categories: Energy, Fun, scale: 1-10.
* "## buzzer": first-correct trivia. Fields: prompt, timer (default 20), points: 100. 2+ "- choice"; "(correct)" marks answer.
* "## ballpark": numeric trivia, closest guess wins. Fields: prompt, "answer:" (true number), unit (optional).

== TWO-PHASE BLOCKS ==
* "## quip": players write answers privately, then room votes the best. Fields: prompt, timer (default 60), voteprompt, votetimer (default 30).
* "## fill" (Mad Libs): players fill blanks blindly, then room votes. Fields: prompt, template: "I love {noun}", timer.
* "## faker": social deduction. Everyone gets a secret word except one faker. Fields: category, word, prompt, timer.`,
  }
})
