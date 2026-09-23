import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuthStore } from '../context/authStore';
import { useProgressStore } from '../context/progressStore';
import { authApi } from '../api';
import { splash, LOL_ICONS } from '../constants/gameData';
import LoLIcon from '../components/common/LoLIcon';
import VerificationModal from '../components/auth/VerificationModal';

export default function Login() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (loading) return;
    if (!email.trim() || !password.trim()) {
      toast.error('Vui lòng điền email và mật khẩu.');
      return;
    }

    setLoading(true);
    try {
      const pendingSnapshot = useProgressStore.getState().capturePendingGuestMigration()
        || useProgressStore.getState().pendingGuestMigration;
      const res = await authApi.login({ email: email.trim().toLowerCase(), password });
      if (!res?.data) throw new Error('Dữ liệu phản hồi không hợp lệ từ máy chủ.');

      const { user, accessToken, refreshToken } = res.data;
      setAuth(user, accessToken, refreshToken);

      if (pendingSnapshot) {
        const migrationResult = await useProgressStore.getState().migrateGuestProgress();
        if (migrationResult?.success) toast.success('Tiến trình Khách đã được hợp nhất.');
        else if (migrationResult?.conflict) toast('Tiến trình Khách đang chờ đối chiếu.', { icon: '⚠️' });
        else toast('Đang giữ tiến trình Khách để đồng bộ sau.', { icon: 'ℹ️' });
      } else {
        await useProgressStore.getState().fetchUserProgress();
        toast.success(`Chào mừng ${user.displayName || user.display_name || 'chiến binh'} trở lại!`);
      }
      navigate('/');
    } catch (err) {
      if (err?.code === 'EMAIL_NOT_VERIFIED') {
        setIsVerifying(true);
        toast('Hãy xác thực email trước khi đăng nhập.', { icon: '✉️' });
        return;
      }
      toast.error(`${err?.message || err?.error || 'Đăng nhập thất bại'}. Bạn vẫn có thể chơi ở chế độ Khách.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <div className="auth-ambient auth-ambient-cyan" />
      <div className="auth-ambient auth-ambient-gold" />
      <section className="auth-shell" aria-labelledby="login-title" aria-hidden={isVerifying}>
        <aside className="auth-lore-panel">
          <img src={splash('Lux', 0)} alt="Lux, champion of light" />
          <div className="auth-lore-shade" />
          <div className="auth-brand"><LoLIcon src={LOL_ICONS.logo} size={40} /><span>Eng<b>Joy</b><small>LEARN · PLAY · LEVEL UP</small></span></div>
          <div className="auth-lore-copy"><p className="auth-kicker">SEASON OF MASTERY</p><h2>Chinh phục tiếng Anh qua từng trận đấu.</h2><p>Hành trình của bạn, kỹ năng của bạn, bảng thành tích của bạn.</p></div>
        </aside>
        <section className="auth-form-panel">
          <p className="auth-kicker">SUMMONER ACCESS // 01</p>
          <h1 id="login-title">Đăng nhập chiến đấu</h1>
          <p className="auth-lead">Trở lại đấu trường và tiếp tục chuỗi ngày học tập.</p>
          <form className="auth-form" onSubmit={handleSubmit}>
            <label>Email<input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="tenban@domain.com" autoComplete="email" /></label>
            <label className="auth-password-label">Mật khẩu<button type="button" onClick={() => setShowPassword((value) => !value)}>{showPassword ? 'Ẩn' : 'Hiện'}</button><input type={showPassword ? 'text' : 'password'} required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Nhập mật khẩu" autoComplete="current-password" /></label>
            <button className="auth-primary-button" type="submit" disabled={loading}>{loading ? 'Đang xác thực...' : 'Đăng nhập chiến đấu'}</button>
            <div className="auth-divider"><span />hoặc<span /></div>
            <button className="auth-secondary-button" type="button" onClick={() => { toast.success('Bạn đang chơi ở chế độ Khách.'); navigate('/'); }}><LoLIcon src={LOL_ICONS.xp} size={15} />Trải nghiệm chế độ Khách</button>
          </form>
          <p className="auth-footer">Chưa có tài khoản? <Link to="/register">Tạo hồ sơ hiệp sĩ</Link></p>
          <Link className="auth-back-link" to="/">← Về sảnh chính</Link>
        </section>
      </section>
      {isVerifying && <VerificationModal
        email={email.trim().toLowerCase()}
        onClose={() => setIsVerifying(false)}
        onVerify={(code) => authApi.verifyEmail({ email: email.trim().toLowerCase(), code })}
        onResend={() => authApi.resendCode({ email: email.trim().toLowerCase() })}
        onVerified={() => { setIsVerifying(false); toast.success('Email đã được xác nhận. Bạn có thể đăng nhập ngay.'); }}
      />}
    </main>
  );
}
