import React, { useState, useEffect } from 'react';
import { CODEX_ENTRY } from '../constants/gameData';
import { dictionaryApi } from '../api';
import { useProgressStore } from '../context/progressStore';
import toast from 'react-hot-toast';

const DEFAULT_RECENT = ['Serendipity', 'Ephemeral', 'Nostalgia', 'Melancholy', 'Ubiquitous', 'Eloquent'];

export default function Dictionary() {
  const [query, setQuery] = useState('Serendipity');
  const [tab, setTab] = useState('meaning');
  const [xpPopped, setXpPopped] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState(null);
  const [entry, setEntry] = useState(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [recent, setRecent] = useState(() => {
    try {
      const stored = localStorage.getItem('engjoy_recent_searches');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return DEFAULT_RECENT;
  });

  const savedWords = useProgressStore((s) => s.savedWords || []);
  const saveWord = useProgressStore((s) => s.saveWord);
  const normalize = (word) => String(word || '').toLowerCase().trim();

  async function handleSearch(targetWord) {
    const wordToSearch = normalize(targetWord !== undefined ? targetWord : query);
    if (!wordToSearch) {
      toast('Vui lòng nhập từ tiếng Anh cần tra!');
      return;
    }
    if (loading) return;
    setLoading(true);
    setError(null);
    setNotFound(false);
    try {
      const res = await dictionaryApi.lookup(wordToSearch);
      const data = res?.data || res;
      if (data && data.word) {
        setEntry(data);
        const formattedWord = data.word.charAt(0).toUpperCase() + data.word.slice(1);
        setQuery(formattedWord);
        setRecent((previous) => {
          const filtered = previous.filter((item) => item.toLowerCase() !== data.word.toLowerCase());
          const next = [formattedWord, ...filtered].slice(0, 6);
          try { localStorage.setItem('engjoy_recent_searches', JSON.stringify(next)); } catch {}
          return next;
        });
      } else {
        setNotFound(true);
        setEntry(null);
      }
    } catch (err) {
      const status = err?.response?.status || err?.status;
      const is404 = status === 404 || err?.message?.includes('404') || err?.message?.includes('not found');
      if (is404) {
        setNotFound(true);
        setEntry(null);
      } else {
        console.error('Lỗi khi tra từ điển:', err);
        setError(err?.message || 'Không thể kết nối đến máy chủ từ điển.');
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let mounted = true;
    async function initialLoad() {
      setLoading(true);
      setError(null);
      setNotFound(false);
      try {
        const res = await dictionaryApi.lookup('serendipity');
        const data = res?.data || res;
        if (mounted && data && data.word) {
          setEntry(data);
          setQuery('Serendipity');
        }
      } catch (err) {
        console.warn('Initial dictionary API fetch failed, using demo fallback:', err.message);
        if (mounted) setEntry(CODEX_ENTRY);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    initialLoad();
    return () => { mounted = false; };
  }, []);

  const primaryAudioUrl = entry?.audio?.us || entry?.audio?.uk || entry?.phonetics?.find((phonetic) => phonetic?.audio)?.audio || '';

  function fallbackSpeech(text) {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      setIsPlayingAudio(true);
      utterance.onend = () => setIsPlayingAudio(false);
      utterance.onerror = () => setIsPlayingAudio(false);
      window.speechSynthesis.speak(utterance);
    } else {
      setIsPlayingAudio(false);
    }
  }

  function handlePlayAudio() {
    const wordToSpeak = entry?.word || query;
    if (!primaryAudioUrl) {
      fallbackSpeech(wordToSpeak);
      return;
    }
    try {
      const audio = new Audio(primaryAudioUrl);
      setIsPlayingAudio(true);
      audio.onended = () => setIsPlayingAudio(false);
      audio.onerror = () => fallbackSpeech(wordToSpeak);
      audio.play().catch(() => {
        audio.pause();
        fallbackSpeech(wordToSpeak);
      });
    } catch {
      fallbackSpeech(wordToSpeak);
    }
  }

  const currentWordKey = normalize(entry?.word || query);
  const isSaved = savedWords.includes(currentWordKey);

  async function handleSave() {
    if (!currentWordKey || isSaved || isSaving) return;
    setIsSaving(true);
    try {
      const result = await saveWord(currentWordKey, 15);
      if (result?.success) {
        setXpPopped(true);
        setTimeout(() => setXpPopped(false), 1800);
        // Keep the UI locked; the progression store now owns the saved state.
      } else {
        setIsSaving(false);
        toast.error('Không thể lưu từ vựng. Vui lòng thử lại.');
      }
    } catch (saveError) {
      setIsSaving(false);
      toast.error(saveError?.message || 'Không thể lưu từ vựng. Vui lòng thử lại.');
    }
  }

  const displayWord = entry?.word ? entry.word.charAt(0).toUpperCase() + entry.word.slice(1) : query;
  const phoneticText = entry?.phonetics?.[0]?.text || entry?.primaryPhonetic || entry?.phonetic || '';
  const partOfSpeech = entry?.meanings?.[0]?.partOfSpeech || entry?.type || 'noun';
  const levelTag = entry?.level || 'B2';
  const freqTag = typeof entry?.frequency === 'number' ? (entry.frequency >= 4 ? 'High' : entry.frequency >= 2 ? 'Medium' : 'Normal') : entry?.freq || 'Normal';
  const meaningEn = entry?.meanings?.[0]?.definitions?.[0]?.definition || entry?.meaning || 'Chưa có định nghĩa tiếng Anh.';
  const meaningVn = entry?.meanings?.[0]?.examples?.[0]?.translation || entry?.meaning_vn || '';
  const synonyms = entry?.meanings ? Array.from(new Set(entry.meanings.flatMap((meaning) => (meaning.definitions || []).flatMap((definition) => definition.synonyms || [])))).filter(Boolean) : entry?.synonyms || [];
  const antonyms = entry?.meanings ? Array.from(new Set(entry.meanings.flatMap((meaning) => (meaning.definitions || []).flatMap((definition) => definition.antonyms || [])))).filter(Boolean) : entry?.antonyms || [];
  const rawExamples = entry?.meanings ? entry.meanings.flatMap((meaning) => meaning.examples || []) : entry?.examples || [];
  const examplesList = rawExamples.map((example) => {
    if (typeof example === 'string') return { sentence: example, translation: '' };
    if (example?.sentence) return { sentence: example.sentence, translation: example.translation || '' };
    return null;
  }).filter(Boolean);
  const collocations = entry?.collocations || (synonyms.length > 0 ? synonyms.slice(0, 3).map((word) => `a moment of ${word}`) : ['in context', 'common usage']);
  const originStory = entry?.origin || `Từ vựng "${displayWord}" được ghi chép trong Codex học thuật EngJoy.`;

  const renderState = () => {
    if (loading) return <div className="codex-state"><span className="codex-spinner" /><strong>Đang tìm kiếm trong Codex...</strong></div>;
    if (notFound) return <div id="codex-not-found" className="codex-state"><span className="codex-state-glyph">⌕</span><strong>Không tìm thấy từ “{query}”</strong><p>Hãy kiểm tra chính tả hoặc thử một từ trong lịch sử tìm kiếm.</p><button type="button" className="codex-secondary-action" onClick={() => handleSearch('serendipity')}>Quay lại Serendipity ↗</button></div>;
    if (error) return <div className="codex-state codex-state-error"><span className="codex-state-glyph">!</span><strong>{error}</strong><button type="button" className="codex-secondary-action" onClick={() => handleSearch()}>Thử lại</button></div>;
    if (!entry) return null;
    return (
      <>
        <div className="codex-word-header">
          <div className="codex-word-meta">
            <p className="codex-kicker">Codex entry · active record</p>
            <div className="codex-word-line"><h1 id="codex-word-title" className="codex-word-title">{displayWord}</h1><button type="button" className={`codex-audio ${isPlayingAudio ? 'is-playing' : ''}`} onClick={handlePlayAudio} title="Phát âm" aria-label={`Phát âm ${displayWord}`}>⌁</button></div>
            <div className="codex-tags"><span className="codex-tag cyan">{partOfSpeech}</span><span className="codex-tag cyan">{levelTag}</span><span className="codex-tag gold">FREQ · {freqTag}</span>{phoneticText && <span className="codex-phonetic">{phoneticText}</span>}</div>
          </div>
        </div>
        <div className="codex-tabs" role="tablist">{['meaning', 'examples', 'advanced'].map((item) => <button key={item} type="button" role="tab" aria-selected={tab === item} className={tab === item ? 'is-active' : ''} onClick={() => setTab(item)}>{item === 'meaning' ? 'Nghĩa' : item === 'examples' ? 'Ví dụ' : 'Nâng cao'}</button>)}</div>
        <div className="codex-content">
          {tab === 'meaning' && <div className="codex-meaning"><p className="codex-definition">{meaningEn}</p>{meaningVn && <p className="codex-translation">{meaningVn}</p>}<div className="codex-relations"><RelationGroup label="Đồng nghĩa" items={synonyms} tone="synonym" handleSearch={handleSearch} /><RelationGroup label="Trái nghĩa" items={antonyms} tone="antonym" handleSearch={handleSearch} /></div></div>}
          {tab === 'examples' && <div className="codex-examples">{examplesList.length ? examplesList.map((example, index) => <article key={index}><p>“{example.sentence}”</p>{example.translation && <small>{example.translation}</small>}</article>) : <span className="codex-muted">Chưa có câu ví dụ.</span>}</div>}
          {tab === 'advanced' && <div className="codex-advanced"><div><p className="codex-section-label">Cụm từ thông dụng</p>{collocations.map((item, index) => <div className="codex-collocation" key={index}>“{item}”</div>)}</div><div className="codex-origin"><p>GHI NHỚ NHANH · NGUỒN GỐC</p><span>{originStory}</span></div></div>}
        </div>
        <div className="codex-footer-actions"><div className="codex-primary-action-wrap"><button type="button" id="codex-flashcard-btn" className={`codex-save codex-save-wide ${isSaved ? 'is-saved' : ''}`} disabled={isSaved || isSaving} onClick={handleSave}>{isSaved ? '✓ Đã lưu vào thẻ ôn tập' : isSaving ? 'Đang lưu...' : '+ Thẻ ôn tập · +15 XP'}</button>{xpPopped && <span className="codex-xp-pop">+15 XP</span>}</div><button type="button" className="codex-secondary-action" onClick={() => toast(`💡 Hãy hỏi Joy về cách dùng từ "${displayWord}" trong câu!`)}>Hỏi Joy</button></div>
      </>
    );
  };

  return (
    <main className="codex-page">
      <header className="codex-page-header"><div><p className="codex-kicker">ENGJOY ARCHIVE · VOLUME I</p><h2>The Codex</h2></div><span className="codex-header-status">ONLINE · DICTIONARY LINKED</span></header>
      <div className="codex-grid">
        {/* Search integrations: recent handleSearch(w), synonym handleSearch(s), antonym handleSearch(a). */}
        <aside className="codex-navigator"><div className="codex-section-heading"><span className="codex-index">01</span><div><p className="codex-kicker">The navigator</p><h3>Tra cứu từ</h3></div></div><form className="codex-search" onSubmit={(event) => { event.preventDefault(); handleSearch(); }}><span aria-hidden="true">⌕</span><input id="codex-search-input" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSearch(); } }} placeholder="Nhập từ tiếng Anh..." disabled={loading} /><button id="codex-search-btn" type="submit" disabled={loading}>{loading ? 'Đang tra...' : 'TRA CỨU'}</button></form><div className="codex-history"><p className="codex-section-label">GẦN ĐÂY</p><div className="codex-history-list">{recent.map((word) => <button key={word} type="button" onClick={() => handleSearch(word)}>{word}<span>↗</span></button>)}</div></div><div className="codex-navigator-note"><span>⌬</span><p>Search the archive to decode meaning, usage and origin.</p></div></aside>
        <section id="codex-word-card" className="codex-display" aria-live="polite">{renderState()}</section>
      </div>
    </main>
  );
}

function RelationGroup({ label, items, tone, handleSearch }) {
  return <div className="codex-relation"><p className="codex-section-label">{label}</p><div className="codex-relation-list">{items.length ? items.map((s) => <button type="button" className={`codex-relation-tag ${tone}`} key={s} onClick={() => handleSearch(s)}>{s}</button>) : <span className="codex-muted">Không có</span>}</div></div>;
}
