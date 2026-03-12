import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
    LogOut, Layout, User as UserIcon, Bell, Menu, X, Plus,
    MessageCircle, History, ClipboardList, LayoutDashboard,
    FileText, Users, Grid, BarChart2, Settings, Trash2, Check, CheckCheck,
    Database, TrendingUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    apiGetNotifications,
    apiMarkAllNotificationsRead,
    apiMarkNotificationRead,
    apiDeleteNotification,
    apiDeleteProfilePicture,
    SERVER_URL
} from '../api';

const Navbar = ({ user, onLogout }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [showNotifications, setShowNotifications] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [expandedId, setExpandedId] = useState(null);

    // Fetch live notifications
    const fetchNotifications = async () => {
        if (!user) return;
        try {
            const res = await apiGetNotifications();
            if (res.success) setNotifications(res.notifications);
            else if (res.message && (res.message.includes('authorized') || res.message.includes('401'))) {
                onLogout();
            }
        } catch (err) {
            console.error('Failed to fetch notifications:', err);
        }
    };

    React.useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 30000); // Poll every 30s
        return () => clearInterval(interval);
    }, [user]);

    const handleMarkAllRead = async () => {
        try {
            const res = await apiMarkAllNotificationsRead();
            if (res.success) {
                setNotifications(notifications.map(n => ({ ...n, isRead: true })));
            }
        } catch (err) {
            console.error('Failed to mark all as read:', err);
        }
    };

    const handleMarkRead = async (e, id) => {
        e.stopPropagation();
        try {
            const res = await apiMarkNotificationRead(id);
            if (res.success) {
                setNotifications(notifications.map(n => n._id === id ? { ...n, isRead: true } : n));
            }
        } catch (err) {
            console.error('Failed to mark as read:', err);
        }
    };

    const handleDeleteNotification = async (e, id) => {
        e.stopPropagation();
        // Optimistic UI update: hide immediately
        setNotifications(prev => prev.filter(n => n._id !== id));
        try {
            await apiDeleteNotification(id);
        } catch (err) {
            console.error('Failed to delete notification:', err);
            // Optionally, we could restore the notification here if API fails, but user wants immediate deletion
        }
    };

    const handleNotificationClick = async (n) => {
        if (!n.isRead) {
            await apiMarkNotificationRead(n._id);
            setNotifications(notifications.map(notif => notif._id === n._id ? { ...notif, isRead: true } : notif));
        }

        setShowNotifications(false);

        // Redirection logic based on role and type
        const role = user?.role;
        const announcementTypes = ['Announcement', 'AnnouncementDelete'];

        if (announcementTypes.includes(n.type)) {
            if (role === 'student') navigate('/student/announcements');
            else if (role === 'staff') {
                window.dispatchEvent(new CustomEvent('staff-view-change', { detail: { view: 'announcements' } }));
                navigate('/staff');
            } else if (role === 'admin') {
                window.dispatchEvent(new CustomEvent('admin-section-change', { detail: { section: 'announcements' } }));
                navigate('/admin');
            }
        } else if (n.type === 'ProfileUpdate') {
            // Basic notification, no redirection needed
        } else {
            // Tickets (NewTicket, StatusUpdate, Remark, TicketRedirect, PriorityUpdate)
            if (role === 'student') navigate('/student/history', { state: { openTicketId: n.relatedTicket } });
            else if (role === 'staff') {
                window.dispatchEvent(new CustomEvent('staff-view-change', { detail: { view: 'tickets' } }));
                navigate('/staff', { state: { openTicketId: n.relatedTicket } });
            } else if (role === 'admin') {
                window.dispatchEvent(new CustomEvent('admin-section-change', { detail: { section: 'complaints' } }));
                navigate('/admin', { state: { openTicketId: n.relatedTicket } });
            }
        }
    };

    const unreadCount = notifications.filter(n => !n.isRead).length;

    const toggleChatbot = () => {
        window.dispatchEvent(new CustomEvent('open-astu-chatbot'));
        setIsMobileMenuOpen(false);
    };

    const sidebarVariants = {
        open: {
            x: 0,
            transition: {
                type: 'tween',
                ease: 'linear',
                duration: 0.3,
                staggerChildren: 0.04,
                delayChildren: 0.1
            }
        },
        closed: {
            x: '-100%',
            transition: {
                type: 'tween',
                ease: 'linear',
                duration: 0.25
            }
        }
    };

    const itemVariants = {
        open: {
            opacity: 1,
            x: 0,
            transition: { type: 'tween', ease: 'linear', duration: 0.2 }
        },
        closed: {
            opacity: 0,
            x: -15,
            transition: { type: 'tween', ease: 'linear', duration: 0.15 }
        }
    };

    return (
        <nav className="nav-container" style={{
            padding: '0.8rem 2rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            position: 'sticky',
            top: 0,
            zIndex: 1000,
            background: 'var(--nav-bg)',
            width: '100%'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', cursor: 'pointer' }} onClick={() => navigate('/')}>
                <div style={{ padding: '8px', background: 'var(--primary)', borderRadius: '10px', color: 'white' }}>
                    <Layout size={22} />
                </div>
                <h3 style={{ margin: 0, fontSize: '1.4rem', color: 'var(--primary)', letterSpacing: '-0.5px' }}>ASTU Smart</h3>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                {user ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>

                        {/* ── Bell icon: visible on ALL screen sizes ── */}
                        <div style={{ position: 'relative' }}>
                            <button
                                onClick={() => setShowNotifications(!showNotifications)}
                                className="btn"
                                style={{ padding: '8px', background: 'transparent', position: 'relative', border: 'none' }}
                            >
                                <Bell size={20} />
                                {unreadCount > 0 && (
                                    <span style={{
                                        position: 'absolute', top: '1px', right: '1px',
                                        minWidth: '18px', height: '18px',
                                        background: 'var(--danger)', borderRadius: '50%',
                                        color: 'white', fontSize: '0.65rem', fontWeight: '800',
                                        display: 'flex', justifyContent: 'center', alignItems: 'center',
                                        padding: '2px', boxShadow: '0 0 0 2px var(--nav-bg)'
                                    }}>{unreadCount}</span>
                                )}
                            </button>

                            <AnimatePresence>
                                {showNotifications && (
                                    <>
                                        {/* Click-away backdrop */}
                                        <div
                                            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000 }}
                                            onClick={() => setShowNotifications(false)}
                                        />
                                        <motion.div
                                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                            className="card glass"
                                            style={{
                                                position: 'fixed', right: '1rem', top: '65px',
                                                width: '320px', borderRadius: '16px', padding: '1.2rem',
                                                zIndex: 1001,
                                                maxHeight: 'calc(100vh - 85px)',
                                                display: 'flex', flexDirection: 'column',
                                                boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15), 0 10px 10px -5px rgba(0,0,0,0.06)',
                                                border: '1px solid var(--border)'
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border)', pb: '0.8rem' }}>
                                                <div>
                                                    <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>Notifications</h4>
                                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{unreadCount} Unread</span>
                                                </div>
                                                <button
                                                    onClick={handleMarkAllRead}
                                                    disabled={unreadCount === 0}
                                                    title="Mark all as read"
                                                    style={{
                                                        padding: '6px 10px',
                                                        background: 'var(--primary)',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '8px',
                                                        fontSize: '0.7rem',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '4px',
                                                        cursor: unreadCount === 0 ? 'not-allowed' : 'pointer',
                                                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                                        opacity: unreadCount === 0 ? 0.5 : 1
                                                    }}
                                                    onMouseEnter={(e) => { if (unreadCount > 0) e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)'; }}
                                                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0) scale(1)'; }}
                                                >
                                                    <CheckCheck size={14} /> <span>All Read</span>
                                                </button>
                                            </div>

                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem', overflowY: 'auto', paddingRight: '4px', paddingBottom: '0.5rem', flex: 1, minHeight: 0 }}>
                                                {notifications.length === 0 ? (
                                                    <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)', padding: '2rem' }}>No notifications</p>
                                                ) : (
                                                    notifications.map(n => {
                                                        const isExpanded = expandedId === n._id;
                                                        return (
                                                            <motion.div
                                                                key={n._id}
                                                                layout
                                                                onClick={() => setExpandedId(isExpanded ? null : n._id)}
                                                                style={{
                                                                    padding: '0.8rem',
                                                                    borderRadius: '12px',
                                                                    background: !n.isRead ? 'rgba(37,99,235,0.06)' : 'var(--card-bg)',
                                                                    border: `1px solid ${isExpanded ? 'var(--primary)' : 'var(--border)'} `,
                                                                    cursor: 'pointer',
                                                                    transition: 'border-color 0.2s ease, background 0.2s ease',
                                                                    boxShadow: isExpanded ? '0 4px 12px -2px rgba(37,99,235,0.15)' : 'none'
                                                                }}
                                                                whileHover={{ scale: 1.005 }}
                                                            >
                                                                {/* Collapsed header row */}
                                                                <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'flex-start' }}>
                                                                    <div style={{ marginTop: '5px', flexShrink: 0 }}>
                                                                        {!n.isRead
                                                                            ? <motion.div layoutId={`dot - ${n._id} `} style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary)' }} />
                                                                            : <div style={{ width: '8px' }} />
                                                                        }
                                                                    </div>
                                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                                        <p style={{
                                                                            margin: 0,
                                                                            fontSize: '0.82rem',
                                                                            fontWeight: !n.isRead ? 600 : 500,
                                                                            color: 'var(--text-main)',
                                                                            lineHeight: 1.5,
                                                                        }}>
                                                                            {n.message}
                                                                        </p>
                                                                        <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>
                                                                            {new Date(n.createdAt).toLocaleDateString()}
                                                                        </span>
                                                                    </div>
                                                                    <motion.div
                                                                        animate={{ rotate: isExpanded ? 180 : 0 }}
                                                                        transition={{ duration: 0.2 }}
                                                                        style={{ flexShrink: 0, color: 'var(--text-muted)', marginTop: '3px' }}
                                                                    >
                                                                        <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                                                                            <path d="M6 8L1 3h10L6 8z" />
                                                                        </svg>
                                                                    </motion.div>
                                                                </div>

                                                                {/* Expanded detail section */}
                                                                <AnimatePresence initial={false}>
                                                                    {isExpanded && (
                                                                        <motion.div
                                                                            key="detail"
                                                                            initial={{ opacity: 0, height: 0 }}
                                                                            animate={{ opacity: 1, height: 'auto' }}
                                                                            exit={{ opacity: 0, height: 0 }}
                                                                            transition={{ duration: 0.25, ease: 'easeInOut' }}
                                                                            style={{ overflow: 'hidden' }}
                                                                        >
                                                                            <div style={{ marginTop: '0.8rem', borderTop: '1px dashed var(--border)', paddingTop: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                                                                <motion.button
                                                                                    initial={{ opacity: 0, y: 4 }}
                                                                                    animate={{ opacity: 1, y: 0 }}
                                                                                    transition={{ delay: 0.1 }}
                                                                                    onClick={(e) => { e.stopPropagation(); handleNotificationClick(n); }}
                                                                                    className="btn btn-primary"
                                                                                    style={{
                                                                                        width: '100%',
                                                                                        padding: '0.45rem',
                                                                                        fontSize: '0.75rem',
                                                                                        justifyContent: 'center',
                                                                                    }}
                                                                                >
                                                                                    <LayoutDashboard size={14} style={{ marginRight: '6px' }} /> View Details
                                                                                </motion.button>
                                                                                <motion.div
                                                                                    initial={{ opacity: 0 }}
                                                                                    animate={{ opacity: 1 }}
                                                                                    transition={{ delay: 0.15 }}
                                                                                    style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem' }}
                                                                                >
                                                                                    {!n.isRead && (
                                                                                        <button
                                                                                            onClick={(e) => handleMarkRead(e, n._id)}
                                                                                            title="Mark as read"
                                                                                            style={{ padding: '4px 8px', background: 'rgba(37,99,235,0.08)', border: 'none', color: 'var(--primary)', cursor: 'pointer', borderRadius: '6px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '4px', transition: 'background 0.2s' }}
                                                                                        >
                                                                                            <Check size={12} /> Read
                                                                                        </button>
                                                                                    )}
                                                                                    <button
                                                                                        onClick={(e) => handleDeleteNotification(e, n._id)}
                                                                                        title="Delete"
                                                                                        style={{ padding: '4px 8px', background: 'rgba(239,68,68,0.08)', border: 'none', color: 'var(--danger)', cursor: 'pointer', borderRadius: '6px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '4px', transition: 'background 0.2s' }}
                                                                                    >
                                                                                        <Trash2 size={12} /> Delete
                                                                                    </button>
                                                                                </motion.div>
                                                                            </div>
                                                                        </motion.div>
                                                                    )}
                                                                </AnimatePresence>
                                                            </motion.div>
                                                        );
                                                    })
                                                )}
                                            </div>
                                        </motion.div>
                                    </>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* ── User Avatar: visible on ALL screens ── */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                            <div style={{
                                width: '36px', height: '36px', borderRadius: '10px',
                                background: 'var(--primary)', color: 'white',
                                display: 'flex', justifyContent: 'center', alignItems: 'center',
                                overflow: 'hidden', border: '2px solid white', boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                            }}>
                                {user?.profilePicture ? (
                                    <img
                                        src={user.profilePicture.startsWith('data:') ? user.profilePicture : `${SERVER_URL}${user.profilePicture}`}
                                        alt="Profile"
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                ) : (
                                    <UserIcon size={20} />
                                )}
                            </div >
                            <div className="desk-only">
                                <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem', textTransform: 'capitalize' }}>{user?.name || 'User'}</p>
                                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'capitalize' }}>{user?.role || 'Portal Access'}</p>
                            </div>
                        </div >

                        {/* ── Logout: desktop only ── */}
                        < button onClick={onLogout} className="desk-only btn" style={{ background: '#ff4d4d1a', color: '#ff4d4d', padding: '0.5rem 1rem', marginLeft: '0.5rem' }}>
                            <LogOut size={18} /> <span>Logout</span>
                        </button >

                        {/* ── Hamburger: mobile only ── */}
                        < button
                            className="mob-only btn"
                            style={{ padding: '8px' }}
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        >
                            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                        </button >
                    </div >
                ) : (
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <Link to="/login" className="btn" style={{ color: 'var(--text-main)', padding: '0.5rem 1.2rem' }}>Login</Link>
                        <Link to="/signup" className="btn btn-primary" style={{ padding: '0.5rem 1.2rem' }}><span>Join Now</span></Link>
                    </div>
                )}
            </div >


            <AnimatePresence>
                {isMobileMenuOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.3, ease: 'linear' }}
                            onClick={() => setIsMobileMenuOpen(false)}
                            style={{
                                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                                background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', zIndex: 1999
                            }}
                        />

                        {/* Sidebar */}
                        <motion.div
                            variants={sidebarVariants}
                            initial="closed"
                            animate="open"
                            exit="closed"
                            className="card mob-only"
                            style={{
                                position: 'fixed', top: 0, left: 0, bottom: 0,
                                width: '280px', padding: '2rem 1.5rem', zIndex: 2000,
                                borderRadius: '0 20px 20px 0', borderLeft: 'none',
                                overflowY: 'auto', display: 'flex', flexDirection: 'column'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                                    <div style={{ padding: '8px', background: 'var(--primary)', borderRadius: '10px', color: 'white' }}>
                                        <Layout size={20} />
                                    </div>
                                    <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--primary)', fontWeight: 800 }}>ASTU Smart</h3>
                                </div>
                                <button className="btn" onClick={() => setIsMobileMenuOpen(false)} style={{ padding: '8px' }}>
                                    <X size={24} />
                                </button>
                            </div>

                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                <motion.div variants={itemVariants} style={{ display: 'flex', alignItems: 'center', gap: '1rem', paddingBottom: '1.5rem' }}>
                                    <div style={{ width: '45px', height: '45px', borderRadius: '12px', background: 'var(--primary)', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'white', overflow: 'hidden' }}>
                                        {user?.profilePicture ? (
                                            <img
                                                src={user.profilePicture.startsWith('data:') ? user.profilePicture : `${SERVER_URL}${user.profilePicture}`}
                                                alt="Profile"
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                            />
                                        ) : (
                                            <UserIcon size={24} />
                                        )}
                                    </div>
                                    <div style={{ overflow: 'hidden' }}>
                                        <h4 style={{ margin: 0, fontSize: '1rem', whiteSpace: 'nowrap', textOverflow: 'ellipsis', textTransform: 'capitalize' }}>{user?.name || 'User'}</h4>
                                        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'capitalize' }}>{user?.role || 'Account'}</p>
                                    </div>
                                </motion.div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <motion.p variants={itemVariants} style={{ margin: '1rem 0 0.5rem 0', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '1px' }}>DASHBOARD MENU</motion.p>

                                    {user?.role === 'student' && (
                                        <>
                                            <motion.div variants={itemVariants}>
                                                <Link to="/student" onClick={() => setIsMobileMenuOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--text-main)', textDecoration: 'none', fontWeight: 600, padding: '0.8rem', borderRadius: '12px', background: location.pathname === '/student' ? 'var(--primary)10' : 'transparent' }}>
                                                    <Layout size={18} /> Summary
                                                </Link>
                                            </motion.div>
                                            <motion.div variants={itemVariants}>
                                                <Link to="/student/submit" onClick={() => setIsMobileMenuOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--text-main)', textDecoration: 'none', fontWeight: 600, padding: '0.8rem', borderRadius: '12px', background: location.pathname === '/student/submit' ? 'var(--primary)10' : 'transparent' }}>
                                                    <Plus size={18} /> Submit Ticket
                                                </Link>
                                            </motion.div>
                                            <motion.div variants={itemVariants}>
                                                <Link to="/student/history" onClick={() => setIsMobileMenuOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--text-main)', textDecoration: 'none', fontWeight: 600, padding: '0.8rem', borderRadius: '12px', background: location.pathname === '/student/history' ? 'var(--primary)10' : 'transparent' }}>
                                                    <History size={18} /> View History
                                                </Link>
                                            </motion.div>
                                            <motion.div variants={itemVariants}>
                                                <Link to="/student/announcements" onClick={() => setIsMobileMenuOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--text-main)', textDecoration: 'none', fontWeight: 600, padding: '0.8rem', borderRadius: '12px', background: location.pathname === '/student/announcements' ? 'var(--primary)10' : 'transparent' }}>
                                                    <Bell size={18} /> Announcements
                                                </Link>
                                            </motion.div>
                                            <motion.div variants={itemVariants}>
                                                <Link to="/student/settings" onClick={() => setIsMobileMenuOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--text-main)', textDecoration: 'none', fontWeight: 600, padding: '0.8rem', borderRadius: '12px', background: location.pathname === '/student/settings' ? 'var(--primary)10' : 'transparent' }}>
                                                    <Settings size={18} /> Settings
                                                </Link>
                                            </motion.div>
                                        </>
                                    )}

                                    {user?.role === 'staff' && (
                                        <>
                                            {['All', 'Open', 'In Progress', 'Resolved'].map(f => (
                                                <motion.button
                                                    key={f}
                                                    variants={itemVariants}
                                                    onClick={() => {
                                                        window.dispatchEvent(new CustomEvent('staff-filter-change', { detail: { filter: f } }));
                                                        setIsMobileMenuOpen(false);
                                                    }}
                                                    style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--text-main)', fontWeight: 600, background: 'transparent', border: 'none', padding: '0.8rem', borderRadius: '12px', cursor: 'pointer', textAlign: 'left', width: '100%', fontFamily: 'inherit' }}
                                                >
                                                    <ClipboardList size={18} /> {f} Tickets
                                                </motion.button>
                                            ))}
                                            <motion.button
                                                variants={itemVariants}
                                                onClick={() => {
                                                    window.dispatchEvent(new CustomEvent('staff-view-change', { detail: { view: 'announcements' } }));
                                                    setIsMobileMenuOpen(false);
                                                }}
                                                style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--text-main)', fontWeight: 600, background: 'transparent', border: 'none', padding: '0.8rem', borderRadius: '12px', cursor: 'pointer', textAlign: 'left', width: '100%', fontFamily: 'inherit' }}
                                            >
                                                <Bell size={18} /> Announcements
                                            </motion.button>
                                            <motion.button
                                                variants={itemVariants}
                                                onClick={() => {
                                                    window.dispatchEvent(new CustomEvent('staff-view-change', { detail: { view: 'settings' } }));
                                                    setIsMobileMenuOpen(false);
                                                }}
                                                style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--text-main)', fontWeight: 600, background: 'transparent', border: 'none', padding: '0.8rem', borderRadius: '12px', cursor: 'pointer', textAlign: 'left', width: '100%', fontFamily: 'inherit' }}
                                            >
                                                <Settings size={18} /> Account Settings
                                            </motion.button>
                                        </>
                                    )}

                                    {user?.role === 'admin' && (
                                        ['Overview', 'Complaints', 'Users', 'Categories', 'Analytics', 'Announcements', 'Knowledge Base', 'Settings'].map(sect => (
                                            <motion.button
                                                key={sect}
                                                variants={itemVariants}
                                                onClick={() => {
                                                    const sectionId = sect.toLowerCase().replace(' ', '-');
                                                    window.dispatchEvent(new CustomEvent('admin-section-change', { detail: { section: sectionId } }));
                                                    setIsMobileMenuOpen(false);
                                                }}
                                                style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--text-main)', fontWeight: 600, background: 'transparent', border: 'none', padding: '0.8rem', borderRadius: '12px', cursor: 'pointer', textAlign: 'left', width: '100%' }}
                                            >
                                                {sect === 'Overview' && <LayoutDashboard size={18} />}
                                                {sect === 'Complaints' && <FileText size={18} />}
                                                {sect === 'Users' && <Users size={18} />}
                                                {sect === 'Categories' && <Grid size={18} />}
                                                {sect === 'Analytics' && <BarChart2 size={18} />}
                                                {sect === 'Announcements' && <Bell size={18} />}
                                                {sect === 'Knowledge Base' && <Database size={18} />}
                                                {sect === 'Settings' && <Settings size={18} />}
                                                <span style={{ fontSize: '0.9rem' }}>{sect}</span>
                                            </motion.button>
                                        ))
                                    )}
                                </div>
                            </div>

                            <motion.div variants={itemVariants} style={{ marginTop: 'auto', borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
                                <button onClick={() => { onLogout(); setIsMobileMenuOpen(false); }} className="btn" style={{ width: '100%', justifyContent: 'center', background: '#ff4d4d1a', color: '#ff4d4d', borderRadius: '12px', padding: '1rem' }}>
                                    <LogOut size={18} /> Sign Out
                                </button>
                            </motion.div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </nav >
    );
};

export default Navbar;
