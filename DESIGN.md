# Design System — Fluent Mineiro

## Product Context
- **What this is:** A Duolingo-style desktop language learning app for Mineiro Portuguese (A2 → C1)
- **Who it's for:** Chris — English/Spanish speaker learning Brazilian Portuguese with Minas Gerais dialect focus
- **Space/industry:** Language learning (Duolingo, Anki, Babbel, Drops)
- **Project type:** Desktop app (Tauri v2 + Svelte 5)

## Aesthetic Direction
- **Direction:** Playful/Warm — Duolingo's gamification energy rooted in Minas Gerais visual culture
- **Decoration level:** Intentional — subtle warmth, not flat and not noisy
- **Mood:** Like learning Portuguese in a cozy boteco in Belo Horizonte. Warm, inviting, grounded in place. Every visual choice traces back to Minas Gerais — the terracotta earth, the mountain greens, the colonial gold, the cafe culture.
- **Reference sites:** Duolingo (gamification patterns), Drops (clean exercise UI)

## Typography
- **Display/Hero:** Fraunces (700, variable optical size) — warm organic serif with personality. Feels Brazilian, not corporate. Use `font-variation-settings: 'opsz' 144` for large sizes.
- **Body:** Plus Jakarta Sans (400, 500, 600, 700) — modern, friendly, highly readable geometric sans. Warm without being childish.
- **UI/Labels:** Plus Jakarta Sans (600) — same as body, weight 600 for labels and UI elements
- **Data/Tables:** JetBrains Mono (400, 500) — clean monospace for Portuguese exercise prompts, cloze sentences, and code. Supports tabular-nums.
- **Code:** JetBrains Mono
- **Loading:** Google Fonts CDN — `family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,600;0,9..144,700;1,9..144,400&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500`
- **Scale:**
  - xs: 11px / 0.6875rem
  - sm: 13px / 0.8125rem
  - base: 15px / 0.9375rem
  - md: 18px / 1.125rem
  - lg: 22px / 1.375rem
  - xl: 28px / 1.75rem
  - 2xl: 36px / 2.25rem
  - 3xl: 48px / 3rem

## Color
- **Approach:** Balanced — rooted in Mineiro landscape
- **Primary:** #C0582B (Terracotta) — warm red-clay earth of Minas Gerais. Main actions, active states, user message bubbles.
  - Light: #D4743F
  - Dark: #9A4520
- **Secondary:** #2D6A4F (Serra Green) — deep green of Minas mountain forests. Success states, progress bars, correct answers.
  - Light: #3D8B6A
  - Dark: #1B4332
- **Accent:** #D4A843 (Ouro Gold) — gold mining heritage. Streaks, achievements, XP milestones, celebratory moments.
  - Light: #E0BC5F
- **Background:** #FBF7F0 (Pedra Sabao cream) — warm soapstone white
  - Card: #FFFFFF
  - Subtle: #F5EFE5
- **Text:** #3D2B1F (Cafe brown) — rich coffee brown. Minas is Brazil's coffee heartland.
  - Secondary: #6B5B4F
  - Muted: #9B8B7F
- **Border:** #E5DDD3
- **Semantic:**
  - Success: #2D6A4F (same as secondary — green = correct/good)
  - Warning: #D4A843 (same as accent — gold = attention)
  - Error: #B8432A (darkened terracotta)
  - Info: #4A7B9D (cool blue — neutral information)
- **Dark mode strategy:** Warm dark backgrounds (#1A1410 base, #2A2118 card, #352A20 subtle). Increase primary/secondary lightness by ~10%. Reduce saturation ~15%. Text becomes #F0E8E0.

## Spacing
- **Base unit:** 8px
- **Density:** Comfortable
- **Scale:**
  - 2xs: 2px
  - xs: 4px
  - sm: 8px
  - md: 16px
  - lg: 24px
  - xl: 32px
  - 2xl: 48px
  - 3xl: 64px

## Layout
- **Approach:** Grid-disciplined — consistent app-like layout, predictable alignment
- **Grid:** Single column for exercises (focused), sidebar for dashboard/settings
- **Max content width:** 1100px
- **Border radius:**
  - sm: 6px (inputs, small elements)
  - md: 10px (cards, buttons)
  - lg: 16px (modals, large cards)
  - full: 9999px (pills, badges, avatars)

## Motion
- **Approach:** Intentional — every animation serves a purpose
- **Easing:** enter(ease-out) exit(ease-in) move(ease-in-out)
- **Duration:** micro(50-100ms) short(150-250ms) medium(250-400ms) long(400-700ms)
- **Patterns:**
  - Exercise transition: slide-left (150ms, ease-out) — next question slides in from right
  - Correct answer: brief bounce (200ms) + green flash on answer
  - Wrong answer: gentle shake (200ms, 3px horizontal)
  - Streak milestone: gold confetti burst (400ms)
  - Progress bar: smooth fill (300ms, ease-in-out)
  - Card hover: subtle lift (150ms, translate-y -2px + shadow increase)

## Mineiro Design Tokens
These tokens capture the cultural identity unique to this product:
- **Mineiro tip background:** rgba(212, 168, 67, 0.15) — gold-tinted for dialect notes
- **Correction annotation (correct):** green left border + green-tinted background
- **Correction annotation (error):** terracotta left border + red-tinted background
- **Chat bubble (user):** terracotta background, white text
- **Chat bubble (Claude):** subtle cream background, cafe brown text
- **Exercise blank:** dashed terracotta underline

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-03-22 | Initial design system created | Created by /design-consultation. Visual identity rooted in Minas Gerais culture — terracotta, gold, and green from the landscape. Fraunces serif for warmth, Plus Jakarta Sans for readability. |
| 2026-03-22 | Terracotta primary over green | EUREKA: Language app identity should come from the culture being taught, not generic tech branding. Every competitor uses bright green/blue; Fluent Mineiro uses the earth tones of Minas. |
| 2026-03-22 | Cafe brown text over black | Softer, warmer reading experience that matches the organic palette. #3D2B1F has sufficient contrast against #FBF7F0 (ratio ~10:1). |
| 2026-03-22 | Warm dark mode | Dark mode uses warm browns (#1A1410) not cold grays. Maintains the Mineiro atmosphere at night. |
