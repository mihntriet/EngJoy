import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { useProgressStore } from '../../context/progressStore';

/**
 * PHASE 2C.4D — GLOBAL GUEST MIGRATION CONFLICT RESOLUTION UI
 * 
 * Rendered globally within MainApp across all views (Dashboard, Learn, Codex, Arena, Inventory).
 * Allows the authenticated user to make an explicit, non-destructive or confirmed-destructive decision:
 * 1. KEEP CLOUD (Destructive discard of pending Guest progress with explicit confirmation)
 * 2. RETRY GUEST MIGRATION (Idempotent retry using existing snapshot & key)
 */
export default function MigrationConflictBanner() {
  const {
    migrationConflict,
    pendingGuestMigration,
    isMigrating,
    migrateGuestProgress,
    discardPendingGuestMigration,
  } = useProgressStore();

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(true);

  if (!migrationConflict || !pendingGuestMigration) {
    return null;
  }

  // Extract cloud metrics
  const cloudProfile = migrationConflict.cloudProfile || {};
  const existingSummary = migrationConflict.existingSummary || {};
  const cloudXp = cloudProfile.totalXp ?? cloudProfile.total_xp ?? existingSummary.totalXp ?? 0;
  const cloudLevel = cloudProfile.currentLevel ?? cloudProfile.current_level ?? existingSummary.currentLevel ?? 1;
  const cloudGold = cloudProfile.gold ?? existingSummary.gold ?? 0;
  const cloudWords = cloudProfile.wordsLearned ?? cloudProfile.words_learned ?? existingSummary.wordsLearned ?? 0;

  // Extract guest metrics
  const guestSnapshot = migrationConflict.pendingSnapshot || pendingGuestMigration || {};
  const guestSummary = migrationConflict.guestSummary || {};
  const guestXp = guestSnapshot.xp ?? guestSummary.xp ?? 0;
  const guestGold = guestSnapshot.gold ?? guestSummary.gold ?? 0;
  const guestWords = guestSnapshot.wordsLearned ?? guestSummary.wordsLearned ?? 0;
  const guestSavedCount = Array.isArray(guestSnapshot.savedWords) ? guestSnapshot.savedWords.length : 0;
  const guestItemsCount = Array.isArray(guestSnapshot.ownedItemIds) ? guestSnapshot.ownedItemIds.length : 0;

  // Handler: Retry Guest Migration
  const handleRetry = async () => {
    if (isMigrating) return;
    try {
      const res = await migrateGuestProgress();
      if (res?.success) {
        toast.success('Hợp nhất tiến trình Khách thành công!');
      } else if (res?.conflict) {
        toast('Máy chủ vẫn ghi nhận xung đột tiến trình. Dữ liệu Khách vẫn được bảo toàn.', {
          icon: '⚠️',
        });
      } else {
        toast.error(res?.message || 'Lỗi khi thử hợp nhất lại. Vui lòng thử lại sau.');
      }
    } catch (err) {
      toast.error('Có lỗi xảy ra khi gửi yêu cầu hợp nhất.');
    }
  };

  // Handler: Confirm Keep Cloud (Destructive Discard of Guest Snapshot)
  const handleConfirmKeepCloud = () => {
    discardPendingGuestMigration();
    setShowConfirmModal(false);
    toast.success('Đã giữ tiến trình Cloud. Tiến trình Khách đã được dọn dẹp an toàn.');
  };

  return (
    <>
      {/* Global Conflict Bar */}
      <section
        data-testid="migration-conflict-banner"
        style={{
          background: 'linear-gradient(135deg, rgba(30, 27, 20, 0.95) 0%, rgba(20, 18, 25, 0.98) 100%)',
          borderBottom: '1px solid rgba(245, 158, 11, 0.4)',
          borderLeft: '4px solid #F59E0B',
          padding: '14px 20px',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
          position: 'relative',
          zIndex: 40,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          {/* Header & Quick Action Row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '20px' }}>⚔️</span>
              <div>
                <h4
                  style={{
                    margin: 0,
                    fontSize: '15px',
                    fontWeight: 700,
                    color: '#FBBF24',
                    letterSpacing: '0.3px',
                  }}
                >
                  Phát Hiện Xung Đột Tiến Trình (Migration Conflict)
                </h4>
                <p
                  style={{
                    margin: '2px 0 0',
                    fontSize: '12px',
                    color: 'rgba(255, 255, 255, 0.75)',
                  }}
                >
                  Tài khoản đã có dữ liệu trên máy chủ. Vui lòng chọn giữ dữ liệu đám mây hoặc thử hợp nhất lại.
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setDetailsOpen(!detailsOpen)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: 'rgba(255, 255, 255, 0.85)',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                {detailsOpen ? 'Ẩn so sánh ▲' : 'Xem so sánh ▼'}
              </button>

              <button
                type="button"
                data-testid="retry-migration-btn"
                disabled={isMigrating}
                onClick={handleRetry}
                style={{
                  padding: '7px 16px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  background: isMigrating ? 'rgba(99, 102, 241, 0.4)' : '#4F46E5',
                  border: '1px solid #6366F1',
                  color: '#FFFFFF',
                  cursor: isMigrating ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 8px rgba(79, 70, 229, 0.35)',
                }}
              >
                {isMigrating ? 'Đang hợp nhất...' : '🔄 Thử Hợp Nhất Lại'}
              </button>

              <button
                type="button"
                data-testid="keep-cloud-btn"
                disabled={isMigrating}
                onClick={() => setShowConfirmModal(true)}
                style={{
                  padding: '7px 16px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  color: '#FCA5A5',
                  cursor: isMigrating ? 'not-allowed' : 'pointer',
                }}
              >
                Giữ Tiến Trình Cloud
              </button>
            </div>
          </div>

          {/* Comparison Cards Section */}
          {detailsOpen && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '12px',
                paddingTop: '6px',
              }}
            >
              {/* Cloud Column */}
              <div
                style={{
                  background: 'rgba(15, 23, 42, 0.65)',
                  border: '1px solid rgba(99, 102, 241, 0.3)',
                  borderRadius: '8px',
                  padding: '12px 14px',
                }}
              >
                <div
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#818CF8',
                    textTransform: 'uppercase',
                    marginBottom: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>☁️ Tiến trình Máy Chủ (Cloud Authoritative)</span>
                  <span style={{ fontSize: '11px', color: '#10B981', fontWeight: 600 }}>Đang sử dụng</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
                  <div>
                    <span style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Cấp độ: </span>
                    <strong data-testid="conflict-cloud-level" style={{ color: '#E0E7FF' }}>{cloudLevel}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Kinh nghiệm: </span>
                    <strong data-testid="conflict-cloud-xp" style={{ color: '#FCD34D' }}>{cloudXp} XP</strong>
                  </div>
                  <div>
                    <span style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Vàng: </span>
                    <strong data-testid="conflict-cloud-gold" style={{ color: '#F59E0B' }}>{cloudGold}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Từ đã học: </span>
                    <strong data-testid="conflict-cloud-words" style={{ color: '#A5B4FC' }}>{cloudWords}</strong>
                  </div>
                </div>
              </div>

              {/* Guest Column */}
              <div
                style={{
                  background: 'rgba(30, 20, 15, 0.65)',
                  border: '1px solid rgba(245, 158, 11, 0.35)',
                  borderRadius: '8px',
                  padding: '12px 14px',
                }}
              >
                <div
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#FBBF24',
                    textTransform: 'uppercase',
                    marginBottom: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>🎮 Tiến trình Khách (Pending Snapshot)</span>
                  <span style={{ fontSize: '11px', color: '#F59E0B', fontWeight: 600 }}>Chờ xử lý</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
                  <div>
                    <span style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Kinh nghiệm: </span>
                    <strong data-testid="conflict-guest-xp" style={{ color: '#FCD34D' }}>{guestXp} XP</strong>
                  </div>
                  <div>
                    <span style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Vàng: </span>
                    <strong data-testid="conflict-guest-gold" style={{ color: '#F59E0B' }}>{guestGold}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Từ đã học: </span>
                    <strong data-testid="conflict-guest-words" style={{ color: '#A5B4FC' }}>{guestWords}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Từ lưu / Đồ: </span>
                    <strong style={{ color: '#E0E7FF' }}>{guestSavedCount} / {guestItemsCount}</strong>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Confirmation Modal for Destructive KEEP CLOUD */}
      {showConfirmModal && (
        <div
          data-testid="keep-cloud-confirm-modal"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px',
          }}
        >
          <div
            style={{
              background: '#1A1C23',
              border: '1px solid rgba(239, 68, 68, 0.5)',
              borderRadius: '12px',
              maxWidth: '460px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 48px rgba(0, 0, 0, 0.8)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <span style={{ fontSize: '24px' }}>⚠️</span>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#EF4444' }}>
                Xác Nhận Giữ Tiến Trình Cloud?
              </h3>
            </div>

            <p style={{ margin: '0 0 20px', fontSize: '13px', lineHeight: 1.6, color: 'rgba(255, 255, 255, 0.8)' }}>
              Hành động này sẽ <strong>xóa vĩnh viễn</strong> dữ liệu tiến trình Khách đang chờ đồng bộ ({guestXp} XP, {guestGold} Vàng) và <strong>không thể khôi phục</strong>. Tiến trình hiện có trên máy chủ sẽ được giữ nguyên làm tiến trình chính thức.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                data-testid="cancel-discard-btn"
                onClick={() => setShowConfirmModal(false)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 500,
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#FFFFFF',
                  cursor: 'pointer',
                }}
              >
                Hủy Bỏ
              </button>

              <button
                type="button"
                data-testid="confirm-discard-btn"
                onClick={handleConfirmKeepCloud}
                style={{
                  padding: '8px 18px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 600,
                  background: '#DC2626',
                  border: '1px solid #EF4444',
                  color: '#FFFFFF',
                  cursor: 'pointer',
                  boxShadow: '0 2px 10px rgba(220, 38, 38, 0.4)',
                }}
              >
                Xác Nhận Hủy Tiến Trình Khách
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
