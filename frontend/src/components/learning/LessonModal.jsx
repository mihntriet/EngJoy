import React, { useState, useEffect, useCallback } from 'react';
import { getLessonContent } from '../../constants/lessonData.js';
import Chip from '../common/Chip';
import Bar from '../common/Bar';

const PASS_THRESHOLD = 60;

/**
 * Speech synthesis audio helper using standard Web Speech API.
 * Gracefully falls back if browser lacks audio support.
 */
function speakText(text) {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    } catch {
      // Audio speech playback error ignored safely
    }
  }
}

export default function LessonModal({
  isOpen,
  questId = 1,
  unit = null,
  onClose,
  onComplete,
}) {
  // ─── Transient State Machine ────────────────────────────────────────────────
  const [step, setStep] = useState('intro'); // 'intro' | 'flashcards' | 'quiz' | 'result'
  const [flashcardIndex, setFlashcardIndex] = useState(0);
  const [quizIndex, setQuizIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [answers, setAnswers] = useState([]);
  const [score, setScore] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Safely retrieve authoritative curriculum content
  const lessonData = unit && questId ? getLessonContent(questId, unit.id) : null;
  const vocabulary = lessonData?.vocabulary || [];
  const questions = lessonData?.questions || [];

  // Reset transient lesson state whenever modal opens or unit changes
  const resetLessonState = useCallback(() => {
    setStep('intro');
    setFlashcardIndex(0);
    setQuizIndex(0);
    setSelectedAnswer(null);
    setIsAnswerSubmitted(false);
    setAnswers([]);
    setScore(0);
    setIsSubmitting(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      resetLessonState();
    }
  }, [isOpen, unit?.id, questId, resetLessonState]);

  if (!isOpen) return null;

  // ─── Edge Case 1: Missing or Incomplete Lesson Content ───────────────────────
  if (!unit || !lessonData) {
    return (
      <div style={styles.overlay} role="dialog" aria-modal="true">
        <div style={styles.modal}>
          <div style={styles.header}>
            <h3 style={styles.title}>Không tìm thấy bài học</h3>
            <button onClick={onClose} style={styles.closeBtn} aria-label="Đóng modal">✕</button>
          </div>
          <div style={styles.body}>
            <p style={{ color: 'var(--t2)', fontSize: 14 }}>
              Dữ liệu bài học cho Unit {unit?.id || ''} hiện chưa sẵn sàng. Vui lòng quay lại sau!
            </p>
          </div>
          <div style={styles.footer}>
            <button onClick={onClose} style={styles.btnSecondary}>Đóng</button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Step Navigation Handlers ────────────────────────────────────────────────
  const handleStartLesson = () => {
    if (vocabulary.length > 0) {
      setStep('flashcards');
      setFlashcardIndex(0);
    } else if (questions.length > 0) {
      setStep('quiz');
      setQuizIndex(0);
    } else {
      setStep('result');
    }
  };

  const handleNextFlashcard = () => {
    if (flashcardIndex < vocabulary.length - 1) {
      setFlashcardIndex((prev) => prev + 1);
    } else {
      // Transition from flashcards to quiz
      if (questions.length > 0) {
        setStep('quiz');
        setQuizIndex(0);
        setSelectedAnswer(null);
        setIsAnswerSubmitted(false);
      } else {
        setStep('result');
      }
    }
  };

  const handlePrevFlashcard = () => {
    if (flashcardIndex > 0) {
      setFlashcardIndex((prev) => prev - 1);
    }
  };

  // ─── Quiz Answer Selection Handler ──────────────────────────────────────────
  const handleSelectAnswer = (optionIdx) => {
    if (isAnswerSubmitted) return; // Prevent rapid multi-clicks

    const currentQ = questions[quizIndex];
    if (!currentQ) return;

    setSelectedAnswer(optionIdx);
    setIsAnswerSubmitted(true);

    const isCorrect = optionIdx === currentQ.answer;
    const recordedAnswer = {
      questionId: currentQ.id,
      selected: optionIdx,
      correct: currentQ.answer,
      isCorrect,
    };

    setAnswers((prev) => [...prev, recordedAnswer]);
  };

  const handleNextQuestion = () => {
    if (quizIndex < questions.length - 1) {
      setQuizIndex((prev) => prev + 1);
      setSelectedAnswer(null);
      setIsAnswerSubmitted(false);
    } else {
      // Finalize quiz results
      const totalQ = questions.length;
      const correctAnswers = answers.filter((a) => a.isCorrect).length;
      const calculatedScore = totalQ > 0 ? Math.round((correctAnswers / totalQ) * 100) : 0;
      setScore(calculatedScore);
      setStep('result');
    }
  };

  // ─── Reward Claim Callback (Score >= 60) ────────────────────────────────────
  const handleClaimReward = async () => {
    if (score < PASS_THRESHOLD || isSubmitting) return;
    setIsSubmitting(true);
    try {
      if (onComplete) {
        await onComplete({
          questId,
          unitId: unit.id,
          score,
        });
      }
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Retry Handler (Resets transient state) ──────────────────────────────────
  const handleRetry = () => {
    resetLessonState();
    setStep('flashcards');
  };

  // Current sub-states for rendering
  const currentCard = vocabulary[flashcardIndex];
  const currentQ = questions[quizIndex];
  const isPassed = score >= PASS_THRESHOLD;

  return (
    <div style={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="lesson-modal-title">
      <div style={styles.modal}>
        {/* ─── Modal Header ──────────────────────────────────────────── */}
        <div style={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Chip color="var(--indigo)" bg="var(--indigo-d)">
              QUEST {questId} · UNIT {unit.id}
            </Chip>
            <h3 id="lesson-modal-title" style={styles.title}>
              {lessonData.title}
            </h3>
          </div>
          <button
            onClick={onClose}
            style={styles.closeBtn}
            aria-label="Đóng bài học"
            title="Đóng bài học"
          >
            ✕
          </button>
        </div>

        {/* ─── STEP 1: INTRO ──────────────────────────────────────────── */}
        {step === 'intro' && (
          <div style={styles.body}>
            <div style={styles.introHero}>
              <div style={styles.introBadge}>📖 Lộ Trình Chiến Binh</div>
              <h2 style={styles.introHeading}>{lessonData.title}</h2>
              <p style={styles.introDesc}>{lessonData.intro}</p>
            </div>

            <div style={styles.statsGrid}>
              <div style={styles.statCard}>
                <span style={{ fontSize: 24 }}>🔤</span>
                <div>
                  <div style={styles.statValue}>{vocabulary.length} Từ vựng</div>
                  <div style={styles.statSub}>Học qua thẻ Flashcard</div>
                </div>
              </div>

              <div style={styles.statCard}>
                <span style={{ fontSize: 24 }}>⚔️</span>
                <div>
                  <div style={styles.statValue}>{questions.length} Thử thách</div>
                  <div style={styles.statSub}>Câu hỏi trắc nghiệm</div>
                </div>
              </div>

              <div style={styles.statCard}>
                <span style={{ fontSize: 24 }}>🎯</span>
                <div>
                  <div style={styles.statValue}>60% Điểm chuẩn</div>
                  <div style={styles.statSub}>Cần vượt qua để nhận thưởng</div>
                </div>
              </div>
            </div>

            <div style={styles.footer}>
              <button onClick={onClose} style={styles.btnSecondary}>
                Hủy bỏ
              </button>
              <button onClick={handleStartLesson} style={styles.btnPrimary}>
                Bắt đầu học ➜
              </button>
            </div>
          </div>
        )}

        {/* ─── STEP 2: VOCABULARY FLASHCARDS ───────────────────────────── */}
        {step === 'flashcards' && currentCard && (
          <div style={styles.body}>
            {/* Progress indicator */}
            <div style={{ marginBottom: 16 }}>
              <div style={styles.progressRow}>
                <span style={styles.progressLabel}>
                  Thẻ từ vựng {flashcardIndex + 1} / {vocabulary.length}
                </span>
                <span style={styles.progressValue}>
                  {Math.round(((flashcardIndex + 1) / vocabulary.length) * 100)}%
                </span>
              </div>
              <Bar pct={((flashcardIndex + 1) / vocabulary.length) * 100} color="var(--indigo)" height={6} />
            </div>

            {/* Flashcard container */}
            <div style={styles.flashcard}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Chip color="var(--gold)" bg="var(--gold-d)">
                  TỪ VỰNG CỐT LÕI #{flashcardIndex + 1}
                </Chip>
                <button
                  onClick={() => speakText(currentCard.word)}
                  style={styles.audioBtn}
                  title="Nghe phát âm chuẩn"
                  aria-label={`Nghe phát âm từ ${currentCard.word}`}
                >
                  🔊 Nghe
                </button>
              </div>

              <div style={styles.wordTitle}>{currentCard.word}</div>
              <div style={styles.phoneticText}>{currentCard.phonetic}</div>

              <div style={styles.meaningBox}>
                <div style={styles.meaningLabel}>Ý nghĩa:</div>
                <div style={styles.meaningText}>{currentCard.meaning}</div>
              </div>

              <div style={styles.exampleBox}>
                <div style={styles.exampleLabel}>Ví dụ thực tế:</div>
                <div style={styles.exampleText}>"{currentCard.example}"</div>
              </div>
            </div>

            {/* Flashcard controls */}
            <div style={styles.footer}>
              <button
                onClick={handlePrevFlashcard}
                disabled={flashcardIndex === 0}
                style={{
                  ...styles.btnSecondary,
                  opacity: flashcardIndex === 0 ? 0.4 : 1,
                  cursor: flashcardIndex === 0 ? 'not-allowed' : 'pointer',
                }}
              >
                ← Quay lại
              </button>

              <button onClick={handleNextFlashcard} style={styles.btnPrimary}>
                {flashcardIndex === vocabulary.length - 1 ? 'Vào thử thách ⚔️' : 'Từ tiếp theo ➜'}
              </button>
            </div>
          </div>
        )}

        {/* ─── STEP 3: PRACTICE QUIZ ──────────────────────────────────── */}
        {step === 'quiz' && currentQ && (
          <div style={styles.body}>
            {/* Progress indicator */}
            <div style={{ marginBottom: 16 }}>
              <div style={styles.progressRow}>
                <span style={styles.progressLabel}>
                  Thử thách {quizIndex + 1} / {questions.length}
                </span>
                <span style={styles.progressValue}>
                  {Math.round(((quizIndex + 1) / questions.length) * 100)}%
                </span>
              </div>
              <Bar pct={((quizIndex + 1) / questions.length) * 100} color="var(--purple)" height={6} />
            </div>

            {/* Question prompt */}
            <div style={styles.questionBox}>
              <div style={styles.questionNumber}>CÂU HỎI {quizIndex + 1}:</div>
              <div style={styles.questionText}>{currentQ.question}</div>
            </div>

            {/* Options list */}
            <div style={styles.optionsGrid}>
              {currentQ.options.map((opt, idx) => {
                const isSelected = selectedAnswer === idx;
                const isCorrectOpt = idx === currentQ.answer;

                let optStyle = { ...styles.optionBtn };
                let badgeStyle = { ...styles.optionBadge };

                if (isAnswerSubmitted) {
                  if (isCorrectOpt) {
                    optStyle = { ...optStyle, ...styles.optionCorrect };
                    badgeStyle = { ...badgeStyle, background: 'var(--green)', color: '#000' };
                  } else if (isSelected && !isCorrectOpt) {
                    optStyle = { ...optStyle, ...styles.optionWrong };
                    badgeStyle = { ...badgeStyle, background: 'var(--red)', color: '#fff' };
                  } else {
                    optStyle = { ...optStyle, opacity: 0.5 };
                  }
                } else if (isSelected) {
                  optStyle = { ...optStyle, ...styles.optionSelected };
                }

                const labels = ['A', 'B', 'C', 'D'];

                return (
                  <button
                    key={idx}
                    onClick={() => handleSelectAnswer(idx)}
                    disabled={isAnswerSubmitted}
                    style={optStyle}
                  >
                    <span style={badgeStyle}>{labels[idx]}</span>
                    <span style={{ flex: 1, textAlign: 'left' }}>{opt}</span>
                    {isAnswerSubmitted && isCorrectOpt && <span style={{ color: 'var(--green)', fontWeight: 800 }}>✓</span>}
                    {isAnswerSubmitted && isSelected && !isCorrectOpt && <span style={{ color: 'var(--red)', fontWeight: 800 }}>✕</span>}
                  </button>
                );
              })}
            </div>

            {/* Explanation and next button */}
            {isAnswerSubmitted && (
              <div
                style={{
                  ...styles.feedbackBox,
                  borderColor: selectedAnswer === currentQ.answer ? 'rgba(16,185,129,.4)' : 'rgba(239,68,68,.4)',
                  background: selectedAnswer === currentQ.answer ? 'rgba(16,185,129,.08)' : 'rgba(239,68,68,.08)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 13, color: selectedAnswer === currentQ.answer ? 'var(--green)' : 'var(--red)' }}>
                  {selectedAnswer === currentQ.answer ? '🎉 Chính xác!' : '💡 Chưa chính xác!'}
                </div>
                <div style={styles.explanationText}>
                  {currentQ.explanation}
                </div>
                <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
                  <button onClick={handleNextQuestion} style={styles.btnPrimary}>
                    {quizIndex === questions.length - 1 ? 'Xem kết quả 🏆' : 'Câu tiếp theo ➜'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── STEP 4: RESULT ─────────────────────────────────────────── */}
        {step === 'result' && (
          <div style={styles.body}>
            <div style={styles.resultContainer}>
              <div style={{ fontSize: 56, marginBottom: 8 }}>
                {isPassed ? '🏆' : '🛡️'}
              </div>

              <h2 style={{ ...styles.resultTitle, color: isPassed ? 'var(--gold)' : 'var(--t2)' }}>
                {isPassed ? 'Chiến Thắng Rực Rỡ!' : 'Chưa Đạt Yêu Cầu'}
              </h2>

              <p style={styles.resultSubtitle}>
                {isPassed
                  ? 'Bạn đã hoàn thành xuất sắc thử thách và đủ điều kiện hoàn thành bài học.'
                  : `Bạn cần ít nhất ${PASS_THRESHOLD}% điểm để hoàn thành bài học.`}
              </p>

              {/* Score Card */}
              <div style={styles.scoreCard}>
                <div style={styles.scoreRow}>
                  <span style={styles.scoreLabel}>Điểm đạt được:</span>
                  <span style={{ ...styles.scoreValue, color: isPassed ? 'var(--green)' : 'var(--red)' }}>
                    {score}%
                  </span>
                </div>
                <div style={styles.scoreRow}>
                  <span style={styles.scoreLabel}>Số câu đúng:</span>
                  <span style={{ fontSize: 14, color: 'var(--t1)', fontWeight: 700 }}>
                    {answers.filter((a) => a.isCorrect).length} / {questions.length} câu
                  </span>
                </div>
                <div style={{ marginTop: 10 }}>
                  <Bar pct={score} color={isPassed ? 'var(--green)' : 'var(--red)'} height={8} glow={isPassed} />
                </div>
              </div>

              {/* Action Buttons */}
              <div style={styles.footer}>
                {!isPassed ? (
                  <>
                    <button onClick={onClose} style={styles.btnSecondary}>
                      Đóng
                    </button>
                    <button onClick={handleRetry} style={styles.btnPrimary}>
                      Thử lại 🔄
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleClaimReward}
                    disabled={isSubmitting}
                    style={{ ...styles.btnPrimary, background: 'var(--green)', boxShadow: '0 4px 16px rgba(16,185,129,.4)' }}
                  >
                    {isSubmitting ? 'Đang xác nhận...' : 'Nhận thưởng 🎁'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Component Styles (Clean Dark RPG Token Alignment) ─────────────────────────
const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 9999,
    background: 'rgba(5, 8, 14, 0.85)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  modal: {
    width: '100%',
    maxWidth: 620,
    background: 'var(--s1)',
    border: '1px solid var(--bd2)',
    borderRadius: 'var(--r-xl)',
    boxShadow: '0 24px 64px rgba(0, 0, 0, 0.6), 0 0 20px rgba(99, 102, 241, 0.15)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    maxHeight: '92vh',
    animation: 'modalFadeIn .2s ease-out',
  },
  header: {
    padding: '16px 20px',
    background: 'var(--s2)',
    borderBottom: '1px solid var(--bd)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    margin: 0,
    fontSize: 16,
    fontWeight: 800,
    color: 'var(--t1)',
    fontFamily: "'Nunito', sans-serif",
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--t3)',
    fontSize: 18,
    cursor: 'pointer',
    padding: '4px 8px',
    borderRadius: 'var(--r-xs)',
    transition: 'color .15s',
  },
  body: {
    padding: 24,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  introHero: {
    padding: 20,
    background: 'linear-gradient(135deg, rgba(99,102,241,.15) 0%, rgba(139,92,246,.05) 100%)',
    borderRadius: 'var(--r-lg)',
    border: '1px solid rgba(99,102,241,.2)',
  },
  introBadge: {
    fontSize: 11,
    fontWeight: 700,
    color: 'var(--indigo)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: 6,
  },
  introHeading: {
    margin: '0 0 8px',
    fontSize: 22,
    fontWeight: 900,
    color: 'var(--t1)',
    fontFamily: "'Nunito', sans-serif",
  },
  introDesc: {
    margin: 0,
    fontSize: 14,
    lineHeight: 1.6,
    color: 'var(--t2)',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
    gap: 12,
  },
  statCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    background: 'var(--s2)',
    border: '1px solid var(--bd)',
    borderRadius: 'var(--r)',
  },
  statValue: {
    fontSize: 14,
    fontWeight: 800,
    color: 'var(--t1)',
  },
  statSub: {
    fontSize: 11,
    color: 'var(--t3)',
    marginTop: 2,
  },
  progressRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 12,
    marginBottom: 6,
  },
  progressLabel: {
    color: 'var(--t2)',
    fontWeight: 600,
  },
  progressValue: {
    color: 'var(--t3)',
    fontFamily: 'monospace',
  },
  flashcard: {
    padding: 24,
    background: 'linear-gradient(180deg, var(--s2) 0%, var(--s3) 100%)',
    border: '1px solid var(--bd2)',
    borderRadius: 'var(--r-lg)',
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
  },
  wordTitle: {
    fontSize: 32,
    fontWeight: 900,
    color: 'var(--t1)',
    letterSpacing: '-.5px',
    fontFamily: "'Nunito', sans-serif",
  },
  phoneticText: {
    fontSize: 15,
    fontFamily: 'monospace',
    color: 'var(--gold)',
    marginTop: -8,
  },
  audioBtn: {
    background: 'rgba(255,255,255,.08)',
    border: '1px solid var(--bd2)',
    borderRadius: 999,
    padding: '4px 12px',
    color: 'var(--t1)',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  meaningBox: {
    padding: 14,
    background: 'rgba(0,0,0,.25)',
    borderRadius: 'var(--r-sm)',
    borderLeft: '3px solid var(--indigo)',
  },
  meaningLabel: {
    fontSize: 11,
    color: 'var(--t3)',
    fontWeight: 700,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  meaningText: {
    fontSize: 15,
    fontWeight: 700,
    color: 'var(--t1)',
  },
  exampleBox: {
    padding: 14,
    background: 'rgba(0,0,0,.15)',
    borderRadius: 'var(--r-sm)',
  },
  exampleLabel: {
    fontSize: 11,
    color: 'var(--t3)',
    fontWeight: 700,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  exampleText: {
    fontSize: 14,
    fontStyle: 'italic',
    color: 'var(--t2)',
    lineHeight: 1.5,
  },
  questionBox: {
    padding: 18,
    background: 'var(--s2)',
    borderRadius: 'var(--r)',
    border: '1px solid var(--bd2)',
  },
  questionNumber: {
    fontSize: 11,
    color: 'var(--purple-light)',
    fontWeight: 800,
    letterSpacing: '0.05em',
    marginBottom: 6,
  },
  questionText: {
    fontSize: 16,
    fontWeight: 700,
    color: 'var(--t1)',
    lineHeight: 1.5,
  },
  optionsGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  optionBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '14px 16px',
    background: 'var(--s2)',
    border: '1.5px solid var(--bd)',
    borderRadius: 'var(--r)',
    color: 'var(--t1)',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all .12s ease',
  },
  optionSelected: {
    borderColor: 'var(--purple)',
    background: 'rgba(139,92,246,.15)',
  },
  optionCorrect: {
    borderColor: 'var(--green)',
    background: 'rgba(16,185,129,.18)',
  },
  optionWrong: {
    borderColor: 'var(--red)',
    background: 'rgba(239,68,68,.18)',
  },
  optionBadge: {
    width: 24,
    height: 24,
    borderRadius: 6,
    background: 'rgba(255,255,255,.08)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 11,
    fontWeight: 800,
    color: 'var(--t2)',
    flexShrink: 0,
  },
  feedbackBox: {
    padding: 16,
    borderRadius: 'var(--r)',
    border: '1px solid',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  explanationText: {
    fontSize: 13,
    color: 'var(--t2)',
    lineHeight: 1.5,
  },
  resultContainer: {
    textAlign: 'center',
    padding: '20px 10px',
  },
  resultTitle: {
    margin: '0 0 6px',
    fontSize: 24,
    fontWeight: 900,
    fontFamily: "'Nunito', sans-serif",
  },
  resultSubtitle: {
    margin: '0 auto 20px',
    maxWidth: 420,
    fontSize: 14,
    color: 'var(--t2)',
    lineHeight: 1.5,
  },
  scoreCard: {
    padding: 20,
    background: 'var(--s2)',
    borderRadius: 'var(--r-lg)',
    border: '1px solid var(--bd2)',
    marginBottom: 20,
  },
  scoreRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  scoreLabel: {
    fontSize: 14,
    color: 'var(--t2)',
  },
  scoreValue: {
    fontSize: 22,
    fontWeight: 900,
    fontFamily: 'monospace',
  },
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  btnPrimary: {
    flex: 1,
    padding: '12px 20px',
    background: 'var(--indigo)',
    border: 'none',
    borderRadius: 'var(--r)',
    color: '#fff',
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: "'Nunito', sans-serif",
    boxShadow: '0 4px 14px rgba(99,102,241,.3)',
    transition: 'all .15s',
  },
  btnSecondary: {
    padding: '12px 20px',
    background: 'transparent',
    border: '1px solid var(--bd2)',
    borderRadius: 'var(--r)',
    color: 'var(--t2)',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: "'Nunito', sans-serif",
    transition: 'all .15s',
  },
};
