import { useCallback, useEffect } from 'react';

export default function ArtifactViewer({ card, index, total, onAbsorb, onPrevious, onClose, onSpeak, setActivePhase }) {
  const progress = total ? ((index + 1) / total) * 100 : 0;

  // A standalone viewer can hand control back to the parent phase machine.
  // LessonModal keeps its legacy flashcard callback when this prop is omitted.
  const handleAbsorb = useCallback(() => {
    if (typeof setActivePhase === 'function') {
      setActivePhase('BRIEFING');
      return;
    }
    onAbsorb();
  }, [onAbsorb, setActivePhase]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowLeft' && index > 0) onPrevious();
      if (event.key === 'ArrowRight') handleAbsorb();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleAbsorb, index, onClose, onPrevious]);

  return (
    <section className="artifact-viewer" role="dialog" aria-modal="true" aria-labelledby="artifact-word">
      <div className="artifact-zenith"><i style={{ width: `${progress}%` }} /></div>
      <button type="button" className="artifact-close" onClick={onClose} aria-label="Thoát Artifact Viewer">×</button>
      <div className="artifact-counter">MEMORY {String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}</div>

      <aside className="artifact-hud artifact-hud-left">
        <p>SEMANTIC CORE</p>
        <strong>{card.meaning}</strong>
        <span>Ý nghĩa ký ức</span>
      </aside>
      <aside className="artifact-hud artifact-hud-right">
        <p>RESONANCE</p>
        <strong>{card.phonetic || '—'}</strong>
        <button type="button" onClick={onSpeak} aria-label={`Nghe phát âm ${card.word}`}>◖ PHÁT ÂM</button>
      </aside>

      <div className="artifact-word-wrap">
        <p>ANCIENT LEXICON</p>
        <h1 id="artifact-word">{card.word}</h1>
        {card.example && <q>{card.example}</q>}
      </div>

      {index > 0 && <button className="artifact-back" type="button" onClick={onPrevious}>← Ký ức trước</button>}
      <button className="artifact-absorb" type="button" onClick={handleAbsorb}>
        {index === total - 1 ? 'ABSORB MEMORY · BEGIN TRIAL' : 'ABSORB MEMORY'}
      </button>
    </section>
  );
}
