'use client';

import { useState } from 'react';
import { supabase } from '../lib/supabase';

interface AuthModalProps {
  onClose: () => void;
  darkMode?: boolean;
}

export default function AuthModal({ onClose, darkMode = false }: AuthModalProps) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bg = darkMode ? '#0D1F33' : '#ffffff';
  const text = darkMode ? '#f1f5f9' : '#1e293b';
  const sub = darkMode ? '#94a3b8' : '#64748b';
  const inputBg = darkMode ? '#1E3550' : '#f8fafc';
  const inputBorder = darkMode ? '#2A4A6A' : '#e2e8f0';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error: err } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.href },
    });
    setLoading(false);
    if (err) {
      setError(err.message);
    } else {
      setSent(true);
    }
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '0 20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: bg, borderRadius: 20, padding: '28px 24px',
          width: '100%', maxWidth: 360,
          boxShadow: '0 8px 48px rgba(0,0,0,0.25)',
          position: 'relative',
        }}
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            position: 'absolute', top: 14, right: 14,
            width: 28, height: 28,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: darkMode ? '#1E3550' : '#f1f5f9',
            border: 'none', borderRadius: '50%',
            fontSize: 14, color: sub, cursor: 'pointer',
          }}
        >&#215;</button>

        {sent ? (
          <>
            <div style={{ fontSize: 28, textAlign: 'center', marginBottom: 12 }}>📬</div>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: text, margin: '0 0 8px', textAlign: 'center' }}>
              Check your email
            </h2>
            <p style={{ fontSize: 13, color: sub, margin: 0, textAlign: 'center', lineHeight: 1.6 }}>
              We sent a magic link to <strong style={{ color: text }}>{email}</strong>.
              Click it on any device to sign in and sync your visited pubs.
            </p>
          </>
        ) : (
          <>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: text, margin: '0 0 6px' }}>
              Save across devices
            </h2>
            <p style={{ fontSize: 13, color: sub, margin: '0 0 20px', lineHeight: 1.6 }}>
              Enter your email to get a magic link. No password needed — your visited pubs sync to any device.
            </p>
            <form onSubmit={handleSubmit}>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                autoFocus
                style={{
                  width: '100%', boxSizing: 'border-box',
                  padding: '10px 14px',
                  background: inputBg, color: text,
                  border: `1px solid ${inputBorder}`,
                  borderRadius: 10, fontSize: 14,
                  outline: 'none', marginBottom: 12,
                }}
              />
              {error && (
                <p style={{ fontSize: 12, color: '#ef4444', margin: '0 0 10px' }}>{error}</p>
              )}
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%', padding: '11px 0',
                  background: '#1565C0', color: '#ffffff',
                  border: 'none', borderRadius: 10,
                  fontSize: 14, fontWeight: 600,
                  cursor: loading ? 'default' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? 'Sending…' : 'Send magic link'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
