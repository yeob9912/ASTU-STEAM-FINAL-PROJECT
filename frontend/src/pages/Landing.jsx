import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    Users, ShieldAlert, GraduationCap, ArrowRight,
    Lock, CheckCircle, Sparkles, LogOut
} from 'lucide-react';

const Landing = ({ user, onLogout }) => {
    const navigate = useNavigate();

    // Capitalize name helper
    const capitalize = (str) => {
        if (!str) return 'User';
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    };

    const firstName = user?.name ? capitalize(user.name.split(' ')[0]) : 'User';

    const portals = [
        {
            id: 'student',
            title: 'Student Portal',
            desc: 'Centralized access for all student campus services.',
            icon: <GraduationCap size={32} />,
            color: '#2563eb',
            path: '/student'
        },
        {
            id: 'staff',
            title: 'Staff Portal',
            desc: 'Internal management tools for university staff.',
            icon: <Users size={32} />,
            color: '#10b981',
            path: '/staff'
        },
        {
            id: 'admin',
            title: 'Admin Console',
            desc: 'Full system oversight and security management.',
            icon: <ShieldAlert size={32} />,
            color: '#6366f1',
            path: '/admin'
        }
    ];

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.15, delayChildren: 0.2 }
        }
    };

    const cardVariants = {
        hidden: { y: 40, opacity: 0 },
        visible: {
            y: 0,
            opacity: 1,
            transition: { type: 'spring', damping: 20, stiffness: 100 }
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '4rem 1.5rem',
            position: 'relative',
            background: 'var(--bg-main)'
        }}>
            {/* Background elements */}
            <div style={{
                position: 'fixed', top: '10%', left: '5%', width: '400px', height: '400px',
                background: 'rgba(37, 99, 235, 0.05)', filter: 'blur(100px)', borderRadius: '50%', zIndex: -1
            }} />
            <div style={{
                position: 'fixed', bottom: '10%', right: '5%', width: '400px', height: '400px',
                background: 'rgba(99, 102, 241, 0.05)', filter: 'blur(100px)', borderRadius: '50%', zIndex: -1
            }} />

            {/* Header section - Pure and Neutral */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ textAlign: 'center', marginBottom: '5rem', maxWidth: '800px' }}
            >
                <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.6rem',
                    padding: '0.6rem 1.2rem', background: '#2563eb08', color: 'var(--primary)',
                    borderRadius: '50px', fontSize: '0.85rem', fontWeight: 700, marginBottom: '1.5rem',
                    border: '1px solid #2563eb15'
                }}>
                    <Sparkles size={16} /> ASTU Smart Hub
                </div>
                <h1 style={{
                    fontSize: '3.5rem', fontWeight: 900, letterSpacing: '-2px',
                    margin: 0, color: '#1e293b', lineHeight: 1.1
                }}>
                    Welcome, <span style={{ color: 'var(--primary)' }}>{firstName}</span>
                </h1>
                <p style={{ color: '#64748b', fontSize: '1.2rem', marginTop: '1.5rem', fontWeight: 500 }}>
                    Select a portal to continue. Your access is verified based on your role.
                </p>
            </motion.div>

            {/* Portal Grid */}
            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                    gap: '2rem',
                    width: '100%',
                    maxWidth: '1100px'
                }}
            >
                {portals.map((portal) => {
                    const isAuthorized = user?.role === portal.id;

                    return (
                        <motion.div
                            key={portal.id}
                            variants={cardVariants}
                            whileHover={isAuthorized ? { y: -10, scale: 1.02, boxShadow: '0 20px 40px rgba(0,0,0,0.08)' } : {}}
                            className="card glass"
                            style={{
                                padding: '2.5rem',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '1.5rem',
                                position: 'relative',
                                opacity: isAuthorized ? 1 : 0.6,
                                cursor: isAuthorized ? 'pointer' : 'not-allowed',
                                border: isAuthorized ? `1px solid ${portal.color}30` : '1px solid #e2e8f0',
                                background: isAuthorized ? 'white' : 'rgba(248, 250, 252, 0.8)',
                                overflow: 'hidden',
                                transition: 'all 0.3s ease'
                            }}
                            onClick={() => isAuthorized && navigate(portal.path)}
                        >
                            <div style={{
                                width: '60px', height: '60px', borderRadius: '16px',
                                background: isAuthorized ? `${portal.color}10` : '#f1f5f9',
                                color: isAuthorized ? portal.color : '#94a3b8',
                                display: 'flex', justifyContent: 'center', alignItems: 'center'
                            }}>
                                {portal.icon}
                            </div>

                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: '#1e293b' }}>
                                    {portal.title}
                                </h3>
                                <p style={{
                                    marginTop: '0.8rem', color: '#64748b', fontSize: '0.95rem',
                                    lineHeight: 1.6, minHeight: '3em'
                                }}>
                                    {portal.desc}
                                </p>
                            </div>

                            <div style={{
                                marginTop: 'auto', display: 'flex', alignItems: 'center',
                                gap: '0.6rem', fontWeight: 700, fontSize: '0.9rem',
                                color: isAuthorized ? portal.color : '#94a3b8'
                            }}>
                                {isAuthorized ? (
                                    <>
                                        Enter Portal <ArrowRight size={18} />
                                    </>
                                ) : (
                                    <>
                                        <Lock size={18} /> Access Restricted
                                    </>
                                )}
                            </div>

                            {isAuthorized && (
                                <div style={{
                                    position: 'absolute', top: '1.5rem', right: '1.5rem',
                                    color: portal.color, opacity: 0.6
                                }}>
                                    <CheckCircle size={20} />
                                </div>
                            )}
                        </motion.div>
                    );
                })}
            </motion.div>

            {/* Logout - Discreet footer for security, following neutral hub requirement */}
            <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2 }}
                onClick={onLogout}
                style={{
                    marginTop: '4rem', padding: '0.6rem 1.5rem',
                    background: 'transparent', border: '1px solid var(--border)',
                    borderRadius: '12px', color: 'var(--text-muted)', fontSize: '0.85rem',
                    fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.6rem',
                    cursor: 'pointer'
                }}
            >
                <LogOut size={16} /> Sign Out of System
            </motion.button>

            <style>{`
                .glass {
                    border: 1px solid rgba(255, 255, 255, 0.4);
                    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
                }
                @media (max-width: 768px) {
                    h1 { font-size: 2.2rem !important; }
                }
            `}</style>
        </div>
    );
};

export default Landing;
