import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="container" style={{ paddingTop: '5rem', textAlign: 'center' }}>
      <h1 style={{ fontSize: '4rem', color: 'var(--color-primary)' }}>404</h1>
      <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>Page not found</p>
      <Link to="/" style={{ color: 'var(--color-primary-light)' }}>← Back to Home</Link>
    </div>
  );
}
