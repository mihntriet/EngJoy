import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getLessonContent } from '../../constants/lessonData.js';
import BriefingChamber from './BriefingChamber.jsx';
import ArtifactChamber from './ArtifactChamber.jsx';
import CombatArena from './CombatArena.jsx';
import ResultChamber from './ResultChamber.jsx';

const OPTION_KEYS = ['A', 'B', 'C', 'D'];
const PASS_SCORE = 60;

function RetreatButton({ onClick }) {
  return <button type="button" onClick={onClick} className="inline-flex min-h-11 items-center gap-2 rounded-md border border-slate-700 bg-slate-900/90 px-4 py-2 text-xs font-bold text-slate-300 transition hover:border-cyan-400 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"><span aria-hidden="true">←</span> RÚT LUI</button>;
}

function ProgressBar({ current, total, label }) {
  const value = total ? Math.min(100, Math.round((current / total) * 100)) : 0;
  return <div className="w-full max-w-sm"><div className="mb-2 flex justify-between font-mono text-[10px] tracking-[.08em] text-slate-400"><span>{label}</span><span>{current}/{total}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,.8)] transition-all duration-300" style={{ width: `${value}%` }} /></div></div>;
}

export default function RaidEncounter({ questId, unit, isAuthenticated, hasNextUnit, isQuestComplete, onClose, onComplete, onStartAttempt, onSubmitAttempt }) {
  const fallbackLesson = useMemo(() => getLessonContent(questId, unit?.id), [questId, unit?.id]);
  const [lesson, setLesson] = useState(fallbackLesson);
  const [screen, setScreen] = useState('briefing');
  const [wordIndex, setWordIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [attemptId, setAttemptId] = useState(null);
  const [attemptState, setAttemptState] = useState(isAuthenticated ? 'loading' : 'ready');
  const [attemptError, setAttemptError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [passed, setPassed] = useState(null);

  const vocabulary = lesson?.vocabulary || [];
  const questions = lesson?.questions || [];
  const currentWord = vocabulary[wordIndex];

  const resetProgress = useCallback(() => {
    setScreen('briefing'); setWordIndex(0);
    setScore(0); setPassed(null); setSubmitError('');
  }, []);

  const createAttempt = useCallback(async () => {
    resetProgress();
    setLesson(fallbackLesson);
    if (!isAuthenticated) { setAttemptState('ready'); setAttemptId(null); return; }
    if (!onStartAttempt || !unit) { setAttemptState('error'); setAttemptError('Không thể khởi tạo lượt học. Hãy thử lại.'); return; }
    setAttemptState('loading'); setAttemptError(''); setAttemptId(null);
    const result = await onStartAttempt(questId, unit.id);
    if (!result?.success || !result?.attemptId) {
      setAttemptState('error');
      setAttemptError('Không thể đồng bộ lượt học với máy chủ. Vui lòng thử lại trước khi bắt đầu.');
      return;
    }
    setAttemptId(result.attemptId);
    setLesson((current) => {
      // Restore answers from fallback dictionary to allow immediate feedback
      const remoteQuestions = Array.isArray(result.questions) ? result.questions : current?.questions || [];
      const mergedQuestions = remoteQuestions.map(q => {
        if (q.answer === undefined) {
          const localQ = fallbackLesson.questions.find(lq => lq.id === q.id);
          if (localQ && localQ.answer !== undefined) {
            return { ...q, answer: localQ.answer };
          }
        }
        return q;
      });

      return {
        ...current,
        title: result.title || current?.title,
        intro: result.intro || current?.intro,
        vocabulary: Array.isArray(result.vocabulary) ? result.vocabulary : current?.vocabulary || [],
        questions: mergedQuestions,
      };
    });
    setAttemptState('ready');
  }, [fallbackLesson, isAuthenticated, onStartAttempt, questId, resetProgress, unit]);

  useEffect(() => { createAttempt(); }, [createAttempt]);

  const finishEncounter = useCallback(async (finalAnswers, localScore) => {
    if (isAuthenticated) {
      if (!attemptId || !onSubmitAttempt) { setSubmitError('Lượt học chưa sẵn sàng để nộp. Hãy thử lại ải.'); return; }
      setSubmitting(true); setSubmitError('');
      const result = await onSubmitAttempt({ attemptId, answers: finalAnswers, questId, unitId: unit.id });
      setSubmitting(false);
      if (!result?.success || typeof result.passed !== 'boolean') {
        setSubmitError('Không thể chấm điểm lúc này. Kiểm tra kết nối rồi thử nộp lại.');
        return;
      }
      setScore(result.score ?? localScore); setPassed(result.passed); setScreen('result'); return;
    }
    setScore(localScore); setPassed(localScore >= PASS_SCORE); setScreen('result');
  }, [attemptId, isAuthenticated, onSubmitAttempt, questId, unit?.id]);



  if (!lesson || !unit) return null;

  if (screen === 'briefing') return <BriefingChamber lesson={lesson} vocabulary={vocabulary} questions={questions} loading={attemptState === 'loading'} error={attemptState === 'error' ? attemptError : ''} onRetry={createAttempt} onRetreat={onClose} onStart={() => setScreen(vocabulary.length ? 'artifact' : 'combat')} />;

  if (screen === 'artifact') {
    return (
      <ArtifactChamber 
        word={currentWord}
        currentIndex={wordIndex}
        totalWords={vocabulary.length}
        onAbsorb={() => {
          if (wordIndex < vocabulary.length - 1) {
            setWordIndex(w => w + 1);
          } else {
            setScreen('combat');
          }
        }}
        onRetreat={onClose}
      />
    );
  }

  if (screen === 'result') {
    return (
      <ResultChamber
        passed={passed}
        score={score}
        rewardGold={passed ? 25 : 0}
        hasNextUnit={hasNextUnit}
        isQuestComplete={isQuestComplete}
        submitting={submitting}
        onRetry={createAttempt}
        onRetreat={onClose}
        onComplete={(action) => onComplete({ questId, unitId: unit.id, score, attemptId }, action)}
      />
    );
  }

  if (screen === 'combat') {
    return (
      <CombatArena 
        questions={questions}
        onComplete={(answers, localScore) => finishEncounter(answers, localScore)}
        onRetreat={onClose}
      />
    );
  }

  return null;
}
