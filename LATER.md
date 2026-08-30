# Later — do not build in this pass

Captured 30 Aug 2026. Life-skill path + video. Not college modules.

## MiniMax on Vercel AI Gateway (life skills)

Use MiniMax for **Do it now** goals: change a tire, tie a tie, cook, fix.

Vercel is running MiniMax **M3** and **M2.7** free on AI Gateway through **Sunday 6 Sep 2026**.

- Free IDs (error after 6 Sep): `minimax/minimax-m3-free`, `minimax/minimax-m2.7-free`
- After the window: `minimax/minimax-m3` / `minimax/minimax-m2.7`, with `providerOptions.gateway.order: ['gmicloud']`
- Changelog: https://vercel.com/changelog/minimax-m3-and-m2-7-are-free-on-ai-gateway
- These are **text** models (how-to steps, checks). They are not a video model.

Wire through AI Gateway (`ai` package, `"provider/model"` string), not a MiniMax SDK.

Auth: `vercel env pull` (OIDC) or `AI_GATEWAY_API_KEY`.

Clock: free period ends **6 Sep 2026**. After that, same slugs without `-free`, billed at the serving provider.

## Dynamic how-to video (separate, later)

Idea: for a life goal, generate a short video of the steps the user asked for (tire, tie), not a stock clip.

Constraints from the current app:

- College path stays sourced modules + karaoke voice. Do not swap that for generated video.
- Life path is still steps + voice + a real confirm question. Video would sit **on** the teach card, not replace the check.
- UX-LOCK said no generated video in MVP. This note overrides that for a later pass only.

Open questions when we pick this up:

1. Which video model (Gateway image/video vs MiniMax Hailuo vs xAI `image_to_video`)? M3/M2.7 will not emit video.
2. Generate once per goal vs once per step.
3. Cap length (~5–15s per step) so a demo does not stall.
4. Fallback if video dies: steps + voice still work (same rule as audio today).

Do not start this until the sourced college lesson and karaoke path are demo-stable.
