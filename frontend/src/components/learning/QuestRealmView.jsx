import React from 'react';
import { splash } from '../../constants/gameData';

export default function QuestRealmView({ quest, units, onBack, onStartUnit }) {
  return (
    <main
      className="anim-fade-in"
      style={{
        width: '100%',
        minHeight: '100vh',
        background: '#0a0d14',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Background Image with Overlay */}
      <div 
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `url(${splash(quest.champion || 'Lux', 0)})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center 20%',
          opacity: 0.4,
          maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 80%)',
          WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 80%)',
          pointerEvents: 'none',
        }}
      />

      <div style={{ position: 'relative', zIndex: 10, padding: '40px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '60px' }}>
          <div>
            <p style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 12,
              letterSpacing: '0.2em',
              color: '#38BDF8',
              textTransform: 'uppercase',
              marginBottom: 8,
            }}>
              REALM // {quest.label}
            </p>
            <h1 style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: 'clamp(32px, 5vw, 48px)',
              fontWeight: 800,
              color: '#FFFFFF',
              margin: 0,
              textShadow: '0 2px 10px rgba(0,0,0,0.8)',
              textTransform: 'uppercase',
              letterSpacing: '0.02em',
            }}>
              {quest.name}
            </h1>
            <p style={{ color: '#94A3B8', marginTop: 12 }}>Chọn một cứ điểm để bắt đầu thử thách.</p>
          </div>
          
          <button
            onClick={onBack}
            style={{
              background: 'rgba(30, 41, 59, 0.8)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#E2E8F0',
              padding: '12px 24px',
              fontFamily: 'Inter, sans-serif',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(51, 65, 85, 0.9)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(30, 41, 59, 0.8)';
            }}
          >
            <span>←</span> QUAY LẠI BẢN ĐỒ
          </button>
        </header>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '24px',
        }}>
          {units.map((unit, idx) => {
            const isLocked = unit.status === 'locked';
            const isActive = unit.status === 'active';
            const isDone = unit.status === 'done';
            
            let cardBg = 'rgba(15, 23, 42, 0.6)';
            let borderColor = 'rgba(255,255,255,0.05)';
            let accentColor = '#64748B';
            
            if (isActive) {
              cardBg = 'rgba(15, 23, 42, 0.9)';
              borderColor = '#F59E0B'; // Amber
              accentColor = '#F59E0B';
            } else if (isDone) {
              cardBg = 'rgba(15, 23, 42, 0.8)';
              borderColor = '#10B981'; // Emerald
              accentColor = '#10B981';
            }

            return (
              <article 
                key={unit.id}
                style={{
                  background: cardBg,
                  border: `1px solid ${borderColor}`,
                  padding: '24px',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  boxShadow: isActive ? '0 0 20px rgba(245, 158, 11, 0.1)' : 'none',
                  opacity: isLocked ? 0.6 : 1,
                  transition: 'all 0.2s ease',
                  clipPath: 'polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%, 0 15px)',
                }}
              >
                {isActive && (
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, transparent, #F59E0B, transparent)' }} />
                )}
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ 
                    fontFamily: 'JetBrains Mono, monospace', 
                    fontSize: 14, 
                    fontWeight: 700, 
                    color: accentColor 
                  }}>
                    ẢI {idx + 1}
                  </span>
                  {isDone && <span style={{ color: '#10B981' }}>✓ HOÀN THÀNH</span>}
                  {isLocked && <span style={{ color: '#64748B' }}>🔒 KHÓA</span>}
                  {isActive && <span style={{ color: '#FCD34D', fontSize: 12, border: '1px solid #F59E0B', padding: '2px 6px', borderRadius: 4 }}>ĐANG MỞ</span>}
                </div>

                <h3 style={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize: 18,
                  fontWeight: 700,
                  color: isLocked ? '#94A3B8' : '#F8FAFC',
                  lineHeight: 1.3,
                  margin: 0,
                }}>
                  {unit.title}
                </h3>

                <div style={{ flex: 1 }} />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                  <div style={{ display: 'flex', gap: 24 }}>
                    <div>
                      <div style={{ fontSize: 24, fontWeight: 700, color: isLocked ? '#64748B' : '#E2E8F0', fontFamily: 'JetBrains Mono, monospace' }}>
                        {unit.words}
                      </div>
                      <div style={{ fontSize: 10, color: '#64748B', letterSpacing: '0.1em' }}>TỪ VỰNG</div>
                    </div>
                    {isDone && (
                      <div>
                        <div style={{ fontSize: 24, fontWeight: 700, color: '#FCD34D', fontFamily: 'JetBrains Mono, monospace' }}>
                          {unit.score || 0}%
                        </div>
                        <div style={{ fontSize: 10, color: '#64748B', letterSpacing: '0.1em' }}>ĐIỂM SỐ</div>
                      </div>
                    )}
                  </div>

                  <button
                    disabled={isLocked}
                    onClick={() => onStartUnit(unit)}
                    style={{
                      background: isLocked ? 'transparent' : (isActive ? 'linear-gradient(90deg, #D97706, #F59E0B)' : 'rgba(16, 185, 129, 0.2)'),
                      border: isLocked ? '1px solid #334155' : (isDone ? '1px solid #10B981' : 'none'),
                      color: isLocked ? '#64748B' : (isDone ? '#10B981' : '#FFF'),
                      padding: '8px 16px',
                      fontFamily: 'Inter, sans-serif',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: isLocked ? 'not-allowed' : 'pointer',
                      clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      if (!isLocked) {
                        e.currentTarget.style.transform = 'scale(1.05)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isLocked) {
                        e.currentTarget.style.transform = 'scale(1)';
                      }
                    }}
                  >
                    {isDone ? 'CHƠI LẠI' : (isActive ? 'BẮT ĐẦU' : 'CHƯA MỞ')}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </main>
  );
}
