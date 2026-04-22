# Issue #372: Spanish-calibrated eval judges - Implementation Summary

## Changes Made

### 1. Modified `src/lib/evals/judge.ts`
- Added `language?: "en" | "es"` parameter to `buildJudgePrompt()` function
- Added Spanish calibration notes when `language === "es"`:
  - Don't penalize Spanish conversational fillers (eh, bueno, a ver, pues, vale, vaya)
  - Don't flag English technical terms as code-switching errors
  - Judge naturalness against Spanish native speaker register
  - Consider cultural communication differences
- Added `language` parameter to `judgeResponse()` function

### 2. Modified `src/lib/evals/runner.ts`
- Updated `judgeResponse()` call to pass `scenario.language` parameter

### 3. Created unit tests in `src/lib/evals/judge.test.ts`
- Tests verify Spanish calibration notes appear when `language: "es"`
- Tests verify no Spanish calibration when `language: "en"` or undefined
- Tests verify compatibility with voice media and multi-turn conversations

## Test Results
✅ All 7 unit tests passing
✅ TypeScript typecheck passing
✅ Implementation meets all acceptance criteria

## Acceptance Criteria Met
✅ Judge prompts accept a `language` parameter
✅ For Spanish (`language: "es"`), calibration note is appended
✅ For English (`language: "en"`), no calibration note is added
✅ Unit test verifies calibration note presence/absence based on language
✅ Typecheck passes
✅ Tests pass
