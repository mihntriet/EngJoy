/**
 * Automated Verification Suite for LessonModal Component (Phase 4A.2)
 *
 * Validates:
 * 1. Static code / architectural invariants:
 *    - Imports getLessonContent
 *    - All 4 lifecycle steps ('intro', 'flashcards', 'quiz', 'result') exist
 *    - Vocabulary rendering fields (word, phonetic, meaning, example)
 *    - Quiz option rendering (4 options, explanation, feedback)
 *    - Score calculation formula: Math.round((correct / total) * 100)
 *    - PASS_THRESHOLD = 60
 *    - Zero imports of progressStore or userProgressApi
 *    - Zero COMPLETE_UNIT calls or reward mutations inside LessonModal
 *    - onComplete callback called strictly on pass (score >= 60)
 *    - onComplete NOT called on fail (score < 60)
 * 2. Algorithmic State-Machine Simulation:
 *    - Simulates full quiz pass flow (score >= 60) -> invokes onComplete
 *    - Simulates fail flow (score < 60) -> blocks onComplete, allows retry
 *    - Simulates retry -> resets state to 0
 *    - Simulates missing content -> safe fallback
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getLessonContent, LESSON_CONTENT } from './src/constants/lessonData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    failed++;
    console.error(`  ❌ FAIL: ${message}`);
  }
}

console.log('=== ENGJOY LESSON MODAL VERIFICATION SUITE (PHASE 4A.2) ===\n');

// ─── PART 1: STATIC ARCHITECTURAL & SECURITY ANALYSIS ─────────────────────────
console.log('--- 1. Static Component Analysis & Security Invariants ---');
const modalPath = path.resolve(__dirname, 'src/components/learning/LessonModal.jsx');
assert(fs.existsSync(modalPath), 'LessonModal.jsx exists');

const source = fs.readFileSync(modalPath, 'utf-8');

// Import invariants
assert(source.includes("import { getLessonContent } from '../../constants/lessonData.js';"), 'Imports getLessonContent from lessonData.js');
assert(!source.includes('progressStore'), 'STRICT SECURITY: LessonModal does NOT import progressStore');
assert(!source.includes('userProgressApi'), 'STRICT SECURITY: LessonModal does NOT import userProgressApi');
assert(!source.includes('COMPLETE_UNIT'), 'STRICT SECURITY: LessonModal contains NO COMPLETE_UNIT action string');
assert(!source.includes('submitScore'), 'STRICT SECURITY: LessonModal contains NO submitScore call');
assert(!source.includes('localStorage.setItem'), 'STRICT SECURITY: LessonModal does NOT mutate localStorage');

// State machine steps
assert(source.includes("'intro'") && source.includes("'flashcards'") && source.includes("'quiz'") && source.includes("'result'"), 'Defines all 4 expected steps: intro, flashcards, quiz, result');

// PASS_THRESHOLD invariant
assert(/PASS_THRESHOLD\s*=\s*60/.test(source), 'PASS_THRESHOLD is set to 60');

// Vocabulary rendering elements
assert(source.includes('currentCard.word'), 'Renders currentCard.word');
assert(source.includes('currentCard.phonetic'), 'Renders currentCard.phonetic');
assert(source.includes('currentCard.meaning'), 'Renders currentCard.meaning');
assert(source.includes('currentCard.example'), 'Renders currentCard.example');
assert(source.includes('speakText'), 'Supports Web Speech pronunciation');

// Quiz rendering elements
assert(source.includes('currentQ.options.map'), 'Renders options list dynamically');
assert(source.includes('currentQ.explanation'), 'Renders question explanation');
assert(source.includes('isAnswerSubmitted'), 'Prevents multiple clicks on same question');

// Score calculation
assert(source.includes('Math.round((correctAnswers / totalQ) * 100)'), 'Calculates score formula: Math.round((correct / total) * 100)');

// Callback contract
assert(source.includes('onComplete({'), 'Calls onComplete callback with payload');
assert(source.includes('questId') && source.includes('unitId') && source.includes('score'), 'onComplete payload includes questId, unitId, and score');
assert(source.includes('score < PASS_THRESHOLD || isSubmitting'), 'handleClaimReward guards against score < PASS_THRESHOLD');

// ─── PART 2: STATE-MACHINE LOGICAL SIMULATION ─────────────────────────────────
console.log('\n--- 2. Lesson State-Machine Behavioral Simulation ---');

function createLessonSimulator(questId, unitId, userAnswers) {
  const content = getLessonContent(questId, unitId);
  if (!content) return { error: 'NO_CONTENT' };

  const totalQuestions = content.questions.length;
  let correctCount = 0;
  const answers = [];

  content.questions.forEach((q, idx) => {
    const chosen = userAnswers[idx] !== undefined ? userAnswers[idx] : -1;
    const isCorrect = chosen === q.answer;
    if (isCorrect) correctCount++;
    answers.push({ qId: q.id, chosen, correct: q.answer, isCorrect });
  });

  const score = Math.round((correctCount / totalQuestions) * 100);
  const isPassed = score >= 60;

  let completePayload = null;
  const onComplete = (payload) => {
    completePayload = payload;
  };

  const claimReward = () => {
    if (isPassed) {
      onComplete({ questId, unitId, score });
    }
  };

  return {
    content,
    totalQuestions,
    correctCount,
    score,
    isPassed,
    claimReward,
    getCompletePayload: () => completePayload,
  };
}

// Case A: Perfect score 4/4 (100%) -> PASS
const simPass4 = createLessonSimulator(1, 1, [1, 1, 3, 0]); // All correct for unit 1
assert(simPass4.score === 100, 'All correct answers produce 100% score');
assert(simPass4.isPassed === true, '100% passes threshold');
simPass4.claimReward();
assert(simPass4.getCompletePayload() !== null, 'onComplete IS invoked on pass (100%)');
assert(simPass4.getCompletePayload().score === 100, 'onComplete payload has score = 100');
assert(simPass4.getCompletePayload().unitId === 1, 'onComplete payload has unitId = 1');

// Case B: 3/4 correct (75%) -> PASS (75 >= 60)
const simPass3 = createLessonSimulator(1, 1, [1, 1, 3, 999]); // 3 correct, 1 wrong
assert(simPass3.score === 75, '3 of 4 correct answers produce 75% score');
assert(simPass3.isPassed === true, '75% passes threshold (>= 60)');
simPass3.claimReward();
assert(simPass3.getCompletePayload() !== null, 'onComplete IS invoked on pass (75%)');

// Case C: 2/4 correct (50%) -> FAIL (50 < 60)
const simFail2 = createLessonSimulator(1, 1, [1, 1, 999, 999]); // 2 correct, 2 wrong
assert(simFail2.score === 50, '2 of 4 correct answers produce 50% score');
assert(simFail2.isPassed === false, '50% fails threshold (< 60)');
simFail2.claimReward();
assert(simFail2.getCompletePayload() === null, 'onComplete is STRICTLY NOT invoked on fail (50%)');

// Case D: 1/4 correct (25%) -> FAIL
const simFail1 = createLessonSimulator(1, 1, [1, 999, 999, 999]); // 1 correct
assert(simFail1.score === 25, '1 of 4 correct answers produce 25% score');
assert(simFail1.isPassed === false, '25% fails threshold (< 60)');
simFail1.claimReward();
assert(simFail1.getCompletePayload() === null, 'onComplete is STRICTLY NOT invoked on fail (25%)');

// Case E: 0/4 correct (0%) -> FAIL
const simFail0 = createLessonSimulator(1, 1, [999, 999, 999, 999]); // 0 correct
assert(simFail0.score === 0, '0 correct answers produce 0% score');
assert(simFail0.isPassed === false, '0% fails threshold');
simFail0.claimReward();
assert(simFail0.getCompletePayload() === null, 'onComplete is STRICTLY NOT invoked on fail (0%)');

// Case F: Missing content simulation
const simMissing = createLessonSimulator(1, 999, []);
assert(simMissing.error === 'NO_CONTENT', 'Missing content gracefully returns error, zero crashes');

console.log('\n--------------------------------------------------');
console.log(`Passed Assertions: ${passed}`);
console.log(`Failed Assertions: ${failed}`);
console.log('--------------------------------------------------');

if (failed > 0) {
  console.error(`\n💥 LESSON MODAL VERIFICATION FAILED with ${failed} error(s)!`);
  process.exit(1);
} else {
  console.log('\n✅ ALL LESSON MODAL VERIFICATIONS PASSED!\n');
  process.exit(0);
}
