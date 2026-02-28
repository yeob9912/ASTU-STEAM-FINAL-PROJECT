import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, Mail, ArrowRight, UserCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { apiSignup } from '../api';

const Signup = ({ onSignup }) => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: 'student' // Force student role
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSignup = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await apiSignup(formData);
            if (!res.success) {
                setError(res.message || 'Signup failed');
                setLoading(false);
                return;
            }
            localStorage.setItem('astu_token', res.token);
            localStorage.setItem('astu_user', JSON.stringify(res.user));
            onSignup(res.user);
            navigate('/');

        } catch (err) {
            setError('Server error. Is the backend running?');
        }
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
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <motion.div
                        whileHover={{ scale: 1.1, rotateY: 180 }}
                        style={{
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

                <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                    {/* Role selection removed - only Students can signup */}

                    <div style={{ position: 'relative' }}>
                        <User size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input
                            type="text"
                            placeholder="Full Name"
                            className="input"
                            style={{ paddingLeft: '45px' }}
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                        />
                    </div>

                    <div style={{ position: 'relative' }}>
                        <Mail size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input
                            type="email"
                            placeholder="ASTU Student Email"
                            className="input"
                            style={{ paddingLeft: '45px' }}
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            required
                        />
                    </div>

                    <div style={{ position: 'relative' }}>
                        <Lock size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input
                            type="password"
                            placeholder="Create Password (min 6 chars)"
                            className="input"
                            style={{ paddingLeft: '45px' }}
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            required
                            minLength={6}
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
                        style={{ width: '100%', justifyContent: 'center', padding: '1rem', borderRadius: '14px', marginTop: '1rem', opacity: loading ? 0.7 : 1 }}
                        disabled={loading}
                    >
                        {loading ? 'Creating account…' : <> Register as Student <ArrowRight size={20} /> </>}
                    </motion.button>
                </form>

                <p style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                    Already have an account? <span style={{ color: 'var(--primary)', cursor: 'pointer', fontWeight: 600 }} onClick={() => navigate('/login')}>Login</span>
                </p>
                <div style={{ marginTop: '1rem', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', opacity: 0.7 }}>
                    Staff accounts are managed by the Administration.
                </div>
            </motion.div>
        </div>
    );
};

export default Signup;
