/**
 * Static regression checks for the raid flow.
 * The project has no browser-test runner yet, so this protects the core
 * integration contracts until Playwright/Vitest is introduced.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const source = fs.readFileSync(path.join(here, 'src/components/learning/RaidEncounter.jsx'), 'utf8');
const briefingSource = fs.readFileSync(path.join(here, 'src/components/learning/BriefingChamber.jsx'), 'utf8');
const styleSource = fs.readFileSync(path.join(here, 'src/styles/index.css'), 'utf8');
const checks = [
  ['has briefing, vocabulary, combat and result states', ["screen === 'briefing'", "screen === 'artifact'", "screen === 'result'", "setScreen('combat')"]],
  ['uses server lesson payload instead of only local questions', ['title: result.title', 'intro: result.intro', 'vocabulary: Array.isArray(result.vocabulary)', 'questions: Array.isArray(result.questions)']],
  ['does not allow authenticated combat without a server attempt', ['result?.attemptId', 'Không thể đồng bộ lượt học với máy chủ', "attemptState === 'loading'"]],
  ['has vocabulary back and next controls', ['← Trước', 'Tiếp tục →', 'Bắt đầu thử thách']],
  ['has a retry route after failure', ['Thử lại ải', 'onClick={createAttempt}']],
  ['keeps answer payload server-safe', ['{ questionId: question.id, selected: index', 'onSubmitAttempt({ attemptId, answers: finalAnswers, questId, unitId: unit.id })']],
  ['shows a recoverable submit error', ['Không thể chấm điểm lúc này', 'Nộp lại']],
  ['uses the integrated briefing CTA for the next phase', ["import BriefingChamber", "setScreen(vocabulary.length ? 'artifact' : 'combat')"]],
  ['preserves custom chamfer rules and responsive briefing layout', ['.chamfer-btn', '.chamfer-retreat', '.runic-briefing', '@media(max-width:900px)']],
];

let failed = 0;
for (const [name, snippets] of checks) {
  const searchable = `${source}\n${briefingSource}\n${styleSource}`;
  const ok = snippets.every((snippet) => searchable.includes(snippet));
  console.log(`${ok ? '✓' : '✗'} ${name}`);
  if (!ok) failed += 1;
}
if (failed) process.exit(1);
