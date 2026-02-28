import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, ArrowRight, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { apiLogin } from '../api';

const Login = ({ onLogin }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            // Role selection removed - backend detects role from DB
            const res = await apiLogin({ email, password });
            if (!res.success) {
                setError(res.message || 'Login failed');
                setLoading(false);
                return;
            }
            // Save token and user to localStorage
            localStorage.setItem('astu_token', res.token);
            localStorage.setItem('astu_user', JSON.stringify(res.user));
            onLogin(res.user);
            navigate('/');

        } catch (err) {
            setError('Server error. Is the backend running?');
        }
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
                <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                    <motion.div
                        initial={{ rotate: -10 }}
                        animate={{ rotate: 0 }}
                        style={{
                            width: '64px', height: '64px', background: 'var(--primary)',
                            borderRadius: '16px', display: 'inline-flex', justifyContent: 'center',
                            alignItems: 'center', color: 'white', marginBottom: '1rem',
                            boxShadow: '0 10px 25px -5px rgba(37, 99, 235, 0.4)'
                        }}>
                        <ShieldCheck size={32} />
                    </motion.div>
                    <h2 style={{ fontSize: '1.8rem', color: 'var(--primary)', margin: 0, letterSpacing: '-0.5px' }}>Compliant System</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '0.5rem' }}>Login to  ASTU Compliant System </p>
                </div>

                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {/* Role selection removed - automatically detected! */}

                    <div style={{ position: 'relative' }}>
                        <User size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input
                            type="email"
                            placeholder="ASTU Email"
                            className="input"
                            style={{ paddingLeft: '45px' }}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div style={{ position: 'relative' }}>
                        <Lock size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input
                            type="password"
                            placeholder="Password"
                            className="input"
                            style={{ paddingLeft: '45px' }}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    {error && (
                        <div style={{
                            background: '#ff4d4d15', border: '1px solid #ff4d4d40',
                            borderRadius: '10px', padding: '0.75rem 1rem',
                            color: '#ff4d4d', fontSize: '0.85rem', fontWeight: 500
                        }}>
                            {error}
                        </div>
                    )}

                    <motion.button
                        whileHover={{ scale: 1.02, x: 5 }}
                        whileTap={{ scale: 0.98 }}
                        type="submit"
                        className="btn btn-primary"
                        style={{ width: '100%', justifyContent: 'center', padding: '1rem', borderRadius: '14px', marginTop: '0.5rem', opacity: loading ? 0.7 : 1 }}
                        disabled={loading}
                    >
                        {loading ? 'Logging in…' : <> Sign In <ArrowRight size={20} /> </>}
                    </motion.button>
                </form>

                <p style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                    New student? <span style={{ color: 'var(--primary)', cursor: 'pointer', fontWeight: 600 }} onClick={() => navigate('/signup')}>Create Account</span>
                </p>
            </motion.div>
        </div>
    );
};

export default Login;
