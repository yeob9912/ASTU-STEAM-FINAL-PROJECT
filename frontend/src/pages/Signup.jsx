import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, Mail, ArrowRight, UserCheck, Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiSignup, apiGoogleLogin } from '../api';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

/* ─── Password strength analyser ──────────────────────────────────────────── */
const analyseStrength = (pw) => {
    if (!pw) return { score: 0, label: '', color: '' };
    let score = 0;
    if (pw.length >= 6)  score++;
    if (pw.length >= 10) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(pw)) score++;

    const levels = [
        { label: '',            color: '' },
        { label: 'Very Weak',   color: '#ef4444' },
        { label: 'Weak',        color: '#f97316' },
        { label: 'Medium',      color: '#eab308' },
        { label: 'Strong',      color: '#22c55e' },
        { label: 'Very Strong', color: '#16a34a' },
    ];
    return { score, ...levels[score] };
};

const Signup = ({ onSignup }) => {
    const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'student' });
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const navigate = useNavigate();

    const strength = analyseStrength(formData.password);
    const passwordsMatch = confirmPassword === '' ? null : formData.password === confirmPassword;

    // ── Google Sign-Up init ───────────────────────────────────────────────────
    useEffect(() => {
        const initGoogle = () => {
            if (!window.google) return;
            window.google.accounts.id.initialize({
                client_id: GOOGLE_CLIENT_ID,
                callback: handleGoogleResponse,
            });
            window.google.accounts.id.renderButton(
                document.getElementById('google-signup-btn'),
                { theme: 'outline', size: 'large', width: 380, shape: 'pill', text: 'signup_with' }
            );
        };
        if (window.google) { initGoogle(); }
        else {
            window.addEventListener('load', initGoogle);
            return () => window.removeEventListener('load', initGoogle);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Force light mode on signup page
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
            if (!res.success) { setError(res.message || 'Google sign-up failed'); setLoading(false); return; }
            localStorage.setItem('astu_token', res.token);
            localStorage.setItem('astu_user', JSON.stringify(res.user));
            onSignup(res.user);
            navigate('/');
        } catch { setError('Server error. Is the backend running?'); }
        setLoading(false);
    };

    const handleSignup = async (e) => {
        e.preventDefault();
        setError('');

        if (!formData.password.includes('as') && !formData.password.includes('tu')) {
            setError('The password should contain "as" or "tu"');
            return;
        }
        if (formData.password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }
        const specialCharRegex = /[!@#$%^&*(),.?":{}|<>]/;
        if (!specialCharRegex.test(formData.password)) {
            setError('Password must contain at least one special character');
            return;
        }
        if (formData.password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);
        try {
            const res = await apiSignup(formData);
            if (!res.success) { setError(res.message || 'Signup failed'); setLoading(false); return; }
            localStorage.setItem('astu_token', res.token);
            localStorage.setItem('astu_user', JSON.stringify(res.user));
            onSignup(res.user);
            navigate('/');
        } catch { setError('Server error. Is the backend running?'); }
        setLoading(false);
    };

    return (
        <div className="signup-page" style={{
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            minHeight: 'calc(100vh - 120px)', padding: '1rem'
        }}>
            <motion.div
                initial={{ opacity: 0, scale: 0.9, rotateX: 10 }}
                animate={{ opacity: 1, scale: 1, rotateX: 0 }}
                transition={{ type: 'spring', damping: 20 }}
                className="card"
                style={{ padding: '2.5rem', width: '100%', maxWidth: '480px', border: '1px solid var(--glass-border)' }}
            >
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <motion.div whileHover={{ scale: 1.1, rotateY: 180 }} style={{
                        width: '64px', height: '64px', background: 'var(--primary)',
                        borderRadius: '18px', display: 'inline-flex', justifyContent: 'center',
                        alignItems: 'center', color: 'white', marginBottom: '1rem',
                        boxShadow: '0 10px 30px -5px rgba(37, 99, 235, 0.4)'
                    }}>
                        <UserCheck size={32} />
                    </motion.div>
                    <h2 style={{ color: 'var(--primary)', margin: 0, fontSize: '1.8rem', letterSpacing: '-0.5px' }}>Student Registration</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '0.5rem' }}>Create your ASTU student account</p>
                </div>

                {/* Form */}
                <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>

                    {/* Full Name */}
                    <div style={{ position: 'relative' }}>
                        <User size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input type="text" placeholder="Full Name" className="input" style={{ paddingLeft: '45px' }}
                            value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                    </div>

                    {/* Email */}
                    <div style={{ position: 'relative' }}>
                        <Mail size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input type="email" placeholder="ASTU Student Email" className="input" style={{ paddingLeft: '45px' }}
                            value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
                    </div>

                    {/* Password + strength */}
                    <div>
                        <div style={{ position: 'relative' }}>
                            <Lock size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input type={showPassword ? 'text' : 'password'} placeholder="Password" className="input"
                                style={{ paddingLeft: '45px', paddingRight: '45px' }}
                                value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                required minLength={6} />
                            <button type="button" onClick={() => setShowPassword(!showPassword)}
                                style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', padding: 0 }}>
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>

                        {/* Strength bar */}
                        <AnimatePresence>
                            {formData.password && (
                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ marginTop: '0.5rem' }}>
                                    <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                                        {[1, 2, 3, 4, 5].map((seg) => (
                                            <motion.div key={seg}
                                                animate={{ background: strength.score >= seg ? strength.color : 'var(--glass-border)' }}
                                                transition={{ duration: 0.3 }}
                                                style={{ flex: 1, height: '4px', borderRadius: '2px' }} />
                                        ))}
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ fontSize: '0.75rem', color: strength.color, fontWeight: 600 }}>{strength.label}</span>
                                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Must contain "as" or "tu" + special char</span>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Confirm Password */}
                    <div>
                        <div style={{ position: 'relative' }}>
                            <Lock size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input type={showConfirm ? 'text' : 'password'} placeholder="Confirm Password" className="input"
                                style={{ paddingLeft: '45px', paddingRight: '45px', borderColor: passwordsMatch === false ? '#ef4444' : passwordsMatch === true ? '#22c55e' : undefined }}
                                value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
                            <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                                style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', padding: 0 }}>
                                {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                        <AnimatePresence>
                            {confirmPassword && (
                                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                    style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '0.4rem' }}>
                                    {passwordsMatch
                                        ? <><CheckCircle size={14} color="#22c55e" /><span style={{ fontSize: '0.75rem', color: '#22c55e' }}>Passwords match</span></>
                                        : <><XCircle size={14} color="#ef4444" /><span style={{ fontSize: '0.75rem', color: '#ef4444' }}>Passwords do not match</span></>}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Error */}
                    {error && (
                        <div style={{ background: '#ff4d4d15', border: '1px solid #ff4d4d40', borderRadius: '10px', padding: '0.75rem 1rem', color: '#ff4d4d', fontSize: '0.85rem', fontWeight: 500 }}>
                            {error}
                        </div>
                    )}

                    <motion.button whileHover={{ scale: 1.02, x: 5 }} whileTap={{ scale: 0.98 }}
                        type="submit" className="btn btn-primary"
                        style={{ width: '100%', justifyContent: 'center', padding: '1rem', borderRadius: '14px', marginTop: '0.5rem', opacity: loading ? 0.7 : 1 }}
                        disabled={loading}>
                        {loading ? 'Creating account…' : <> signup <ArrowRight size={20} /> </>}
                    </motion.button>
                </form>

                {/* Divider */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '1.5rem 0' }}>
                    <div style={{ flex: 1, height: '1px', background: 'var(--glass-border)' }} />
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>or continue with</span>
                    <div style={{ flex: 1, height: '1px', background: 'var(--glass-border)' }} />
                </div>

                {/* Google Sign-Up — at the bottom */}
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
                    <div id="google-signup-btn"></div>
                </div>

                <p style={{ marginTop: '1rem', textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                    Already have an account? <span style={{ color: 'var(--primary)', cursor: 'pointer', fontWeight: 600 }} onClick={() => navigate('/login')}>Login</span>
                </p>
                <div style={{ marginTop: '0.75rem', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', opacity: 0.7 }}>
                    Secured System for All.
                </div>
            </motion.div>
        </div>
    );
};

export default Signup;
