import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, ArrowRight, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';
import { apiLogin, apiGoogleLogin } from '../api';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

const Login = ({ onLogin }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const navigate = useNavigate();

    // ── Google Sign-In initialisation ────────────────────────────────────────
    useEffect(() => {
        const initGoogle = () => {
            if (!window.google) return;
            window.google.accounts.id.initialize({
                client_id: GOOGLE_CLIENT_ID,
                callback: handleGoogleResponse,
            });
            window.google.accounts.id.renderButton(
                document.getElementById('google-signin-btn'),
                { theme: 'outline', size: 'large', width: 340, shape: 'pill' }
            );
        };
        if (window.google) {
            initGoogle();
        } else {
            window.addEventListener('load', initGoogle);
            return () => window.removeEventListener('load', initGoogle);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Force light mode on login page
    useEffect(() => {
        const hadDark = document.body.classList.contains('dark');
        if (hadDark) {
            document.body.classList.remove('dark');
        }
        return () => {
            // If the user preferred dark mode, restore it when leaving
            if (hadDark) {
                document.body.classList.add('dark');
            }
        };
    }, []);

    const handleGoogleResponse = async (response) => {
        setError('');
        setLoading(true);
        try {
            const res = await apiGoogleLogin(response.credential);
            if (!res.success) { setError(res.message || 'Google login failed'); setLoading(false); return; }
            localStorage.setItem('token', res.token);
            localStorage.setItem('user', JSON.stringify(res.user));
            onLogin(res.user);
            const paths = { student: '/student', staff: '/staff', admin: '/admin' };
            navigate(paths[res.user.role] || '/');
        } catch { setError('Server error. Is the backend running?'); }
        setLoading(false);
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        if (!password.includes('as') && !password.includes('tu')) {
            setError('The password should contain "as" or "tu"');
            setLoading(false);
            return;
        }

        try {
            const res = await apiLogin({ email, password });
            if (!res.success) { setError(res.message || 'Login failed'); setLoading(false); return; }
            localStorage.setItem('token', res.token);
            localStorage.setItem('user', JSON.stringify(res.user));
            onLogin(res.user);
            const paths = { student: '/student', staff: '/staff', admin: '/admin' };
            navigate(paths[res.user.role] || '/');
        } catch { setError('Server error. Is the backend running?'); }
        setLoading(false);
    };

    return (
        <div className="login-page" style={{
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            minHeight: 'calc(100vh - 120px)', padding: '1rem'
        }}>
            <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: 'spring', damping: 25, stiffness: 120 }}
                className="card"
                style={{ padding: '2.5rem', width: '100%', maxWidth: '420px', border: '1px solid var(--glass-border)' }}
            >
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                    <motion.div initial={{ rotate: -10 }} animate={{ rotate: 0 }} style={{
                        width: '64px', height: '64px', background: 'var(--primary)',
                        borderRadius: '16px', display: 'inline-flex', justifyContent: 'center',
                        alignItems: 'center', color: 'white', marginBottom: '1rem',
                        boxShadow: '0 10px 25px -5px rgba(37, 99, 235, 0.4)'
                    }}>
                        <ShieldCheck size={32} />
                    </motion.div>
                    <h2 style={{ fontSize: '1.8rem', color: 'var(--primary)', margin: 0, letterSpacing: '-0.5px' }}>Complaint System</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '0.5rem' }}>Login to Student Complaint System</p>
                </div>

                {/* Email / Password form */}
                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                    <div style={{ position: 'relative' }}>
                        <User size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input type="email" placeholder="University Email" className="input"
                            style={{ paddingLeft: '45px' }} value={email}
                            onChange={(e) => setEmail(e.target.value)} required />
                    </div>

                    <div style={{ position: 'relative' }}>
                        <Lock size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input type={showPassword ? 'text' : 'password'} placeholder="Password" className="input"
                            style={{ paddingLeft: '45px', paddingRight: '45px' }} value={password}
                            onChange={(e) => setPassword(e.target.value)} required />
                        <button type="button" onClick={() => setShowPassword(!showPassword)}
                            style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', padding: 0 }}>
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>

                    {error && (
                        <div style={{ background: '#ff4d4d15', border: '1px solid #ff4d4d40', borderRadius: '10px', padding: '0.75rem 1rem', color: '#ff4d4d', fontSize: '0.85rem', fontWeight: 500 }}>
                            {error}
                        </div>
                    )}

                    <motion.button whileHover={{ scale: 1.02, x: 5 }} whileTap={{ scale: 0.98 }}
                        type="submit" className="btn btn-primary"
                        style={{ width: '100%', justifyContent: 'center', padding: '1rem', borderRadius: '14px', marginTop: '0.5rem', opacity: loading ? 0.7 : 1 }}
                        disabled={loading}>
                        {loading ? 'Logging in…' : <> Sign In <ArrowRight size={20} /> </>}
                    </motion.button>
                </form>

                {/* Divider */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '1.5rem 0' }}>
                    <div style={{ flex: 1, height: '1px', background: 'var(--glass-border)' }} />
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>or continue with</span>
                    <div style={{ flex: 1, height: '1px', background: 'var(--glass-border)' }} />
                </div>

                {/* Google Sign-In — at the bottom */}
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
                    <div id="google-signin-btn"></div>
                </div>

                <p style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                    New student? <span style={{ color: 'var(--primary)', cursor: 'pointer', fontWeight: 600 }} onClick={() => navigate('/signup')}>Create Account</span>
                </p>
            </motion.div>
        </div>
    );
};

export default Login;
