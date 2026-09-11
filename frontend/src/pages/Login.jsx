import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuthStore } from '../context/authStore';
import { useProgressStore } from '../context/progressStore';
import { authApi } from '../api';
import { splash, LOL_ICONS, INITIAL_USER } from '../constants/gameData';
import LoLIcon from '../components/common/LoLIcon';

export default function Login() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (loading) return;

    if (!email.trim() || !password.trim()) {
      toast.error('Vui lòng điền đầy đủ email và mật khẩu');
      return;
    }

    setLoading(true);
    try {
      // 1. Ranh giới Guest: Capture snapshot TRƯỚC KHI thực hiện đăng nhập
      const pendingSnapshot =
        useProgressStore.getState().capturePendingGuestMigration() ||
        useProgressStore.getState().pendingGuestMigration;

      // 2. Thực hiện đăng nhập tài khoản qua authApi
      const res = await authApi.login({
        email: email.trim(),
        password,
      });

      if (res?.data) {
        const { user, accessToken, refreshToken } = res.data;

        // 3. Chuyển authStore sang trạng thái authenticated
        setAuth(user, accessToken, refreshToken);

        // 4. Nếu có tiến trình Guest chờ migration, tiến hành migrate ngay (KHÔNG fetchUserProgress trước!)
        if (pendingSnapshot) {
          const migrationResult = await useProgressStore.getState().migrateGuestProgress();
          if (migrationResult?.success) {
            toast.success(`Chào mừng ${user.displayName || 'bạn'} trở lại! Tiến trình Khách đã được hợp nhất.`);
          } else if (migrationResult?.conflict) {
            toast('Tài khoản đã có tiến trình trên máy chủ. Tiến trình Khách được bảo lưu để đối chiếu.', {
              icon: '⚠️',
            });
          } else {
            toast(`Chào mừng ${user.displayName || 'bạn'} trở lại! Đang giữ tiến trình Khách để đồng bộ sau.`, {
              icon: 'ℹ️',
            });
          }
        } else {
          // 5. Nếu không có snapshot Khách, nạp tiến trình người dùng bình thường
          await useProgressStore.getState().fetchUserProgress();
          toast.success(`Chào mừng ${user.displayName || 'bạn'} trở lại!`);
        }

        // 6. Điều hướng sau khi toàn bộ quy trình hydration / migration hoàn tất
        navigate('/');
        return;
      }
      throw new Error('Dữ liệu không hợp lệ từ máy chủ');
    } catch (err) {
      console.warn('Backend login failed, fallback offer available:', err);
      const msg = err?.message || err?.error || 'Đăng nhập thất bại';
      toast.error(
        `${msg}. Bạn có thể trải nghiệm ngay ở chế độ Khách.`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = () => {
    toast.success('Bạn đang trải nghiệm EngJoy ở chế độ Khách. Đăng ký để lưu tiến trình.');
    navigate('/');
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        background: 'radial-gradient(ellipse at 50% 20%, #151828 0%, #080a10 100%)',
        color: 'var(--t1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* Background ambient art glow */}
      <div
        style={{
          position: 'absolute',
          top: '-10%',
          right: '-5%',
          width: '600px',
          height: '600px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)',
          filter: 'blur(60px)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-10%',
          left: '-5%',
          width: '600px',
          height: '600px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(234,179,8,0.08) 0%, transparent 70%)',
          filter: 'blur(60px)',
          pointerEvents: 'none',
        }}
      />

      {/* Main Card Container */}
      <div
        style={{
          width: '100%',
          maxWidth: '920px',
          minHeight: '560px',
          background: 'var(--s1)',
          border: '1px solid var(--bd2)',
          borderRadius: '24px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(340px, 100%), 1fr))',
          boxShadow: '0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)',
          overflow: 'hidden',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Left Visual Column: Riot Splash Art Hero Banner */}
        <div
          style={{
            position: 'relative',
            background: '#0a0d16',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '36px',
            minHeight: '300px',
          }}
        >
          {/* Splash background image */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: `url(${splash('Lux', 0)})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center 20%',
              filter: 'brightness(0.55) contrast(1.15)',
              transform: 'scale(1.04)',
              transition: 'transform 8s ease',
            }}
          />
          {/* Gradient overlays for cinematic depth */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'linear-gradient(180deg, rgba(8,10,16,0.3) 0%, rgba(8,10,16,0.85) 75%, #080a10 100%)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'radial-gradient(circle at center, transparent 40%, rgba(0,0,0,0.7) 100%)',
            }}
          />

          {/* Top Brand Logo */}
          <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', gap: 12 }}>
            <LoLIcon src={LOL_ICONS.logo} size={42} style={{ borderRadius: 8, boxShadow: '0 4px 14px rgba(0,0,0,0.5)' }} />
            <div>
              <div style={{ fontSize: 18, fontWeight: 900, fontFamily: "'Nunito', sans-serif", letterSpacing: '-0.3px', color: '#fff' }}>
                Eng<span style={{ color: 'var(--gold)' }}>Joy</span>
              </div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.65)', fontWeight: 700, letterSpacing: '1px' }}>
                LEARN · PLAY · LEVEL UP
              </div>
            </div>
          </div>

          {/* Bottom Lore Quote */}
          <div style={{ position: 'relative', zIndex: 2 }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 10px',
                borderRadius: '999px',
                background: 'rgba(234,179,8,0.15)',
                border: '1px solid rgba(234,179,8,0.3)',
                color: 'var(--gold)',
                fontSize: 11,
                fontWeight: 800,
                marginBottom: 12,
              }}
            >
              <LoLIcon src={LOL_ICONS.streak} size={12} />
              <span>MÙA GIẢI HỌC TẬP 2026</span>
            </div>
            <h3
              style={{
                margin: '0 0 8px',
                fontSize: 22,
                fontWeight: 900,
                color: '#fff',
                fontFamily: "'Nunito', sans-serif",
                lineHeight: 1.3,
              }}
            >
              Chinh phục tiếng Anh qua từng trận đấu
            </h3>
            <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 1.6 }}>
              Luyện từ vựng, thách đấu ngữ pháp và tích lũy trang bị huyền thoại cùng các hiệp sĩ khác.
            </p>
          </div>
        </div>

        {/* Right Column: Login Form */}
        <div
          style={{
            padding: '40px 36px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            background: 'var(--s1)',
          }}
        >
          {/* Header */}
          <div style={{ marginBottom: 28 }}>
            <h2
              style={{
                margin: '0 0 6px',
                fontSize: 24,
                fontWeight: 900,
                fontFamily: "'Nunito', sans-serif",
                color: 'var(--t1)',
                letterSpacing: '-0.4px',
              }}
            >
              Đăng nhập chiến binh
            </h2>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--t3)' }}>
              Nhập tài khoản EngJoy để tiếp tục chuỗi ngày học tập
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Email Field */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 12,
                  fontWeight: 700,
                  color: 'var(--t2)',
                  marginBottom: 7,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tennguoidung@domain.com"
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  background: 'var(--s2)',
                  border: '1px solid var(--bd2)',
                  borderRadius: 'var(--r-sm)',
                  color: 'var(--t1)',
                  fontSize: 14,
                  outline: 'none',
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'var(--indigo)';
                  e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.2)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'var(--bd2)';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>

            {/* Password Field */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
                <label
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: 'var(--t2)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  Mật khẩu
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--t3)',
                    fontSize: 11,
                    cursor: 'pointer',
                    fontWeight: 600,
                    padding: 0,
                  }}
                >
                  {showPassword ? 'Ẩn' : 'Hiện'}
                </button>
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu..."
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  background: 'var(--s2)',
                  border: '1px solid var(--bd2)',
                  borderRadius: 'var(--r-sm)',
                  color: 'var(--t1)',
                  fontSize: 14,
                  outline: 'none',
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'var(--indigo)';
                  e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.2)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'var(--bd2)';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: 6,
                padding: '13px',
                borderRadius: 'var(--r)',
                border: 'none',
                background: 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)',
                color: '#0a0d14',
                fontSize: 14,
                fontWeight: 900,
                fontFamily: "'Nunito', sans-serif",
                letterSpacing: '0.2px',
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 18px rgba(234,179,8,0.3)',
                transition: 'transform 0.15s, box-shadow 0.15s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
              onMouseEnter={(e) => {
                if (!loading) e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                if (!loading) e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              {loading ? 'Đang xác thực...' : 'Đăng nhập chiến đấu'}
            </button>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', margin: '4px 0', gap: 12 }}>
              <div style={{ flex: 1, height: 1, background: 'var(--bd)' }} />
              <span style={{ fontSize: 11, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                hoặc
              </span>
              <div style={{ flex: 1, height: 1, background: 'var(--bd)' }} />
            </div>

            {/* Quick Demo Login Button */}
            <button
              type="button"
              onClick={handleDemoLogin}
              style={{
                padding: '11px',
                borderRadius: 'var(--r)',
                border: '1px solid var(--bd2)',
                background: 'var(--s2)',
                color: 'var(--t1)',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'background 0.15s, border-color 0.15s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--s3)';
                e.currentTarget.style.borderColor = 'var(--indigo)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--s2)';
                e.currentTarget.style.borderColor = 'var(--bd2)';
              }}
            >
              <LoLIcon src={LOL_ICONS.xp} size={15} />
              <span>Trải nghiệm nhanh ở chế độ Khách</span>
            </button>
          </form>

          {/* Links Footer */}
          <div style={{ marginTop: 24, textAlign: 'center', fontSize: 13, color: 'var(--t3)' }}>
            Chưa có tài khoản?{' '}
            <Link
              to="/register"
              style={{
                color: 'var(--gold)',
                fontWeight: 800,
                textDecoration: 'none',
              }}
            >
              Tạo tài khoản mới
            </Link>
          </div>

          <div style={{ marginTop: 14, textAlign: 'center' }}>
            <Link
              to="/"
              style={{
                color: 'var(--t3)',
                fontSize: 12,
                textDecoration: 'none',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              ← Về sảnh chính EngJoy
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
