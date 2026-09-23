import { useEffect, useRef, useState } from 'react';

const OTP_LENGTH = 6;

/**
 * The dialog is UI-only; its parent supplies the current backend verification actions.
 */
export default function VerificationModal({ email, onClose, onVerified, onVerify, onResend }) {
  const [digits, setDigits] = useState(Array(OTP_LENGTH).fill(''));
  const [error, setError] = useState('');
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const inputRefs = useRef([]);
  const dialogRef = useRef(null);

  const code = digits.join('');

  useEffect(() => {
    inputRefs.current[0]?.focus();

    const handleKeyDown = (event) => {
      if (event.key !== 'Tab') return;
      const focusable = dialogRef.current?.querySelectorAll('button, input:not([disabled])');
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = window.setInterval(() => setCooldown((seconds) => seconds - 1), 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  const setDigit = (index, value) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);
    setError('');
    if (digit && index < OTP_LENGTH - 1) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (event, index) => {
    if (event.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (event) => {
    event.preventDefault();
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!pasted) return;
    setDigits(Array.from({ length: OTP_LENGTH }, (_, index) => pasted[index] || ''));
    inputRefs.current[Math.min(pasted.length, OTP_LENGTH) - 1]?.focus();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (code.length !== OTP_LENGTH) {
      setError('Nhập đủ 6 chữ số để xác nhận.');
      return;
    }
    try {
      setIsConfirmed(true);
      await onVerify(code);
      window.setTimeout(onVerified, 520);
    } catch (err) {
      setIsConfirmed(false);
      setError(err?.message || err?.error || 'Không thể xác nhận mã. Vui lòng thử lại.');
    }
  };

  const handleResend = async () => {
    if (!onResend || cooldown > 0 || isResending) return;
    try {
      setIsResending(true);
      await onResend();
      setCooldown(60);
      setError('');
    } catch (err) {
      setError(err?.message || err?.error || 'Không thể gửi lại mã. Vui lòng thử sau.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="auth-verification-overlay" role="presentation">
      <section
        ref={dialogRef}
        className={`auth-verification-modal${isConfirmed ? ' is-confirmed' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="verification-title"
        aria-describedby="verification-description"
      >
        <button className="auth-modal-close" type="button" onClick={onClose} aria-label="Đóng xác nhận mã">
          ×
        </button>
        <p className="auth-kicker">SECURE CHANNEL // 01</p>
        <h2 id="verification-title">Kích hoạt hồ sơ</h2>
        <p id="verification-description">
          Nhập mã xác nhận gồm 6 chữ số gửi tới <strong>{email}</strong>.
        </p>
        <p className="auth-verification-note">Mã có hiệu lực trong 15 phút. Tối đa 5 lần thử.</p>

        <form onSubmit={handleSubmit}>
          <div className="auth-otp-inputs" onPaste={handlePaste}>
            {digits.map((digit, index) => (
              <input
                key={index}
                ref={(element) => { inputRefs.current[index] = element; }}
                value={digit}
                onChange={(event) => setDigit(index, event.target.value)}
                onKeyDown={(event) => handleKeyDown(event, index)}
                inputMode="numeric"
                autoComplete={index === 0 ? 'one-time-code' : 'off'}
                aria-label={`Chữ số ${index + 1} trong mã xác nhận`}
                maxLength="1"
              />
            ))}
          </div>
          {error && <p className="auth-form-error" role="alert">{error}</p>}
          <button className="auth-primary-button auth-verify-button" type="submit" disabled={isConfirmed}>
            {isConfirmed ? '✓ Hồ sơ đã xác nhận' : 'Xác nhận mã'}
          </button>
          {onResend && <button className="auth-resend-button" type="button" disabled={isResending || cooldown > 0} onClick={handleResend}>
            {isResending ? 'Đang gửi mã...' : cooldown > 0 ? `Gửi lại mã sau ${cooldown}s` : 'Không nhận được mã? Gửi lại'}
          </button>}
        </form>
      </section>
    </div>
  );
}
