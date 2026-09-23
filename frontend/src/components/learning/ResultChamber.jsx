import { useState } from 'react';

export default function ResultChamber({ passed, score, rewardGold = 25, hasNextUnit, isQuestComplete, onRetry, onComplete, onRetreat, submitting }) {
  const themeColor = passed ? '#F59E0B' : '#EF4444'; 
  const themeGlow = passed ? 'rgba(245, 158, 11, 0.4)' : 'rgba(239, 68, 68, 0.4)';
  const bgGradient = passed 
    ? 'radial-gradient(ellipse at 50% 40%, rgba(245, 158, 11, 0.15) 0%, rgba(8, 51, 68, 0.1) 40%, transparent 70%)'
    : 'radial-gradient(ellipse at 50% 40%, rgba(239, 68, 68, 0.15) 0%, rgba(8, 51, 68, 0.1) 40%, transparent 70%)';

  return (
    <div
      className="anim-fade-in-up"
      style={{
        width: '100%',
        minHeight: '100vh',
        background: '#030712',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        padding: '20px',
      }}
    >
      <div style={{ position: 'absolute', inset: 0, background: bgGradient, pointerEvents: 'none' }} />

      {/* Decorative Runes */}
      <div style={{ position: 'relative', zIndex: 2, textAlign: 'center' }}>
        <div style={{ 
          fontSize: 84, 
          color: themeColor,
          textShadow: `0 0 40px ${themeGlow}`,
          lineHeight: 1,
          marginBottom: 16,
          animation: 'float-up 3s ease-in-out infinite alternate',
        }}>
          {passed ? '✦' : '✧'}
        </div>

        <p style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 12,
          letterSpacing: '0.2em',
          color: passed ? '#FCD34D' : '#FCA5A5',
          textTransform: 'uppercase',
          marginBottom: 16,
        }}>
          {passed ? 'TRIAL COMPLETED // HOÀN THÀNH ẢI' : 'TRIAL FAILED // CHƯA VƯỢT QUA'}
        </p>

        <h1 style={{
          fontFamily: 'Cinzel, serif',
          fontSize: 'clamp(48px, 8vw, 84px)',
          fontWeight: 700,
          color: '#FFFFFF',
          margin: 0,
          textShadow: `0 0 20px ${themeGlow}, 0 2px 4px rgba(0,0,0,0.5)`,
          letterSpacing: '0.05em',
        }}>
          {passed ? 'VICTORY' : 'DEFEAT'}
        </h1>

        <p style={{
          fontFamily: 'Inter, sans-serif',
          fontSize: 16,
          color: '#94A3B8',
          marginTop: 24,
          maxWidth: 400,
          margin: '24px auto 0',
          lineHeight: 1.5,
        }}>
          {passed 
            ? 'Bạn đã hoàn thành xuất sắc thử thách và hấp thụ toàn bộ tri thức.' 
            : `Đội hình của bạn đã gục ngã. Cần ít nhất 60% điểm để vượt ải.`}
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 16,
          marginTop: 40,
          maxWidth: 320,
          margin: '40px auto 0',
        }}>
          <div style={{
            background: 'rgba(11, 15, 25, 0.8)',
            border: '1px solid rgba(255,255,255,0.05)',
            borderTop: `2px solid ${themeColor}`,
            padding: '16px',
            boxShadow: `0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.02)`,
          }}>
            <b style={{ display: 'block', fontSize: 32, fontFamily: 'JetBrains Mono, monospace', color: themeColor }}>
              {score}%
            </b>
            <small style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, color: '#64748B', letterSpacing: '0.1em' }}>ĐỘ CHÍNH XÁC</small>
          </div>
          <div style={{
            background: 'rgba(11, 15, 25, 0.8)',
            border: '1px solid rgba(255,255,255,0.05)',
            borderTop: `2px solid ${passed ? '#22D3EE' : '#64748B'}`,
            padding: '16px',
            boxShadow: `0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.02)`,
          }}>
            <b style={{ display: 'block', fontSize: 32, fontFamily: 'JetBrains Mono, monospace', color: passed ? '#22D3EE' : '#64748B' }}>
              {passed ? `+${rewardGold}` : '—'}
            </b>
            <small style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, color: '#64748B', letterSpacing: '0.1em' }}>TÀI NGUYÊN</small>
          </div>
        </div>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          marginTop: 40,
          maxWidth: 320,
          margin: '40px auto 0',
        }}>
          {!passed && (
            <button
              onClick={onRetry}
              style={{
                width: '100%',
                height: 52,
                background: 'linear-gradient(90deg, #B91C1C 0%, #EF4444 50%, #991B1B 100%)',
                border: 'none',
                color: '#FFF',
                fontFamily: 'Inter, sans-serif',
                fontSize: 14,
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                boxShadow: '0 0 20px rgba(239, 68, 68, 0.4)',
                transition: 'all 0.2s ease',
                clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.02)';
                e.currentTarget.style.boxShadow = '0 0 30px rgba(239, 68, 68, 0.6)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = '0 0 20px rgba(239, 68, 68, 0.4)';
              }}
            >
              THỬ LẠI ẢI
            </button>
          )}

          {passed && (
            <button
              onClick={() => onComplete(isQuestComplete ? 'next_quest' : 'next_unit')}
              disabled={submitting}
              style={{
                width: '100%',
                height: 52,
                background: isQuestComplete 
                  ? 'linear-gradient(90deg, #D946EF 0%, #A855F7 50%, #7E22CE 100%)' // Epic purple for next quest
                  : 'linear-gradient(90deg, #0891B2 0%, #06B6D4 50%, #0E7490 100%)', // Cyan for next unit
                border: 'none',
                color: '#FFF',
                fontFamily: 'Inter, sans-serif',
                fontSize: 14,
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                cursor: submitting ? 'not-allowed' : 'pointer',
                opacity: submitting ? 0.7 : 1,
                boxShadow: !submitting ? (isQuestComplete ? '0 0 20px rgba(168, 85, 247, 0.4)' : '0 0 20px rgba(6, 182, 212, 0.4)') : 'none',
                transition: 'all 0.2s ease',
                clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)',
              }}
              onMouseEnter={(e) => {
                if (submitting) return;
                e.currentTarget.style.transform = 'scale(1.02)';
                e.currentTarget.style.boxShadow = isQuestComplete ? '0 0 30px rgba(168, 85, 247, 0.6)' : '0 0 30px rgba(6, 182, 212, 0.6)';
              }}
              onMouseLeave={(e) => {
                if (submitting) return;
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = isQuestComplete ? '0 0 20px rgba(168, 85, 247, 0.4)' : '0 0 20px rgba(6, 182, 212, 0.4)';
              }}
            >
              {submitting ? 'ĐANG ĐỒNG BỘ...' : (isQuestComplete ? 'CHUYỂN VÙNG ĐẤT' : 'ẢI TIẾP THEO')}
            </button>
          )}

          <button
            onClick={() => passed ? onComplete('back') : onRetreat()}
            disabled={submitting}
            style={{
              width: '100%',
              height: 52,
              background: 'rgba(30, 41, 59, 0.5)',
              border: '1px solid #334155',
              color: '#94A3B8',
              fontFamily: 'Inter, sans-serif',
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              cursor: submitting ? 'not-allowed' : 'pointer',
              opacity: submitting ? 0.7 : 1,
              transition: 'all 0.2s ease',
              clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)',
            }}
            onMouseEnter={(e) => {
              if (submitting) return;
              e.currentTarget.style.transform = 'scale(1.02)';
              e.currentTarget.style.background = 'rgba(51, 65, 85, 0.8)';
            }}
            onMouseLeave={(e) => {
              if (submitting) return;
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.background = 'rgba(30, 41, 59, 0.5)';
            }}
          >
            {passed ? 'VỀ DANH SÁCH ẢI' : 'RÚT LUI'}
          </button>
        </div>
      </div>
    </div>
  );
}
