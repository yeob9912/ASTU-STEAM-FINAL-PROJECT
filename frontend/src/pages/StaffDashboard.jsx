import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Inbox, CheckCircle, RefreshCcw, Search, MessageSquare,
    AlertCircle, ChevronDown, Filter, X, Save, Paperclip,
    Clock, Layout, MoreVertical, LogOut, User as UserIcon, Menu, Bell, Download, FileText,
    Camera, Settings, Trash2, Briefcase
} from 'lucide-react';
import {
    apiGetDepartmentTickets, apiUpdateTicketStatus, apiAddRemark,
    apiUpdateProfile, apiGetNotifications, apiMarkAllNotificationsRead,
    apiGetAnnouncements, apiDeleteProfilePicture, apiGetCategories, apiChangePassword
} from '../api';

const StaffDashboard = ({ user, setUser, onLogout }) => {
    const location = useLocation();
    const [complaints, setComplaints] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [announcements, setAnnouncements] = useState([]);
    const [categories, setCategories] = useState([]);

    const [filter, setFilter] = useState('All');
    const [searchTerm, setSearchTerm] = useState('');

    // Helper to capitalize strings
    const capitalize = (str) => {
        if (!str) return 'User';
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    };

    const [selectedTicket, setSelectedTicket] = useState(null);
    const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
    const [modalMode, setModalMode] = useState('view');
    const [remarkText, setRemarkText] = useState('');
    const [editingRemarkId, setEditingRemarkId] = useState(null);
    const [editRemarkText, setEditRemarkText] = useState('');
    const [remarkLoading, setRemarkLoading] = useState(false);
    const [view, setView] = useState('tickets');
    const [tempStatus, setTempStatus] = useState('');
    const [viewImage, setViewImage] = useState(null);

    const DEPARTMENTS = useMemo(() => {
        return categories.map(c => typeof c === 'string' ? c : c.name);
    }, [categories]);

    const userDepts = user?.departments || [];
    const userDeptsDisplay = userDepts.length > 0 ? userDepts.join(', ') : 'Assigned';

    // Fetch data on mount
    useEffect(() => {
        apiGetDepartmentTickets().then(res => {
            if (res.success) {
                setComplaints(res.tickets);
                if (location.state?.openTicketId) {
                    const ticketToOpen = res.tickets.find(t => (t._id || t.id) === location.state.openTicketId);
                    if (ticketToOpen) {
                        setSelectedTicket(ticketToOpen);
                        setModalMode('view');
                        setView('tickets');
                        window.history.replaceState({}, document.title, location.pathname);
                    }
                }
            }
        });
        apiGetNotifications().then(res => { if (res.success) setNotifications(res.notifications); });
        apiGetAnnouncements().then(res => { if (res.success) setAnnouncements(res.announcements); });
        apiGetCategories().then(res => { if (res.success) setCategories(res.categories); });
    }, [location.state]);

    const openFile = (url) => {
        if (!url) return;
        if (url.match(/\.(jpeg|jpg|gif|png|webp|bmp)$/i) || url.startsWith('data:image')) {
            setViewImage(url.startsWith('http') || url.startsWith('data:') ? url : `http://localhost:5000${url}`);
            return;
        }
        if (url.startsWith('data:')) {
            const win = window.open();
            if (win) {
                win.document.write('<iframe src="' + url + '" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>');
            } else {
                alert('Please allow popups to view files');
            }
        } else {
            window.open(url.startsWith('http') ? url : `http://localhost:5000${url}`, '_blank');
        }
    };

    const updateStatus = async (id, newStatus) => {
        const res = await apiUpdateTicketStatus(id, { status: newStatus });
        if (res.success) {
            setComplaints(complaints.map(c => c._id === id || c.id === id ? { ...c, status: newStatus } : c));
            if (selectedTicket && (selectedTicket._id === id || selectedTicket.id === id)) {
                setSelectedTicket({ ...selectedTicket, status: newStatus });
            }
        }
    };

    const addRemark = async (e) => {
        e.preventDefault();
        // Fallback for legacy calls
        handleCombinedUpdate();
    };

    const handleCombinedUpdate = async (e) => {
        if (e) e.preventDefault();
        const ticketId = selectedTicket._id || selectedTicket.id;
        setRemarkLoading(true);

        const res = await apiUpdateTicketStatus(ticketId, {
            status: tempStatus,
            remark: remarkText
        });

        if (res.success) {
            setComplaints(complaints.map(c =>
                (c._id === ticketId || c.id === ticketId) ? res.ticket : c
            ));
            setSelectedTicket(res.ticket);
            setRemarkText('');
            // Optional: Show success toast or feedback
        }
        setRemarkLoading(false);
    };

    const handleUpdateRemark = async (remarkId) => {
        if (!editRemarkText.trim()) return;
        setRemarkLoading(true);
        const ticketId = selectedTicket._id || selectedTicket.id;
        const { apiUpdateRemark } = await import('../api'); // lazy load if needed or ensure it's exported
        const res = await apiUpdateRemark(ticketId, remarkId, editRemarkText);
        if (res.success) {
            setComplaints(complaints.map(c =>
                (c._id === ticketId || c.id === ticketId) ? res.ticket : c
            ));
            setSelectedTicket(res.ticket);
            setEditingRemarkId(null);
            setEditRemarkText('');
        }
        setRemarkLoading(false);
    };

    const statusColors = {
        'Open': '#ef4444',
        'In Progress': '#f59e0b',
        'Resolved': '#10b981'
    };

    useEffect(() => {
        const handleFilterChange = (e) => {
            if (e.detail && e.detail.filter) {
                setFilter(e.detail.filter);
                setView('tickets');
            }
        };
        const handleViewChange = (e) => {
            if (e.detail && e.detail.view) {
                setView(e.detail.view);
            }
        };
        window.addEventListener('staff-filter-change', handleFilterChange);
        window.addEventListener('staff-view-change', handleViewChange);
        return () => {
            window.removeEventListener('staff-filter-change', handleFilterChange);
            window.removeEventListener('staff-view-change', handleViewChange);
        };
    }, []);

    // Department Guard & Filtering
    // Backend already returns only department tickets; keep all for local filter
    const departmentComplaints = complaints;

    const filteredComplaints = useMemo(() => {
        return departmentComplaints.filter(c => {
            const matchesFilter = filter === 'All' || c.status === filter;
            const id = c.ticketId || c._id || c.id || '';
            const student = c.studentName || c.student || '';
            const matchesSearch = id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                student.toLowerCase().includes(searchTerm.toLowerCase()) ||
                c.title.toLowerCase().includes(searchTerm.toLowerCase());
            return matchesFilter && matchesSearch;
        });
    }, [departmentComplaints, filter, searchTerm]);


    if (user?.role !== 'staff') {
        return (
            <AnimatePresence>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card" style={{ textAlign: 'center', padding: '10rem' }}>
                    Access Denied. Staff Only Area.
                </motion.div>
            </AnimatePresence>
        );
    }

    return (
        <div style={{ display: 'flex', minHeight: 'calc(100vh - 64px)', background: '#f8fafc' }}>
            {/* Sidebar */}
            <aside className="dashboard-sidebar desk-only" style={{
                width: '180px', background: 'white', borderRight: '1px solid #f1f5f9',
                padding: '1rem 0.5rem', display: 'flex', flexDirection: 'column',
                position: 'sticky', top: '64px', height: 'calc(100vh - 64px)', zIndex: 100
            }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.3rem', marginTop: '1.5rem' }}>
                    <p style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--text-muted)', letterSpacing: '1.5px', paddingLeft: '0.8rem', marginBottom: '0.3rem' }}>QUEUE FILTERS</p>
                    {['All', 'Open', 'In Progress', 'Resolved'].map((s) => {
                        return (
                            <button
                                key={s}
                                onClick={() => {
                                    setFilter(s);
                                    setView('tickets');
                                    apiMarkAllNotificationsRead().then(res => {
                                        if (res.success) {
                                            setNotifications(notifications.map(n => ({ ...n, isRead: true })));
                                        }
                                    });
                                }}
                                style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    background: (filter === s && view === 'tickets') ? '#2563eb12' : 'transparent',
                                    color: (filter === s && view === 'tickets') ? 'var(--primary)' : 'var(--text-muted)',
                                    border: 'none', padding: '0.7rem 1rem', borderRadius: '10px',
                                    fontWeight: (filter === s && view === 'tickets') ? 800 : 500, cursor: 'pointer', transition: 'all 0.3s ease',
                                    width: '100%', textAlign: 'left', fontFamily: 'inherit', fontSize: '0.85rem',
                                    position: 'relative'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span>{s} Tickets</span>
                                </div>
                                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>

                                    <span style={{ fontSize: '0.7rem', background: '#e2e8f0', color: '#475569', padding: '2px 8px', borderRadius: '6px' }}>
                                        {s === 'All' ? departmentComplaints.length : departmentComplaints.filter(c => c.status === s).length}
                                    </span>
                                </div>
                            </button>
                        );
                    })}

                    <button
                        onClick={() => setView('announcements')}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '0.75rem',
                            background: view === 'announcements' ? '#2563eb12' : 'transparent',
                            color: view === 'announcements' ? 'var(--primary)' : 'var(--text-muted)',
                            border: 'none', padding: '0.7rem 1rem', borderRadius: '10px',
                            fontWeight: view === 'announcements' ? 800 : 500, cursor: 'pointer', transition: 'all 0.3s ease',
                            width: '100%', textAlign: 'left', fontFamily: 'inherit', fontSize: '0.85rem'
                        }}
                    >
                        <Bell size={18} /> Announcements
                    </button>

                    <button
                        onClick={() => setView('settings')}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '0.75rem',
                            background: view === 'settings' ? '#2563eb12' : 'transparent',
                            color: view === 'settings' ? 'var(--primary)' : 'var(--text-muted)',
                            border: 'none', padding: '0.7rem 1rem', borderRadius: '10px',
                            fontWeight: view === 'settings' ? 800 : 500, cursor: 'pointer', transition: 'all 0.3s ease',
                            width: '100%', textAlign: 'left', fontFamily: 'inherit', fontSize: '0.85rem'
                        }}
                    >
                        <Settings size={18} /> Account Settings
                    </button>

                    {/* Main buttons footer could go here */}
                </div>

                <button onClick={onLogout} className="btn" style={{ background: '#fecaca', color: '#b91c1c', marginTop: 'auto', width: '100%', justifyContent: 'center', padding: '0.6rem', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                    <LogOut size={16} /> Logout
                </button>
            </aside>

            {/* Content Area */}
            <main style={{ flex: 1, padding: '3.5rem', overflowY: 'auto' }}>
                <header style={{ marginBottom: '3.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <h1 style={{ fontSize: '2.8rem', fontWeight: 900, letterSpacing: '-1px', color: '#1e293b', margin: 0, textTransform: 'capitalize' }}>
                            {view === 'settings' ? 'Account Settings' : view === 'announcements' ? 'Announcements' : `Welcome, ${user?.name?.split(' ')[0]}`}
                        </h1>
                        <p style={{ color: '#64748b', fontSize: '1.1rem', marginTop: '0.5rem' }}>
                            {view === 'settings' ? 'Manage your personal profile and security' : view === 'announcements' ? 'Broadcasts from the administration' : `Management for ${userDeptsDisplay} department support.`}
                        </p>
                    </div>
                </header>

                {view === 'settings' ? (
                    <StaffSettingsView user={user} setUser={setUser} />
                ) : view === 'announcements' ? (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        {announcements.length > 0 ? announcements.map((ann, idx) => (
                            <motion.div
                                key={idx}
                                className="card"
                                style={{ padding: '2rem', borderLeft: '4px solid var(--primary)', cursor: 'pointer' }}
                                onClick={() => setSelectedAnnouncement(ann)}
                                whileHover={{ y: -5, boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                    <h3 style={{ margin: 0, fontSize: '1.25rem' }}>{ann.title}</h3>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', background: '#f1f5f9', padding: '4px 12px', borderRadius: '20px' }}>
                                        {new Date(ann.createdAt).toLocaleDateString()}
                                    </span>
                                </div>
                                <p style={{ color: 'var(--text-main)', lineHeight: 1.6, whiteSpace: 'pre-wrap', maxHeight: '100px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ann.text || ann.content}</p>
                                <div style={{ marginTop: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
                                        <div style={{ width: '24px', height: '24px', background: 'var(--primary)', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'white' }}>
                                            <Bell size={12} />
                                        </div>
                                        <span style={{ fontSize: '0.85rem' }}>Administrator</span>
                                    </div>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600 }}>Click to read more →</span>
                                </div>
                            </motion.div>
                        )) : (
                            <div className="card" style={{ padding: '4rem', textAlign: 'center' }}>
                                <Bell size={48} style={{ opacity: 0.1, marginBottom: '1rem' }} />
                                <p style={{ color: 'var(--text-muted)' }}>No announcements yet.</p>
                            </div>
                        )}

                        {/* Announcement Details Modal */}
                        <AnimatePresence>
                            {selectedAnnouncement && (
                                <motion.div
                                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                    style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', zIndex: 2000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem' }}
                                    onClick={() => setSelectedAnnouncement(null)}
                                >
                                    <motion.div
                                        initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                                        className="card" style={{ width: '100%', maxWidth: '700px', padding: '3rem', maxHeight: '90vh', overflowY: 'auto' }}
                                        onClick={e => e.stopPropagation()}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                <div style={{ width: '40px', height: '40px', background: 'var(--primary)', borderRadius: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'white' }}>
                                                    <Bell size={20} />
                                                </div>
                                                <h3 style={{ margin: 0 }}>Announcement Details</h3>
                                            </div>
                                            <button className="btn glass" onClick={() => setSelectedAnnouncement(null)}><X size={20} /></button>
                                        </div>

                                        <div style={{ marginBottom: '1.5rem' }}>
                                            <span style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 700, background: 'rgba(37, 99, 235, 0.1)', padding: '6px 16px', borderRadius: '30px', textTransform: 'uppercase' }}>
                                                Admin Broadcast
                                            </span>
                                            <h2 style={{ fontSize: '2rem', fontWeight: 900, marginTop: '1rem', letterSpacing: '-1px' }}>{selectedAnnouncement.title}</h2>
                                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                                                Posted on {new Date(selectedAnnouncement.createdAt).toLocaleDateString()} at {new Date(selectedAnnouncement.createdAt).toLocaleTimeString()}
                                            </p>
                                        </div>

                                        <div style={{ background: '#f8fafc', padding: '2rem', borderRadius: '20px', border: '1px solid var(--border)', lineHeight: 1.8, fontSize: '1.1rem', color: 'var(--text-main)', whiteSpace: 'pre-wrap' }}>
                                            {selectedAnnouncement.text || selectedAnnouncement.content}
                                        </div>

                                        <div style={{ marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
                                            <button className="btn btn-primary" onClick={() => setSelectedAnnouncement(null)} style={{ padding: '0.8rem 2.5rem' }}>Close Reading</button>
                                        </div>
                                    </motion.div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                ) : (
                    <div className="card" style={{ padding: '0' }}>
                        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', gap: '1.5rem' }}>
                            <div style={{ position: 'relative', flex: 1, maxWidth: '500px' }}>
                                <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input
                                    className="input"
                                    placeholder="Search ticket ID, title or student name..."
                                    style={{ paddingLeft: '40px' }}
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button className="btn glass"><Filter size={18} /> Advanced</button>
                            </div>
                        </div>

                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0' }}>
                                <thead style={{ background: '#f8fafc', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    <tr>
                                        <th style={{ padding: '1.2rem 1.5rem' }}>Student Details</th>
                                        <th style={{ padding: '1.2rem 1.5rem' }}>Ticket Info</th>
                                        <th style={{ padding: '1.2rem 1.5rem' }}>Status</th>
                                        <th style={{ padding: '1.2rem 1.5rem', textAlign: 'right' }}>Management</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredComplaints.map((c) => (
                                        <motion.tr
                                            layout
                                            key={c._id || c.id}
                                            onClick={() => { setSelectedTicket(c); setModalMode('view'); setRemarkText(''); }}
                                            style={{ borderBottom: '1px solid var(--border)', background: 'white', cursor: 'pointer' }}
                                            whileHover={{ background: '#f8fafc' }}
                                        >
                                            <td style={{ padding: '1.5rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: `${statusColors[c.status]}12`, display: 'flex', justifyContent: 'center', alignItems: 'center', color: statusColors[c.status], fontWeight: 700 }}>
                                                        {(c.studentName || c.student || 'U')[0]}
                                                    </div>
                                                    <div>
                                                        <div style={{ fontWeight: 600 }}>{c.studentName || c.student}</div>
                                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ASTU Student</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ padding: '1.5rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <div style={{ fontWeight: 700, fontSize: '1rem' }}>{c.ticketId || c._id || c.id}</div>
                                                    {c.attachments?.length > 0 && <span title="Has Attachments"><Paperclip size={14} color="var(--primary)" /></span>}
                                                </div>
                                                <div style={{ color: 'var(--text-main)', marginTop: '0.2rem' }}>{c.title}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{c.category} • {c.date}</div>
                                            </td>
                                            <td style={{ padding: '1.5rem' }}>
                                                <div style={{
                                                    display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                                                    padding: '0.5rem 1rem', borderRadius: '24px', fontSize: '0.75rem', fontWeight: 700,
                                                    background: `${statusColors[c.status]}12`, color: statusColors[c.status]
                                                }}>
                                                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: statusColors[c.status] }}></div>
                                                    {c.status}
                                                </div>
                                            </td>
                                            <td style={{ padding: '1.5rem', textAlign: 'right' }}>
                                                <div style={{ display: 'flex', gap: '0.8rem', justifyContent: 'flex-end' }}>
                                                    {c.status === 'Open' && (
                                                        <button onClick={(e) => { e.stopPropagation(); updateStatus(c._id || c.id, 'In Progress'); }} className="btn btn-primary" style={{ padding: '0.6rem 1.2rem' }}>
                                                            <RefreshCcw size={16} /> Start
                                                        </button>
                                                    )}
                                                    {c.status === 'In Progress' && (
                                                        <button onClick={(e) => { e.stopPropagation(); updateStatus(c._id || c.id, 'Resolved'); }} className="btn" style={{ background: '#10b981', color: 'white', padding: '0.6rem 1.2rem' }}>
                                                            <CheckCircle size={16} /> Resolve
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedTicket(c);
                                                            setModalMode('edit');
                                                            setRemarkText('');
                                                            setTempStatus(c.status);
                                                        }}
                                                        className="btn glass"
                                                        style={{ padding: '0.6rem' }}
                                                    >
                                                        <MessageSquare size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </motion.tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {filteredComplaints.length === 0 && (
                            <div style={{ padding: '6rem', textAlign: 'center' }}>
                                <Inbox size={64} style={{ opacity: 0.1, marginBottom: '1.5rem' }} />
                                <h3 style={{ color: 'var(--text-muted)' }}>No tickets found</h3>
                                <p style={{ color: 'var(--text-muted)' }}>Everything in this department is currently up to date.</p>
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* Global Image Viewer Modal */}
            <AnimatePresence>
                {viewImage && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                            background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(20px)',
                            zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center',
                            padding: '1rem'
                        }}
                        onClick={() => setViewImage(null)}
                    >
                        <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', display: 'flex', gap: '1rem', zIndex: 10000 }}>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const link = document.createElement('a');
                                    link.href = viewImage;
                                    link.download = `screenshot_${Date.now()}.png`;
                                    document.body.appendChild(link);
                                    link.click();
                                    document.body.removeChild(link);
                                }}
                                style={{
                                    background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white',
                                    width: '44px', height: '44px', borderRadius: '50%', cursor: 'pointer',
                                    display: 'flex', justifyContent: 'center', alignItems: 'center',
                                    transition: 'all 0.2s ease', backdropFilter: 'blur(10px)'
                                }}
                                title="Download Screenshot"
                            >
                                <Download size={20} />
                            </button>
                            <button
                                onClick={() => setViewImage(null)}
                                style={{
                                    background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white',
                                    width: '44px', height: '44px', borderRadius: '50%', cursor: 'pointer',
                                    display: 'flex', justifyContent: 'center', alignItems: 'center',
                                    transition: 'all 0.2s ease', backdropFilter: 'blur(10px)'
                                }}
                                title="Close"
                            >
                                <X size={24} />
                            </button>
                        </div>
                        <motion.img
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            src={viewImage}
                            alt="Full screen preview"
                            style={{
                                maxWidth: '98vw', maxHeight: '95vh',
                                objectFit: 'contain', borderRadius: '8px',
                                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.7)',
                                cursor: 'zoom-out'
                            }}
                            onClick={(e) => e.stopPropagation()}
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Remark Modal */}
            <AnimatePresence>
                {selectedTicket && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                            background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
                            display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000, padding: '1rem'
                        }}
                        onClick={() => setSelectedTicket(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                            className="card" style={{ width: '100%', maxWidth: '600px', cursor: 'default', maxHeight: '90vh', overflowY: 'auto', padding: 0 }}
                            onClick={e => e.stopPropagation()}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, background: 'white', zIndex: 10 }}>
                                <div>
                                    <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', marginBottom: '0.3rem' }}>Ticket {selectedTicket.ticketId || selectedTicket._id || selectedTicket.id}</div>
                                    <h3 style={{ margin: 0 }}>{selectedTicket.title}</h3>
                                </div>
                                <button className="btn" style={{ padding: '4px' }} onClick={() => setSelectedTicket(null)}><X size={24} /></button>
                            </div>

                            <div style={{ padding: '0 1.5rem 1.5rem 1.5rem' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2rem' }}>
                                    <div>
                                        <section style={{ marginBottom: '2rem' }}>
                                            <p style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '0.8rem', textTransform: 'uppercase' }}>Issue Description</p>
                                            <div style={{ color: 'var(--text-main)', lineHeight: 1.6, background: '#f8fafc', padding: '1.2rem', borderRadius: '12px', border: '1px solid var(--border)', fontSize: '1rem' }}>
                                                {selectedTicket.description}
                                            </div>
                                        </section>

                                        {selectedTicket.attachments?.length > 0 && (
                                            <section style={{ marginBottom: '2rem' }}>
                                                <p style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '0.8rem', textTransform: 'uppercase' }}>Attachments & Screenshots</p>
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem' }}>
                                                    {selectedTicket.attachments.map((file, idx) => (
                                                        <div key={idx} style={{
                                                            padding: '0.8rem', background: 'white', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden'
                                                        }}>
                                                            {file.fileType === 'image' ? (
                                                                <div style={{ width: '100%', height: '120px', background: '#f1f5f9', borderRadius: '12px', marginBottom: '0.8rem', overflow: 'hidden', position: 'relative' }}>
                                                                    <img
                                                                        src={file.url?.startsWith('data:') ? file.url : (file.url?.startsWith('http') ? file.url : `http://localhost:5000${file.url}`)}
                                                                        alt="Screenshot"
                                                                        style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }}
                                                                        onClick={() => openFile(file.url)}
                                                                    />
                                                                    <div style={{ position: 'absolute', top: '8px', right: '8px', padding: '4px', background: 'rgba(255,255,255,0.9)', borderRadius: '6px' }}>
                                                                        <Layout size={14} color="var(--primary)" />
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div style={{ width: '100%', height: '120px', background: '#f8fafc', borderRadius: '12px', marginBottom: '0.8rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }} onClick={() => openFile(file.url)}>
                                                                    <FileText size={32} style={{ opacity: 0.2 }} />
                                                                    <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>DOCUMENT</span>
                                                                </div>
                                                            )}
                                                            <div style={{ fontSize: '0.75rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '0.4rem' }}>{file.name}</div>
                                                            <button className="btn glass w-full" style={{ padding: '6px', fontSize: '0.7rem' }} onClick={() => openFile(file.url)}>View Screenshot</button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </section>
                                        )}

                                        <section>
                                            <p style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '0.8rem', textTransform: 'uppercase' }}>Internal History</p>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                                {selectedTicket.remarks?.length > 0 ? selectedTicket.remarks.map((r, i) => (
                                                    <div key={i} style={{ padding: '1rem', background: '#eff6ff', borderLeft: '3px solid var(--primary)', borderRadius: '0 12px 12px 0', fontSize: '0.9rem', position: 'relative' }}>
                                                        {editingRemarkId === r._id ? (
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                                <textarea
                                                                    className="input"
                                                                    value={editRemarkText}
                                                                    onChange={(e) => setEditRemarkText(e.target.value)}
                                                                    style={{ background: 'white', fontSize: '0.85rem' }}
                                                                />
                                                                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                                                    <button onClick={() => setEditingRemarkId(null)} className="btn glass" style={{ padding: '4px 8px', fontSize: '0.7rem' }}>Cancel</button>
                                                                    <button onClick={() => handleUpdateRemark(r._id)} className="btn btn-primary" style={{ padding: '4px 12px', fontSize: '0.7rem' }}>Save</button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <p style={{ margin: 0, fontWeight: 600 }}>{r.text}</p>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                                                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                                                        {r.addedAt ? new Date(r.addedAt).toLocaleString() : 'Just now'} • {r.addedByName || 'Staff'}
                                                                    </span>
                                                                    {r.addedBy === user.id && (
                                                                        <button
                                                                            onClick={() => { setEditingRemarkId(r._id); setEditRemarkText(r.text); }}
                                                                            style={{ border: 'none', background: 'transparent', color: 'var(--primary)', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}
                                                                        >
                                                                            Edit
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                )) : (
                                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No internal remarks added yet.</p>
                                                )}
                                            </div>
                                        </section>
                                    </div>

                                    <div>
                                        {modalMode === 'edit' ? (
                                            <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--border)', position: 'sticky', top: '0' }}>
                                                <p style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '1.2rem', textTransform: 'uppercase' }}>Update Ticket</p>
                                                <form onSubmit={handleCombinedUpdate}>
                                                    <div style={{ marginBottom: '1.2rem' }}>
                                                        <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Change Status</label>
                                                        <select
                                                            className="input"
                                                            value={tempStatus}
                                                            onChange={(e) => setTempStatus(e.target.value)}
                                                            style={{ background: 'white', marginBottom: '1rem', width: '100%' }}
                                                        >
                                                            <option value="Open">Open</option>
                                                            <option value="In Progress">In Progress</option>
                                                            <option value="Resolved">Resolved</option>
                                                        </select>

                                                        <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Add Remark (Optional)</label>
                                                        <textarea
                                                            className="input"
                                                            placeholder="Add progress note or resolution steps..."
                                                            rows="5"
                                                            style={{ height: 'auto', background: 'white' }}
                                                            value={remarkText}
                                                            onChange={(e) => setRemarkText(e.target.value)}
                                                        />
                                                    </div>
                                                    <button type="submit" disabled={remarkLoading} className="btn btn-primary w-full" style={{ justifyContent: 'center', padding: '0.8rem' }}>
                                                        <Save size={18} /> {remarkLoading ? 'Saving...' : 'Save Changes'}
                                                    </button>
                                                </form>

                                                <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                                                    {selectedTicket.status === 'Open' && (
                                                        <button onClick={() => { setTempStatus('In Progress'); }} className="btn glass w-full" style={{ justifyContent: 'center', fontSize: '0.8rem' }}>
                                                            Quick set: In Progress
                                                        </button>
                                                    )}
                                                </div>
                                                <button
                                                    onClick={() => setModalMode('view')}
                                                    className="btn glass w-full"
                                                    style={{ marginTop: '1rem', justifyContent: 'center', fontSize: '0.8rem' }}
                                                >
                                                    Back to View
                                                </button>
                                            </div>
                                        ) : (
                                            <div style={{ background: 'white', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--border)', position: 'sticky', top: '0' }}>
                                                <div style={{ marginBottom: '2rem' }}>
                                                    <p style={{ margin: '0 0 0.4rem 0', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Responsible Department</p>
                                                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '6px 12px', background: 'rgba(37, 99, 235, 0.1)', color: 'var(--primary)', borderRadius: '8px', fontWeight: 700, fontSize: '0.9rem' }}>
                                                        {selectedTicket.department}
                                                    </div>
                                                </div>

                                                <div style={{ marginBottom: '1.5rem' }}>
                                                    <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>STUDENT REQUESTER</p>
                                                    <p style={{ margin: 0, fontWeight: 700, fontSize: '1.1rem' }}>{selectedTicket.studentName || selectedTicket.student}</p>
                                                </div>

                                                <div style={{ marginBottom: '1.5rem' }}>
                                                    <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>SUBMITTED ON</p>
                                                    <p style={{ margin: 0, fontWeight: 700 }}>{selectedTicket.date}</p>
                                                </div>

                                                <div style={{ marginBottom: '2rem' }}>
                                                    <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>CURRENT STATUS</p>
                                                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: statusColors[selectedTicket.status], fontWeight: 800, fontSize: '1rem' }}>
                                                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: statusColors[selectedTicket.status] }}></div>
                                                        {selectedTicket.status}
                                                    </div>
                                                </div>

                                                <button
                                                    onClick={() => setModalMode('edit')}
                                                    className="btn btn-primary w-full"
                                                    style={{ justifyContent: 'center', padding: '0.8rem', marginBottom: '1rem' }}
                                                >
                                                    <MessageSquare size={18} /> Add Remark
                                                </button>

                                                <button
                                                    onClick={() => setSelectedTicket(null)}
                                                    className="btn glass w-full"
                                                    style={{ justifyContent: 'center' }}
                                                >
                                                    <X size={18} /> Back to Queue
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <style>{`
                @media (max-width: 1024px) {
                    main { padding: 1.5rem !important; }
                    header h1 { font-size: 2.2rem !important; }
                    .dashboard-sidebar { display: none !important; }
                }
            `}</style>
        </div>
    );
};

const StaffSettingsView = ({ user, setUser }) => {
    const [email, setEmail] = useState(user?.email || '');
    const [uploading, setUploading] = useState(false);
    const [updateMsg, setUpdateMsg] = useState('');
    const [pwdForm, setPwdForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [pwdMsg, setPwdMsg] = useState('');
    const [pwdLoading, setPwdLoading] = useState(false);
    const profileInputRef = useRef(null);

    const handleProfileUpload = async (file) => {
        const formData = new FormData();
        formData.append('profileImage', file);
        setUploading(true);
        try {
            const res = await apiUpdateProfile(formData);
            if (res.success) {
                setUser(res.user);
                localStorage.setItem('astu_user', JSON.stringify(res.user));
                setUpdateMsg('Profile photo updated!');
            }
        } catch (err) { setUpdateMsg('Upload failed'); }
        setUploading(false);
    };

    const handleDeletePhoto = async () => {
        if (!window.confirm('Are you sure you want to delete your profile photo?')) return;
        setUploading(true);
        try {
            const res = await apiDeleteProfilePicture();
            if (res.success) {
                setUser(res.user);
                localStorage.setItem('astu_user', JSON.stringify(res.user));
                setUpdateMsg('Profile photo deleted!');
            }
        } catch (err) { setUpdateMsg('Deletion failed'); }
        setUploading(false);
    };

    const handleInfoUpdate = async (e) => {
        e.preventDefault();
        setUploading(true);
        setUpdateMsg('');
        try {
            const res = await apiUpdateProfile({ email });
            if (res.success) {
                setUser(res.user);
                localStorage.setItem('astu_user', JSON.stringify(res.user));
                setUpdateMsg('Profile updated successfully!');
            }
        } catch (err) { setUpdateMsg('Update failed'); }
        setUploading(false);
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        if (pwdForm.newPassword !== pwdForm.confirmPassword) return setPwdMsg('New passwords do not match');
        setPwdLoading(true);
        setPwdMsg('');
        try {
            const res = await apiChangePassword({ currentPassword: pwdForm.currentPassword, newPassword: pwdForm.newPassword });
            if (res.success) {
                setPwdMsg('Password changed successfully!');
                setPwdForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
            } else {
                setPwdMsg(res.message || 'Failed to change password');
            }
        } catch (err) { setPwdMsg('Error changing password'); }
        setPwdLoading(false);
    };

    const profilePhotoUrl = user?.profilePicture
        ? (user.profilePicture.startsWith('data:') ? user.profilePicture : `http://localhost:5000${user.profilePicture}`)
        : null;

    return (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <div className="card" style={{ maxWidth: '650px', margin: '0 auto', padding: '3rem' }}>
                <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                    <div style={{ position: 'relative', width: '130px', height: '130px', margin: '0 auto 1.5rem auto' }}>
                        <div style={{ width: '100%', height: '100%', borderRadius: '40px', background: '#f8fafc', overflow: 'hidden', border: '4px solid white', boxShadow: '0 12px 24px -6px rgba(0,0,0,0.12)' }}>
                            {profilePhotoUrl ? <img src={profilePhotoUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--primary)', background: '#eff6ff' }}><UserIcon size={56} /></div>}
                        </div>
                        <button onClick={() => profileInputRef.current?.click()} className="btn-primary" style={{ position: 'absolute', bottom: '0', right: '0', width: '44px', height: '44px', borderRadius: '15px', border: '4px solid white', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', boxShadow: '0 8px 12px -3px rgba(0,0,0,0.15)' }}><Camera size={20} /></button>
                        {user?.profilePicture && (
                            <button
                                onClick={handleDeletePhoto}
                                disabled={uploading}
                                className="btn"
                                title="Delete Photo"
                                style={{
                                    position: 'absolute', bottom: '0', left: '-10px',
                                    width: '40px', height: '40px', borderRadius: '12px',
                                    border: '4px solid white', display: 'flex', justifyContent: 'center',
                                    alignItems: 'center', cursor: 'pointer', background: 'var(--danger)',
                                    color: 'white', boxShadow: '0 8px 12px -3px rgba(0,0,0,0.15)'
                                }}
                            >
                                <Trash2 size={18} />
                            </button>
                        )}
                        <input type="file" ref={profileInputRef} style={{ display: 'none' }} accept="image/*" onChange={(e) => e.target.files[0] && handleProfileUpload(e.target.files[0])} />
                    </div>
                    <h2 style={{ fontSize: '1.75rem', fontWeight: 900, textTransform: 'capitalize' }}>{user?.name}</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>Staff Account Management</p>
                </div>

                <form onSubmit={handleInfoUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                        <div style={{
                            padding: '1.5rem', background: 'white', borderRadius: '16px',
                            border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
                            display: 'flex', flexDirection: 'column', gap: '0.5rem'
                        }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Full Name</label>
                            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', textTransform: 'capitalize' }}>{user?.name || 'Staff Member'}</div>
                        </div>
                        <div style={{
                            padding: '1.5rem', background: 'white', borderRadius: '16px',
                            border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
                            display: 'flex', flexDirection: 'column', gap: '0.5rem'
                        }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Assigned Department</label>
                            <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase' }}>
                                {user?.departments?.length > 0 ? user.departments.join(' • ') : (user?.department || 'Not Assigned')}
                            </div>
                        </div>
                    </div>
                    <div>
                        <label style={{ display: 'block', fontWeight: 700, marginBottom: '0.6rem', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Email Address</label>
                        <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled />
                    </div>

                    {updateMsg && <div style={{ padding: '1rem', borderRadius: '12px', textAlign: 'center', fontWeight: 600, background: updateMsg.includes('success') ? '#f0fdf4' : '#fef2f2', color: updateMsg.includes('success') ? '#15803d' : '#b91c1c' }}>{updateMsg}</div>}
                </form>

                {/* Change Password Section */}
                <form onSubmit={handleChangePassword} style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem', borderTop: '1px solid var(--border)', paddingTop: '2rem' }}>
                    <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}>Change Password</h4>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>If you were assigned a default password, update it here.</p>
                    <input className="input" type="password" placeholder="Current Password" value={pwdForm.currentPassword} onChange={e => setPwdForm(p => ({ ...p, currentPassword: e.target.value }))} required />
                    <input className="input" type="password" placeholder="New Password (min 6 chars)" value={pwdForm.newPassword} onChange={e => setPwdForm(p => ({ ...p, newPassword: e.target.value }))} required />
                    <input className="input" type="password" placeholder="Confirm New Password" value={pwdForm.confirmPassword} onChange={e => setPwdForm(p => ({ ...p, confirmPassword: e.target.value }))} required />
                    {pwdMsg && <div style={{ padding: '0.8rem', borderRadius: '10px', textAlign: 'center', fontWeight: 600, background: pwdMsg.includes('success') ? '#f0fdf4' : '#fef2f2', color: pwdMsg.includes('success') ? '#15803d' : '#b91c1c' }}>{pwdMsg}</div>}
                    <motion.button type="submit" disabled={pwdLoading} className="btn btn-primary" style={{ justifyContent: 'center', padding: '0.9rem' }} whileHover={{ y: -3, scale: 1.02 }} whileTap={{ scale: 0.97 }} transition={{ type: 'spring', stiffness: 300 }}>
                        {pwdLoading ? 'Changing...' : '🔒 Change Password'}
                    </motion.button>
                </form>
            </div>
        </motion.div>
    );
};

export default StaffDashboard;
