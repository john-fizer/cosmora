# Skill: Annual Profections

## Purpose
Determine the activated house, sign, and Lord of the Year based on the native's age. Annual profections are the primary traditional timing technique and should always be considered first.

## Inputs Required
- Birth date
- Current date
- Native's age
- Ascendant sign (whole sign house 1)
- All 12 house signs
- Natal condition of the Lord of the Year
- Current transits to the Lord of the Year
- Solar return chart (if available)

## The Formula
```
activated_house = (age mod 12) + 1
```

Age 0  → House 1 (birth year)
Age 1  → House 2
Age 11 → House 12
Age 12 → House 1 again (12-year cycle repeats)
Age 24 → House 1 again

## Output Structure
```
activated_house: number (1–12)
activated_sign: ZodiacSign
lord_of_year: Planet (traditional ruler of activated sign)
```

## Monthly Sub-Profections
After identifying the annual house, each month advances one sign from the annual sign:
- Birthday month = annual profection sign
- Month 1 after birthday = next sign
- Continue around the zodiac

## Interpretation Rules
1. **Name the activated house and its topics** — this is the central focus of the year.
2. **Identify the Lord of the Year** — this planet governs the entire year.
3. **Judge the Lord of the Year's natal condition:**
   - Angular? Dignified? → A strong year with clear direction
   - Debilitated? Cadent? Afflicted? → A more challenging year requiring effort
4. **Check current transits to the Lord of the Year** — these are the most important transits of the year.
5. **Check solar return placement of the Lord of the Year** — where does it land in the solar return chart?
6. **Check if malefics transit the activated house or its Lord** — flag as periods of pressure.
7. **Check if benefics support the Lord of the Year** — flag as supportive windows.

## Interpretation Pattern
"You are in a [House N] profection year, activating [Sign] themes. The Lord of this year is [Planet]. Natally, [Planet] is [condition], placed in [house] — suggesting [interpretation]. Right now, [current transits to lord]. This year, the primary focus will be [house topics]."

## Combined Timing Signals to Watch
- Eclipse in the activated sign/house
- Major transits to the Lord of the Year
- Zodiacal releasing periods overlapping this year
- Solar return activation of the profected house

## Guardrails
- Profections describe focus and themes, not guaranteed outcomes.
- A difficult 8th house year does not mean death or disaster — it may mean transformation, shared resources, or confronting shadows.
- Monthly profections are useful for short-term timing but are more speculative than annual.
- Always combine with transits and other timing techniques before making strong interpretive claims.
