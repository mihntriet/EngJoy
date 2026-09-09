/**
 * Production Validation Suite for A1 Lesson Data
 * Validates integrity, schema adherence, question count, option counts,
 * answer indexes, uniqueness, and absence of empty strings.
 */

import { LESSON_CONTENT, getLessonContent } from './src/constants/lessonData.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
  } else {
    failed++;
    console.error(`❌ FAIL: ${message}`);
  }
}

console.log('=== ENGJOY A1 LESSON DATA VALIDATION ===\n');

// 1. Validate quest 1 existence
assert(LESSON_CONTENT && typeof LESSON_CONTENT === 'object', 'LESSON_CONTENT is an object');
const quest1 = LESSON_CONTENT[1];
assert(quest1 && typeof quest1 === 'object', 'Quest 1 (A1) exists in LESSON_CONTENT');

// Tracking collections for uniqueness checks
const seenVocabIds = new Set();
const seenQuestionIds = new Set();
const seenQuestionTexts = new Set();

let totalVocabCount = 0;
let totalQuestionCount = 0;

// 2. Validate all A1 units 1 through 8
for (let unitId = 1; unitId <= 8; unitId++) {
  const unit = quest1[unitId];
  assert(unit !== undefined, `Unit ${unitId} exists`);
  if (!unit) continue;

  // Title and intro
  assert(typeof unit.title === 'string' && unit.title.trim().length > 0, `Unit ${unitId} title is non-empty`);
  assert(typeof unit.intro === 'string' && unit.intro.trim().length > 0, `Unit ${unitId} intro is non-empty`);

  // Vocabulary validation
  assert(Array.isArray(unit.vocabulary), `Unit ${unitId} vocabulary is an array`);
  assert(unit.vocabulary.length >= 3 && unit.vocabulary.length <= 5, `Unit ${unitId} has 3-5 vocabulary items (found ${unit.vocabulary.length})`);

  unit.vocabulary.forEach((v, vIdx) => {
    totalVocabCount++;
    assert(typeof v.id === 'string' && v.id.trim().length > 0, `Unit ${unitId} vocab [${vIdx}] has valid id`);
    assert(!seenVocabIds.has(v.id), `Vocab ID "${v.id}" is unique globally`);
    seenVocabIds.add(v.id);

    assert(typeof v.word === 'string' && v.word.trim().length > 0, `Unit ${unitId} vocab "${v.id}" word is non-empty`);
    assert(typeof v.phonetic === 'string' && v.phonetic.trim().length > 0, `Unit ${unitId} vocab "${v.id}" phonetic is non-empty`);
    assert(typeof v.meaning === 'string' && v.meaning.trim().length > 0, `Unit ${unitId} vocab "${v.id}" meaning is non-empty`);
    assert(typeof v.example === 'string' && v.example.trim().length > 0, `Unit ${unitId} vocab "${v.id}" example is non-empty`);
  });

  // Questions validation
  assert(Array.isArray(unit.questions), `Unit ${unitId} questions is an array`);
  assert(unit.questions.length >= 3 && unit.questions.length <= 5, `Unit ${unitId} has >= 3 questions (found ${unit.questions.length})`);

  unit.questions.forEach((q, qIdx) => {
    totalQuestionCount++;
    assert(typeof q.id === 'string' && q.id.trim().length > 0, `Unit ${unitId} question [${qIdx}] has valid id`);
    assert(!seenQuestionIds.has(q.id), `Question ID "${q.id}" is unique globally`);
    seenQuestionIds.add(q.id);

    assert(q.type === 'multiple_choice', `Unit ${unitId} question "${q.id}" type is multiple_choice`);
    assert(typeof q.question === 'string' && q.question.trim().length > 0, `Unit ${unitId} question "${q.id}" text is non-empty`);

    // Duplicate question text check across units
    const normalizedQ = q.question.trim().toLowerCase();
    assert(!seenQuestionTexts.has(normalizedQ), `Question "${q.question}" is not duplicated across units`);
    seenQuestionTexts.add(normalizedQ);

    // Options validation: exactly 4 options
    assert(Array.isArray(q.options), `Unit ${unitId} question "${q.id}" options is an array`);
    assert(q.options.length === 4, `Unit ${unitId} question "${q.id}" has exactly 4 options`);

    q.options.forEach((opt, optIdx) => {
      assert(typeof opt === 'string' && opt.trim().length > 0, `Unit ${unitId} question "${q.id}" option [${optIdx}] is non-empty`);
    });

    // Answer index validation: integer between 0 and 3
    assert(Number.isInteger(q.answer), `Unit ${unitId} question "${q.id}" answer is an integer`);
    assert(q.answer >= 0 && q.answer < 4, `Unit ${unitId} question "${q.id}" answer index (${q.answer}) is within [0, 3]`);

    // Explanation validation
    assert(typeof q.explanation === 'string' && q.explanation.trim().length > 0, `Unit ${unitId} question "${q.id}" explanation is non-empty`);
  });
}

// 3. Test helper function getLessonContent
const unit1Content = getLessonContent(1, 1);
assert(unit1Content !== null && unit1Content.title === 'Bảng chữ cái & Phát âm', 'getLessonContent(1, 1) returns Unit 1');
const nonExistent = getLessonContent(1, 999);
assert(nonExistent === null, 'getLessonContent(1, 999) returns null');
const nonExistentQuest = getLessonContent(999, 1);
assert(nonExistentQuest === null, 'getLessonContent(999, 1) returns null');

console.log('--------------------------------------------------');
console.log(`Units Tested: 8 (A1 Unit 1 -> Unit 8)`);
console.log(`Total Vocabulary Items: ${totalVocabCount}`);
console.log(`Total Practice Questions: ${totalQuestionCount}`);
console.log(`Passed Assertions: ${passed}`);
console.log(`Failed Assertions: ${failed}`);
console.log('--------------------------------------------------');

if (failed > 0) {
  console.error(`\n💥 VALIDATION SUITE FAILED with ${failed} error(s)!`);
  process.exit(1);
} else {
  console.log('\n✅ ALL A1 LESSON DATA VALIDATIONS PASSED PERFECTLY!\n');
  process.exit(0);
}
