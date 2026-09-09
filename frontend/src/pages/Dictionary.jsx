import React, { useState, useEffect } from 'react';
import { CODEX_ENTRY } from '../constants/gameData';
import { dictionaryApi } from '../api';
import { useProgressStore } from '../context/progressStore';
import Chip from '../components/common/Chip';
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
  const [audioPlaying, setAudioPlaying] = useState(false);

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

  const normalize = (w) => String(w || '').toLowerCase().trim();

  // Search logic calling existing backend dictionaryApi
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

        // Update recent searches
        setRecent((prev) => {
          const filtered = prev.filter((item) => item.toLowerCase() !== data.word.toLowerCase());
          const next = [formattedWord, ...filtered].slice(0, 6);
          try {
            localStorage.setItem('engjoy_recent_searches', JSON.stringify(next));
          } catch {}
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

  // Initial load: Fetch serendipity from real API with fallback if offline
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
        if (mounted) {
          // If network/backend completely unavailable, preserve UI presentation using demo fallback
          setEntry(CODEX_ENTRY);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    initialLoad();
    return () => {
      mounted = false;
    };
  }, []);

  // Audio Playback
  const primaryAudioUrl =
    entry?.audio?.us ||
    entry?.audio?.uk ||
    entry?.phonetics?.find((p) => p?.audio)?.audio ||
    '';

  function handlePlayAudio() {
    const wordToSpeak = entry?.word || query;
    if (primaryAudioUrl) {
      try {
        const audio = new Audio(primaryAudioUrl);
        setAudioPlaying(true);
        audio
          .play()
          .catch(() => {
            fallbackSpeech(wordToSpeak);
          })
          .finally(() => {
            setTimeout(() => setAudioPlaying(false), 1200);
          });
        return;
      } catch {
        fallbackSpeech(wordToSpeak);
        return;
      }
    }
    fallbackSpeech(wordToSpeak);
  }

  function fallbackSpeech(text) {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      setAudioPlaying(true);
      utterance.onend = () => setAudioPlaying(false);
      utterance.onerror = () => setAudioPlaying(false);
      window.speechSynthesis.speak(utterance);
    }
  }

  // Save Word Integration (Existing server-authoritative progression action)
  const currentWordKey = normalize(entry?.word || query);
  const isSaved = savedWords.includes(currentWordKey);

  async function handleSave() {
    if (!currentWordKey) return;
    if (isSaved) {
      toast('Từ vựng này bạn đã lưu trước đó!');
      return;
    }
    const result = await saveWord(currentWordKey, 15);
    if (result?.success) {
      setXpPopped(true);
      setTimeout(() => setXpPopped(false), 1800);
    }
  }

  // Data mapping from backend document
  const displayWord = entry?.word
    ? entry.word.charAt(0).toUpperCase() + entry.word.slice(1)
    : query;

  const phoneticText =
    entry?.phonetics?.[0]?.text ||
    entry?.primaryPhonetic ||
    entry?.phonetic ||
    '';

  const partOfSpeech =
    entry?.meanings?.[0]?.partOfSpeech ||
    entry?.type ||
    'noun';

  const levelTag = entry?.level || 'B2';

  const freqTag =
    typeof entry?.frequency === 'number'
      ? entry.frequency >= 4
        ? 'High'
        : entry.frequency >= 2
        ? 'Medium'
        : 'Normal'
      : entry?.freq || 'Normal';

  const meaningEn =
    entry?.meanings?.[0]?.definitions?.[0]?.definition ||
    entry?.meaning ||
    'Chưa có định nghĩa tiếng Anh.';

  const meaningVn =
    entry?.meanings?.[0]?.examples?.[0]?.translation ||
    entry?.meaning_vn ||
    '';

  const synonyms = entry?.meanings
    ? Array.from(
        new Set(
          entry.meanings.flatMap((m) =>
            (m.definitions || []).flatMap((d) => d.synonyms || [])
          )
        )
      ).filter(Boolean)
    : entry?.synonyms || [];

  const antonyms = entry?.meanings
    ? Array.from(
        new Set(
          entry.meanings.flatMap((m) =>
            (m.definitions || []).flatMap((d) => d.antonyms || [])
          )
        )
      ).filter(Boolean)
    : entry?.antonyms || [];

  const rawExamples = entry?.meanings
    ? entry.meanings.flatMap((m) => m.examples || [])
    : entry?.examples || [];

  const examplesList = rawExamples
    .map((ex) => {
      if (typeof ex === 'string') return { sentence: ex, translation: '' };
      if (ex && ex.sentence) {
        return { sentence: ex.sentence, translation: ex.translation || '' };
      }
      return null;
    })
    .filter(Boolean);

  const collocations =
    entry?.collocations ||
    (synonyms.length > 0
      ? synonyms.slice(0, 3).map((s) => `a moment of ${s}`)
      : ['in context', 'common usage']);

  const originStory =
    entry?.origin ||
    `Từ vựng "${displayWord}" được ghi chép trong Codex học thuật EngJoy.`;

  return (
    <div style={{ padding: 28, overflow: 'auto', height: '100%', maxWidth: 780 }}>
      <h2
        style={{
          margin: '0 0 18px',
          fontSize: 20,
          fontWeight: 900,
          fontFamily: "'Nunito',sans-serif",
          color: 'var(--t1)',
          letterSpacing: '-.3px',
        }}
      >
        Codex — Từ điển
      </h2>

      {/* Search Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSearch();
        }}
        style={{ display: 'flex', gap: 10, marginBottom: 10 }}
      >
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            background: 'var(--s1)',
            border: '1px solid var(--bd2)',
            borderRadius: 'var(--r)',
            padding: '0 16px',
            height: 48,
          }}
        >
          <svg width={15} height={15} viewBox="0 0 16 16" fill="none">
            <circle cx="7" cy="7" r="4.5" stroke="var(--t3)" strokeWidth="1.5" />
            <path d="M10.5 10.5L14 14" stroke="var(--t3)" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            id="codex-search-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSearch();
              }
            }}
            placeholder="Nhập từ tiếng Anh cần tra..."
            disabled={loading}
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              fontSize: 14,
              color: 'var(--t1)',
              background: 'none',
              fontFamily: "'Nunito',sans-serif",
              fontWeight: 600,
            }}
          />
        </div>
        <button
          id="codex-search-btn"
          type="submit"
          disabled={loading}
          style={{
            padding: '0 24px',
            background: loading ? 'var(--bd2)' : 'var(--indigo)',
            border: 'none',
            borderRadius: 'var(--r)',
            color: '#fff',
            fontWeight: 700,
            fontSize: 14,
            cursor: loading ? 'not-allowed' : 'pointer',
            fontFamily: "'Nunito',sans-serif",
            boxShadow: '0 4px 12px rgba(99,102,241,.3)',
            transition: 'all .15s ease',
          }}
        >
          {loading ? 'Đang tra...' : 'Tra'}
        </button>
      </form>

      {/* Recent Keywords */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 22, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: 'var(--t3)' }}>Gần đây:</span>
        {recent.map((w) => (
          <button
            key={w}
            type="button"
            onClick={() => handleSearch(w)}
            style={{
              padding: '3px 10px',
              background: 'var(--s2)',
              border: '1px solid var(--bd)',
              borderRadius: 999,
              color: 'var(--t2)',
              fontSize: 12,
              cursor: 'pointer',
              fontWeight: 600,
              transition: 'background .15s',
            }}
          >
            {w}
          </button>
        ))}
      </div>

      {/* ─── LOADING STATE ─── */}
      {loading && (
        <div
          style={{
            background: 'var(--s1)',
            border: '1px solid var(--bd2)',
            borderRadius: 'var(--r-xl)',
            padding: '48px 24px',
            textAlign: 'center',
            boxShadow: 'var(--sh)',
          }}
        >
          <div
            style={{
              display: 'inline-block',
              width: 32,
              height: 32,
              border: '3px solid var(--bd2)',
              borderTopColor: 'var(--indigo)',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              marginBottom: 12,
            }}
          />
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--t2)' }}>
            Đang tìm kiếm trong Codex...
          </div>
        </div>
      )}

      {/* ─── NOT FOUND STATE (HTTP 404) ─── */}
      {!loading && notFound && (
        <div
          id="codex-not-found"
          style={{
            background: 'var(--s1)',
            border: '1px solid var(--bd2)',
            borderRadius: 'var(--r-xl)',
            padding: '44px 28px',
            textAlign: 'center',
            boxShadow: 'var(--sh)',
          }}
        >
          <div style={{ fontSize: 42, marginBottom: 12 }}>🔍</div>
          <div
            style={{
              fontSize: 18,
              fontWeight: 900,
              fontFamily: "'Nunito',sans-serif",
              color: 'var(--t1)',
              marginBottom: 8,
            }}
          >
            Không tìm thấy từ "{query}" trong Codex
          </div>
          <p
            style={{
              margin: '0 auto 20px',
              fontSize: 13,
              color: 'var(--t3)',
              maxWidth: 420,
              lineHeight: '1.6',
            }}
          >
            Từ này chưa có trong kho dữ liệu mẫu. Hãy kiểm tra lại chính tả hoặc thử một trong các từ gợi ý gần đây.
          </p>
          <button
            type="button"
            onClick={() => handleSearch('serendipity')}
            style={{
              padding: '8px 18px',
              background: 'var(--s2)',
              border: '1px solid var(--bd2)',
              borderRadius: 'var(--r-sm)',
              color: 'var(--indigo)',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
              fontFamily: "'Nunito',sans-serif",
            }}
          >
            Quay lại Serendipity ↺
          </button>
        </div>
      )}

      {/* ─── NETWORK ERROR STATE ─── */}
      {!loading && !notFound && error && (
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--r-xl)',
            padding: '36px 28px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 32, marginBottom: 10 }}>⚠️</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#ef4444', marginBottom: 6 }}>
            {error}
          </div>
          <button
            type="button"
            onClick={() => handleSearch()}
            style={{
              marginTop: 12,
              padding: '8px 18px',
              background: '#ef4444',
              border: 'none',
              borderRadius: 'var(--r-sm)',
              color: '#fff',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            Thử lại
          </button>
        </div>
      )}

      {/* ─── WORD DETAILS CARD (SUCCESS) ─── */}
      {!loading && !notFound && !error && entry && (
        <div
          id="codex-word-card"
          style={{
            background: 'var(--s1)',
            border: '1px solid var(--bd2)',
            borderRadius: 'var(--r-xl)',
            overflow: 'hidden',
            boxShadow: 'var(--sh)',
          }}
        >
          <div
            style={{
              padding: '24px 28px',
              background: 'linear-gradient(135deg, rgba(99,102,241,.08), rgba(139,92,246,.04))',
              borderBottom: '1px solid var(--bd)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div>
                <div
                  id="codex-word-title"
                  style={{
                    fontSize: 34,
                    fontWeight: 900,
                    fontFamily: "'Nunito',sans-serif",
                    color: 'var(--t1)',
                    letterSpacing: '-.5px',
                    marginBottom: 6,
                  }}
                >
                  {displayWord}
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  {phoneticText && (
                    <span style={{ fontSize: 13, color: 'var(--t2)', fontFamily: 'monospace' }}>
                      {phoneticText}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={handlePlayAudio}
                    title="Phát âm"
                    style={{
                      fontSize: 12,
                      background: audioPlaying ? 'var(--indigo-d)' : 'var(--s2)',
                      border: '1px solid var(--bd)',
                      borderRadius: 6,
                      color: 'var(--indigo)',
                      cursor: 'pointer',
                      padding: '3px 8px',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    🔊 {audioPlaying ? 'Đang phát...' : 'Phát âm'}
                  </button>
                  <Chip color="var(--t2)" bg="var(--s2)">
                    {partOfSpeech}
                  </Chip>
                  <Chip color="var(--purple)" bg="var(--purple-d)">
                    {levelTag}
                  </Chip>
                  <Chip color="var(--t3)" bg="var(--s2)">
                    Freq: {freqTag}
                  </Chip>
                </div>
              </div>

              <div style={{ position: 'relative' }}>
                <button
                  type="button"
                  id="codex-save-btn"
                  onClick={handleSave}
                  style={{
                    padding: '6px 14px',
                    background: isSaved ? 'var(--green-d)' : 'var(--s2)',
                    border: `1px solid ${isSaved ? 'rgba(16,185,129,.4)' : 'var(--bd2)'}`,
                    borderRadius: 'var(--r-sm)',
                    color: isSaved ? 'var(--green)' : 'var(--t1)',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: isSaved ? 'default' : 'pointer',
                    fontFamily: "'Nunito',sans-serif",
                  }}
                >
                  {isSaved ? '✓ Đã lưu' : 'Lưu từ'}
                </button>
                {xpPopped && (
                  <div
                    style={{
                      position: 'absolute',
                      top: -28,
                      right: 0,
                      background: 'var(--gold-d)',
                      border: '1px solid var(--gold)',
                      borderRadius: 999,
                      padding: '2px 8px',
                      fontSize: 11,
                      fontWeight: 800,
                      color: 'var(--gold)',
                      whiteSpace: 'nowrap',
                      animation: 'slide-up .3s ease',
                    }}
                  >
                    +15 XP
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--bd)' }}>
            {['meaning', 'examples', 'advanced'].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                style={{
                  flex: 1,
                  padding: '12px',
                  border: 'none',
                  background: 'transparent',
                  color: tab === t ? 'var(--indigo)' : 'var(--t3)',
                  fontWeight: tab === t ? 700 : 500,
                  fontSize: 13,
                  cursor: 'pointer',
                  borderBottom: `2px solid ${tab === t ? 'var(--indigo)' : 'transparent'}`,
                  fontFamily: "'Nunito',sans-serif",
                  transition: 'all .12s',
                }}
              >
                {t === 'meaning' ? 'Nghĩa' : t === 'examples' ? 'Ví dụ' : 'Nâng cao'}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div style={{ padding: '24px 28px' }}>
            {tab === 'meaning' && (
              <div>
                <p
                  style={{
                    margin: '0 0 10px',
                    fontSize: 15,
                    color: 'var(--t1)',
                    lineHeight: '1.7',
                    fontWeight: 500,
                  }}
                >
                  {meaningEn}
                </p>
                {meaningVn && (
                  <p
                    style={{
                      margin: '0 0 20px',
                      fontSize: 13,
                      color: 'var(--purple)',
                      fontStyle: 'italic',
                      lineHeight: '1.6',
                    }}
                  >
                    {meaningVn}
                  </p>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <div
                      style={{
                        fontSize: 11,
                        color: 'var(--t3)',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '.5px',
                        marginBottom: 8,
                      }}
                    >
                      Đồng nghĩa
                    </div>
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                      {synonyms.length > 0 ? (
                        synonyms.map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => handleSearch(s)}
                            style={{
                              padding: '3px 10px',
                              background: 'var(--s2)',
                              border: '1px solid var(--bd)',
                              borderRadius: 999,
                              color: 'var(--indigo)',
                              fontSize: 12,
                              cursor: 'pointer',
                              fontWeight: 600,
                            }}
                          >
                            {s}
                          </button>
                        ))
                      ) : (
                        <span style={{ fontSize: 12, color: 'var(--t3)' }}>Không có</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: 11,
                        color: 'var(--t3)',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '.5px',
                        marginBottom: 8,
                      }}
                    >
                      Trái nghĩa
                    </div>
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                      {antonyms.length > 0 ? (
                        antonyms.map((a) => (
                          <button
                            key={a}
                            type="button"
                            onClick={() => handleSearch(a)}
                            style={{
                              padding: '3px 10px',
                              background: 'var(--s2)',
                              border: '1px solid var(--bd)',
                              borderRadius: 999,
                              color: 'var(--t2)',
                              fontSize: 12,
                              cursor: 'pointer',
                              fontWeight: 600,
                            }}
                          >
                            {a}
                          </button>
                        ))
                      ) : (
                        <span style={{ fontSize: 12, color: 'var(--t3)' }}>Không có</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {tab === 'examples' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {examplesList.length > 0 ? (
                  examplesList.map((ex, i) => (
                    <div
                      key={i}
                      style={{
                        padding: '14px 16px',
                        background: 'var(--s2)',
                        border: '1px solid var(--bd)',
                        borderRadius: 'var(--r)',
                        borderLeft: '3px solid var(--indigo)',
                      }}
                    >
                      <p
                        style={{
                          margin: 0,
                          fontSize: 14,
                          color: 'var(--t1)',
                          fontStyle: 'italic',
                          lineHeight: '1.6',
                        }}
                      >
                        "{ex.sentence}"
                      </p>
                      {ex.translation && (
                        <p
                          style={{
                            margin: '6px 0 0',
                            fontSize: 12,
                            color: 'var(--t3)',
                            lineHeight: '1.5',
                          }}
                        >
                          {ex.translation}
                        </p>
                      )}
                    </div>
                  ))
                ) : (
                  <div style={{ color: 'var(--t3)', fontSize: 13 }}>Chưa có câu ví dụ.</div>
                )}
              </div>
            )}

            {tab === 'advanced' && (
              <div>
                <div style={{ marginBottom: 18 }}>
                  <div
                    style={{
                      fontSize: 11,
                      color: 'var(--t3)',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '.5px',
                      marginBottom: 10,
                    }}
                  >
                    Cụm từ thông dụng
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {collocations.map((c, i) => (
                      <div
                        key={i}
                        style={{
                          padding: '9px 12px',
                          background: 'var(--s2)',
                          border: '1px solid var(--bd)',
                          borderRadius: 'var(--r-sm)',
                          fontSize: 13,
                          color: 'var(--t1)',
                          fontStyle: 'italic',
                        }}
                      >
                        "{c}"
                      </div>
                    ))}
                  </div>
                </div>
                <div
                  style={{
                    padding: '14px 16px',
                    background: 'var(--gold-d)',
                    border: '1px solid var(--gold-g)',
                    borderRadius: 'var(--r)',
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--gold)', marginBottom: 4 }}>
                    Ghi nhớ nhanh & Nguồn gốc
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--t2)', lineHeight: '1.6' }}>
                    {originStory}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Card Footer Actions */}
          <div style={{ padding: '0 28px 24px', display: 'flex', gap: 8 }}>
            <button
              type="button"
              id="codex-flashcard-btn"
              onClick={handleSave}
              title="Lưu từ vào bộ từ vựng cá nhân để ôn tập flashcard"
              style={{
                flex: 1,
                padding: '10px',
                background: isSaved ? 'var(--green-d)' : 'var(--indigo)',
                border: `1px solid ${isSaved ? 'rgba(16,185,129,.4)' : 'transparent'}`,
                borderRadius: 'var(--r-sm)',
                color: isSaved ? 'var(--green)' : '#fff',
                fontWeight: 700,
                fontSize: 13,
                cursor: isSaved ? 'default' : 'pointer',
                fontFamily: "'Nunito',sans-serif",
                boxShadow: isSaved ? 'none' : '0 4px 12px rgba(99,102,241,.25)',
              }}
            >
              {isSaved ? '✓ Đã lưu vào thẻ ôn tập' : '+ Thẻ ôn tập · +15 XP'}
            </button>
            <button
              type="button"
              onClick={() => {
                toast(`💡 Hãy hỏi Joy về cách dùng từ "${displayWord}" trong câu!`);
              }}
              style={{
                padding: '10px 16px',
                background: 'transparent',
                border: '1px solid var(--bd2)',
                borderRadius: 'var(--r-sm)',
                color: 'var(--t2)',
                fontSize: 13,
                cursor: 'pointer',
                fontFamily: "'Nunito',sans-serif",
                fontWeight: 600,
              }}
            >
              Hỏi Joy
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
