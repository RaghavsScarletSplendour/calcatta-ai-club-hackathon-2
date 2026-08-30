# Steal this format. Do not steal the content.

Khan Academy’s product is a **compiler from a topic tree into a sequential worksheet**. That is what the notes meant by “Khan Academy-style.” Copy the compiler. Generate the cards.

## Their tree

```
domain          Math
  course        Algebra 1
    unit        Solving equations & inequalities
      lesson    Two-step equations
        item    Video     (teach, ~90s–10min)
        item    Article   (teach, optional)
        item    Exercise  (probe, mastery)
      quiz      lesson quiz
    unit test
  course challenge   ← this is the baseline diagnostic
```

Item kinds: **Video**, **Article**, **Exercise**. Teach then test. Always.

## Mastery ladder → STAND `stand.level`

KA skill states, mapped:

| KA | STAND | Meaning |
|---|---|---|
| not started | 0 | no evidence |
| attempted / familiar | 1 | saw it, missed it |
| proficient | 2 | got it on a probe |
| mastered | 3 | held it after a later check |

Do **not** ask “rate yourself 1–5.” Infer from the probe, same as they do.

## Checks they run (you run the same three)

1. **Course challenge** — 2–3 universal probes at the start of a niche. KA’s “Get ready for X” is this idea as a whole mini-course.
2. **Lesson quiz** — right after the teach card.
3. **Unit test / course correction** — your **“it’s next week”** button. If a promise was missed or a skill dropped, rewrite the plan.

## What to generate (not scrape)

For any goal string:

```
plan[i].teach  = one idea + one example from THEIR job   (KA video)
plan[i].probe  = work sample or 3 questions              (KA exercise)
next_if_fail   = easier sibling skill                    (KA mastery recommends)
next_if_pass   = the hole the map still shows            (KA “up next”)
```

KA’s “up next” is **one card**, not a catalog. Keep that.

## Seed for today

**Goal:** accounts → analytics  
**KA analog:** Statistics unit 3, summarizing quantitative data.

Work sample, not a quiz:

> Six invoice rows. Which customers overpaid? What is the median overpay?

Fail → teach mean vs median on **those rows** → a 4-row table.  
Pass → relationships (unit 5): does overpay correlate with region?

Link out if you want: [Statistics and probability](https://www.khanacademy.org/math/statistics-probability). Do not embed their video.

## What you do not copy

- Video files or YouTube IDs as the product
- Exercise item banks
- Their mastery pixels / avatars / energy points
- A 89-course library on the home screen

Home is a blank file and three chips. The catalog in `courses.json` is **proof the format is general**, not a menu.
