# UI Color Standards

This palette keeps the experience anchored in a PrizePicks-inspired green base with energetic accent pops. Use the semantic tokens below to keep things consistent across surfaces.

| Token | Hex | Usage |
| --- | --- | --- |
| `brand.deep` | `#010C07` | Base layer for darkest portions of the board. |
| `brand.midnight` | `#02170F` | Secondary wash to keep the background subtly green. |
| `brand.emerald` | `#49E6B5` | Primary action color, stat highlights, positive chips. |
| `brand.emeraldDark` | `#0B5F4A` | Panel fills, hero gradients, card borders. |
| `brand.purple` | `#A855F7` | Alternate accent for callouts, hints, or secondary chips. |
| `neutral.blackOverlay` | `rgba(0,0,0,0.35)` | Card backgrounds over imagery/video. |
| `neutral.border` | `rgba(255,255,255,0.08)` | Hairline borders separating content. |
| `status.error` | `#F87171` | Error banners or destructive text. |
| `status.warning` | `#FBBF24` | Live-game placeholder banner. |

## Guidance

- Lead with layered emerald gradients for major sections; use `brand.midnight` underneath to keep the page subtly green before fading into `brand.deep`.
- Use purple glows as the secondary accent; keep the board predominantly green.
- Keep text on emerald backgrounds at 80–90% opacity white or pale green for readability.
- Pair purple glows with lighter emeralds for chips/timers so the palette stays cohesive.
- When layering on darker photography or video, drop in `neutral.blackOverlay` first, then apply brand glows on top.
