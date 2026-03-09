

# Fix: Week navigation should move one day, not one week

## Problem
When clicking the back/forward arrows in `WeekDayPicker`, the selected date jumps a full week (`addWeeks(selectedDate, -1)`). Example: on Monday March 9, clicking back lands on Monday March 2 instead of Sunday March 8.

## Fix

In `src/components/WeekDayPicker.tsx`, change `goBack` and `goForward`:

- **goBack**: Instead of `addWeeks(selectedDate, -1)`, use `addDays(weekStart, -1)` — this selects the last day (Sunday) of the previous week
- **goForward**: Instead of `addWeeks(selectedDate, 1)`, use `addDays(weekStart, 7)` — this selects the first day (Monday) of the next week, clamped to today

This way navigating between weeks always lands on the adjacent day rather than jumping a full week.

