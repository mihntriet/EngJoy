import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuthStore } from '../context/authStore';
import { useProgressStore } from '../context/progressStore';
import { authApi } from '../api';
import { splash, champ, LOL_ICONS } from '../constants/gameData';
import LoLIcon from '../components/common/LoLIcon';

const STARTER_CHAMPIONS = ['Lux', 'Ashe', 'Ahri', 'Ekko', 'Zed'];

export default function Register() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedChamp, setSelectedChamp] = useState('Lux');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!displayName.trim() || !email.trim() || !password.trim()) {
      toast.error('Vui lòng điền đầy đủ các thông tin đăng ký');
      return;
    }

    if (password.length < 8) {
      toast.error('Mật khẩu phải có độ dài tối thiểu 8 ký tự');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Mật khẩu xác nhận không khớp');
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.register({
        displayName: displayName.trim(),
        email: email.trim(),
        password,
      });

      if (res?.data) {
        const { user, accessToken, refreshToken } = res.data;
        const enhancedUser = {
          ...user,
          champion: selectedChamp,
        };
        setAuth(enhancedUser, accessToken, refreshToken);
        await useProgressStore.getState().syncGuestData();
        toast.success(`Gia nhập thành công! Chào mừng ${displayName}`);
        navigate('/');
        return;
      }
      throw new Error('Dữ liệu không hợp lệ từ máy chủ');
    } catch (err) {
      console.warn('Backend register failed, fallback offer available:', err);
      const msg = err?.message || err?.error || 'Đăng ký thất bại';
      toast.error(
        `${msg}. Bạn có thể dùng chế độ 'Tài khoản Demo' để trải nghiệm ngay!`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDemoRegister = () => {
    const demoUser = {
      id: `demo-${Date.now()}`,
      email: email.trim() || 'hiepsi@engjoy.edu.vn',
      displayName: displayName.trim() || 'Tân Hiệp Sĩ',
      role: 'student',
      champion: selectedChamp,
      level: 1,
      streak: 0,
      xp: 0,
      gold: 0,
    };
    setAuth(demoUser, 'mock-access-token-demo', 'mock-refresh-token-demo');
    toast.success(`Khởi tạo tân thủ thành công với tướng ${selectedChamp}!`);
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
          left: '-5%',
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
          right: '-5%',
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
          maxWidth: '960px',
          minHeight: '600px',
          background: 'var(--s1)',
          border: '1px solid var(--bd2)',
          borderRadius: '24px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
          boxShadow: '0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)',
          overflow: 'hidden',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Left Visual Column: Selected Champion Banner */}
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
          {/* Splash background image updates with champion selection */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: `url(${splash(selectedChamp, 0)})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center 20%',
              filter: 'brightness(0.55) contrast(1.15)',
              transform: 'scale(1.04)',
              transition: 'background-image 0.4s ease',
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'linear-gradient(180deg, rgba(8,10,16,0.3) 0%, rgba(8,10,16,0.85) 75%, #080a10 100%)',
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

          {/* Bottom Champion Choice Info */}
          <div style={{ position: 'relative', zIndex: 2 }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 10px',
                borderRadius: '999px',
                background: 'rgba(99,102,241,0.2)',
                border: '1px solid rgba(99,102,241,0.4)',
                color: 'var(--indigo-l)',
                fontSize: 11,
                fontWeight: 800,
                marginBottom: 12,
              }}
            >
              <LoLIcon src={LOL_ICONS.battle} size={12} />
              <span>TƯỚNG ĐẠI DIỆN: {selectedChamp.toUpperCase()}</span>
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
              Khởi đầu hành trình huyền thoại
            </h3>
            <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 1.6 }}>
              Chọn tướng đồng hành yêu thích để đại diện cho hồ sơ và bắt đầu học từ vựng mỗi ngày.
            </p>
          </div>
        </div>

        {/* Right Column: Register Form */}
        <div
          style={{
            padding: '36px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            background: 'var(--s1)',
            overflowY: 'auto',
          }}
        >
          {/* Header */}
          <div style={{ marginBottom: 20 }}>
            <h2
              style={{
                margin: '0 0 4px',
                fontSize: 22,
                fontWeight: 900,
                fontFamily: "'Nunito', sans-serif",
                color: 'var(--t1)',
                letterSpacing: '-0.3px',
              }}
            >
              Tạo tài khoản hiệp sĩ
            </h2>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--t3)' }}>
              Đăng ký để lưu chuỗi ngày học, điểm số và trang bị
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Champion Selector */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'var(--t2)',
                  marginBottom: 6,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                Chọn tướng đồng hành
              </label>
              <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
                {STARTER_CHAMPIONS.map((c) => {
                  const isSelected = selectedChamp === c;
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setSelectedChamp(c)}
                      style={{
                        padding: 2,
                        borderRadius: 10,
                        border: isSelected ? '2px solid var(--gold)' : '2px solid transparent',
                        background: isSelected ? 'var(--gold-d)' : 'var(--s2)',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                        boxShadow: isSelected ? '0 0 12px var(--gold-g)' : 'none',
                        flexShrink: 0,
                      }}
                    >
                      <img
                        src={champ(c)}
                        alt={c}
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: 8,
                          display: 'block',
                        }}
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Display Name Field */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'var(--t2)',
                  marginBottom: 6,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                Tên hiển thị
              </label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Ví dụ: Minh Khoa"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: 'var(--s2)',
                  border: '1px solid var(--bd2)',
                  borderRadius: 'var(--r-sm)',
                  color: 'var(--t1)',
                  fontSize: 13,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Email Field */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'var(--t2)',
                  marginBottom: 6,
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
                placeholder="email@example.com"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: 'var(--s2)',
                  border: '1px solid var(--bd2)',
                  borderRadius: 'var(--r-sm)',
                  color: 'var(--t1)',
                  fontSize: 13,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Password Fields */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 11,
                    fontWeight: 700,
                    color: 'var(--t2)',
                    marginBottom: 6,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  Mật khẩu
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="≥ 8 ký tự"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: 'var(--s2)',
                    border: '1px solid var(--bd2)',
                    borderRadius: 'var(--r-sm)',
                    color: 'var(--t1)',
                    fontSize: 13,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 11,
                    fontWeight: 700,
                    color: 'var(--t2)',
                    marginBottom: 6,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  Nhập lại
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Xác nhận"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: 'var(--s2)',
                    border: '1px solid var(--bd2)',
                    borderRadius: 'var(--r-sm)',
                    color: 'var(--t1)',
                    fontSize: 13,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: 4,
                padding: '12px',
                borderRadius: 'var(--r)',
                border: 'none',
                background: 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)',
                color: '#0a0d14',
                fontSize: 14,
                fontWeight: 900,
                fontFamily: "'Nunito', sans-serif",
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 16px rgba(234,179,8,0.3)',
                transition: 'transform 0.15s',
              }}
            >
              {loading ? 'Đang khởi tạo...' : 'Gia nhập đấu trường EngJoy'}
            </button>

            {/* Quick Demo Register Button */}
            <button
              type="button"
              onClick={handleDemoRegister}
              style={{
                padding: '10px',
                borderRadius: 'var(--r)',
                border: '1px solid var(--bd2)',
                background: 'var(--s2)',
                color: 'var(--t1)',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              <LoLIcon src={LOL_ICONS.hp} size={13} />
              <span>Khởi tạo nhanh tài khoản Tân thủ</span>
            </button>
          </form>

          {/* Links Footer */}
          <div style={{ marginTop: 18, textAlign: 'center', fontSize: 13, color: 'var(--t3)' }}>
            Đã có tài khoản?{' '}
            <Link
              to="/login"
              style={{
                color: 'var(--gold)',
                fontWeight: 800,
                textDecoration: 'none',
              }}
            >
              Đăng nhập ngay
            </Link>
          </div>

          <div style={{ marginTop: 10, textAlign: 'center' }}>
            <Link
              to="/"
              style={{
                color: 'var(--t3)',
                fontSize: 12,
                textDecoration: 'none',
                fontWeight: 600,
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
