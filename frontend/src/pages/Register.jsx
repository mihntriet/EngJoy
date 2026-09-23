import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authApi } from '../api';
import { splash, champ, LOL_ICONS } from '../constants/gameData';
import LoLIcon from '../components/common/LoLIcon';
import VerificationModal from '../components/auth/VerificationModal';

const STARTER_CHAMPIONS = ['Lux', 'Ashe', 'Ahri', 'Ekko', 'Zed'];

export default function Register() {
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedChamp, setSelectedChamp] = useState('Lux');
  const [loading, setLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const normalizedEmail = email.trim().toLowerCase();

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (loading) return;
    if (!displayName.trim() || !email.trim() || !password.trim()) return toast.error('Vui lòng điền đầy đủ thông tin.');
    if (password.length < 8) return toast.error('Mật khẩu cần có ít nhất 8 ký tự.');
    if (password !== confirmPassword) return toast.error('Mật khẩu xác nhận không khớp.');

    setLoading(true);
    try {
      const res = await authApi.register({ displayName: displayName.trim(), email: normalizedEmail, password });
      if (!res?.data?.requiresVerification) throw new Error('Máy chủ chưa yêu cầu xác thực email.');
      // Register intentionally does not authenticate: the API issues JWT only after verified login.
      setIsVerifying(true);
    } catch (err) {
      toast.error(err?.message || err?.error || 'Không thể tạo tài khoản.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <div className="auth-ambient auth-ambient-cyan" />
      <div className="auth-ambient auth-ambient-gold" />
      <section className="auth-shell auth-shell-register" aria-labelledby="register-title" aria-hidden={isVerifying}>
        <aside className="auth-lore-panel">
          <img src={splash(selectedChamp, 0)} alt={`${selectedChamp}, champion companion`} />
          <div className="auth-lore-shade" />
          <div className="auth-brand"><LoLIcon src={LOL_ICONS.logo} size={40} /><span>Eng<b>Joy</b><small>LEARN · PLAY · LEVEL UP</small></span></div>
          <div className="auth-lore-copy"><p className="auth-kicker">CHAMPION BOND</p><h2>{selectedChamp} sẽ đồng hành cùng bạn.</h2><p>Chọn người dẫn đường, mở khóa hành trình học tập của riêng mình.</p></div>
        </aside>
        <section className="auth-form-panel">
          <p className="auth-kicker">CREATE PROFILE // 01</p>
          <h1 id="register-title">Tạo hồ sơ hiệp sĩ</h1>
          <p className="auth-lead">Lưu chuỗi ngày học, thành tích và trang bị của bạn.</p>
          <form className="auth-form" onSubmit={handleSubmit}>
            <fieldset className="auth-champion-selector"><legend>Chọn tướng đồng hành</legend><div>{STARTER_CHAMPIONS.map((name) => <button key={name} type="button" className={selectedChamp === name ? 'is-selected' : ''} onClick={() => setSelectedChamp(name)} aria-pressed={selectedChamp === name} aria-label={`Chọn ${name}`}><img src={champ(name)} alt="" /></button>)}</div></fieldset>
            <label>Tên hiển thị<input required value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Ví dụ: Minh Khoa" autoComplete="nickname" /></label>
            <label>Email<input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="email@example.com" autoComplete="email" /></label>
            <div className="auth-password-grid"><label>Mật khẩu<input type="password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Tối thiểu 8 ký tự" autoComplete="new-password" /></label><label>Nhập lại<input type="password" required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Xác nhận mật khẩu" autoComplete="new-password" /></label></div>
            <button className="auth-primary-button" type="submit" disabled={loading}>{loading ? 'Đang khởi tạo...' : 'Gia nhập đấu trường'}</button>
          </form>
          <p className="auth-footer">Đã có tài khoản? <Link to="/login">Đăng nhập ngay</Link></p>
          <Link className="auth-back-link" to="/">← Về sảnh chính</Link>
        </section>
      </section>
      {isVerifying && <VerificationModal
        email={normalizedEmail}
        onClose={() => setIsVerifying(false)}
        onVerify={(code) => authApi.verifyEmail({ email: normalizedEmail, code })}
        onResend={() => authApi.resendCode({ email: normalizedEmail })}
        onVerified={() => { toast.success('Email đã được xác nhận. Hãy đăng nhập để bắt đầu.'); navigate('/login'); }}
      />}
    </main>
  );
}
