import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Routes, Route, useNavigate, useLocation, Link } from 'react-router-dom';
import {
    FileText, CheckCircle, Clock, AlertCircle, Plus,
    History, User, Settings, Send, Save, Image as ImageIcon,
    Paperclip, Search, Filter, ChevronRight, MessageCircle,
    Bell, LayoutDashboard, Share2, MoreVertical, X, List, ClipboardList,
    LogOut, Camera, Upload, Trash2, Download
} from 'lucide-react';
import { apiCreateTicket, apiGetMyTickets, apiGetCategories, apiUpdateProfile, apiGetAnnouncements, apiDeleteProfilePicture, apiChangePassword } from '../api';

const StudentDashboard = ({ user, setUser, onLogout }) => {
    const navigate = useNavigate();
    const location = useLocation();

    // Helper to capitalize strings
    const capitalize = (str) => {
        if (!str) return 'User';
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    };

    // Derived state for views
    const pathParts = location.pathname.split('/');
    const activeSection = pathParts[pathParts.length - 1]; // 'submit', 'history', or 'student' (root)
    const currentView = activeSection === 'student' ? 'summary' : activeSection;

    const [selectedTicket, setSelectedTicket] = useState(null);
    const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
    const [complaints, setComplaints] = useState([]);
    const [announcements, setAnnouncements] = useState([]);
    const [categories, setCategories] = useState([]);
    const [submitError, setSubmitError] = useState('');
    const [submitLoading, setSubmitLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        category: location.state?.category || '',
        priority: 'Normal',
        files: []
    });
    const [viewImage, setViewImage] = useState(null);
    const fileInputRef = useRef(null);

    // Stats calculated from live data
    const stats = [
        { label: 'Total Tickets', value: complaints.length, icon: <ClipboardList />, color: '#2563eb' },
        { label: 'Active', value: complaints.filter(c => c.status !== 'Resolved').length, icon: <Clock />, color: '#f59e0b' },
        { label: 'Resolved', value: complaints.filter(c => c.status === 'Resolved').length, icon: <CheckCircle />, color: '#10b981' }
    ];

    // Load real tickets and categories on mount
    useEffect(() => {
        apiGetMyTickets().then(res => {
            if (res.success) {
                setComplaints(res.tickets);
                if (location.state?.openTicketId) {
                    const ticketToOpen = res.tickets.find(t => (t._id || t.id) === location.state.openTicketId);
                    if (ticketToOpen) {
                        setSelectedTicket(ticketToOpen);
                        window.history.replaceState({}, document.title, location.pathname);
                    }
                }
            }
        });
        apiGetAnnouncements().then(res => { if (res.success) setAnnouncements(res.announcements); });
        apiGetCategories().then(res => {
            if (res.success && Array.isArray(res.categories)) {
                const names = res.categories.map(c => typeof c === 'string' ? c : (c.name || ''));
                setCategories(names);
                // If we navigated with a category, use it; otherwise use the first one if current category isn't in list
                if (location.state?.category) {
                    setFormData(prev => ({ ...prev, category: location.state.category }));
                } else if (!names.includes(formData.category) && names.length > 0) {
                    setFormData(prev => ({ ...prev, category: names[0] }));
                }
            }
        });
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

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        // Map actual File objects to our UI state for previews
        const newFiles = files.map(file => ({
            name: file.name,
            fileType: file.type.startsWith('image/') ? 'image' : 'pdf',
            preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
            originalFile: file // Keep reference for submission
        }));
        setFormData(prev => ({ ...prev, files: [...prev.files, ...newFiles] }));
        // Reset input so same file can be selected again if removed
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const removeFile = (idx) => {
        setFormData(prev => {
            const fileToRemove = prev.files[idx];
            if (fileToRemove.preview) URL.revokeObjectURL(fileToRemove.preview);
            return { ...prev, files: prev.files.filter((_, i) => i !== idx) };
        });
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        setSubmitLoading(true);
        setSubmitError('');
        try {
            const formDataToSend = new FormData();
            formDataToSend.append('title', formData.title);
            formDataToSend.append('description', formData.description);
            formDataToSend.append('category', formData.category);
            formDataToSend.append('priority', formData.priority);

            // Collect actual files from state
            if (formData.files && formData.files.length > 0) {
                formData.files.forEach(f => {
                    if (f.originalFile) {
                        formDataToSend.append('files', f.originalFile);
                    }
                });
            }

            const res = await apiCreateTicket(formDataToSend);
            if (res.success) {
                setComplaints([res.ticket, ...complaints]);
                navigate('/student/history');
                // Reset form
                setFormData({ title: '', description: '', category: categories[0] || '', files: [] });
                if (fileInputRef.current) fileInputRef.current.value = '';
            } else {
                setSubmitError(res.message || 'Failed to submit');
            }
        } catch (err) {
            setSubmitError('Server error. Please try again.');
        }
        setSubmitLoading(false);
    };

    const renderSummary = () => (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
                {stats.map((s, i) => (
                    <motion.div whileHover={{ y: -5 }} key={i} className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.2rem', padding: '1.5rem', border: '1px solid var(--border)' }}>
                        <div style={{ padding: '12px', background: `${s.color}15`, color: s.color, borderRadius: '12px' }}>{s.icon}</div>
                        <div>
                            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 500 }}>{s.label}</p>
                            <h2 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 800 }}>{s.value}</h2>
                        </div>
                    </motion.div>
                ))}
            </div>

            <div className="student-content-grid responsive-stack-grid" style={{ gridTemplateColumns: '1.5fr 1fr' }}>
                <div className="card" style={{ padding: '2rem' }}>
                    <h3 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>Area of Concern</h3>
                    <div className="responsive-stack-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1.2rem' }}>
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => navigate('/student/submit', { state: { category: cat } })}
                                className="btn glass"
                                style={{ justifyContent: 'space-between', padding: '1.5rem', height: 'auto', border: '1px solid var(--border)', borderRadius: '16px', textAlign: 'left' }}
                            >
                                <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{cat}</span>
                                <Plus size={18} />
                            </button>
                        ))}
                    </div>
                </div>

                <div className="card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                        <h3 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>Campus Support</h3>
                        <div style={{ padding: '1.2rem', background: '#eff6ff', borderRadius: '16px', border: '1px solid #bfdbfe', marginBottom: '1.5rem' }}>
                            <p style={{ margin: 0, fontSize: '0.9rem', color: '#1e40af', lineHeight: 1.5 }}>
                                <strong>Smart Tip:</strong> Attach photos of the issue to help our maintenance team identify the problem faster.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );

    const renderAnnouncements = () => (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div style={{ marginBottom: '2.5rem' }}>
                <p style={{ color: 'var(--text-muted)' }}>Latest updates from the administration</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {announcements.length > 0 ? announcements.map((ann, idx) => (
                    <motion.div
                        key={ann._id || idx}
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
                                    <User size={12} />
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
            </div>
        </motion.div>
    );

    const renderSubmit = () => (
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }}>
            <div className="card" style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
                <h2 style={{ marginBottom: '2rem', fontSize: '1.8rem' }}>Create New Compliant</h2>
                <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.8rem' }}>
                    <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                        <div style={{ gridColumn: 'span 2' }}>
                            <label style={{ display: 'block', fontWeight: 700, marginBottom: '0.6rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Issue Title</label>
                            <input
                                className="input"
                                placeholder="E.g., Lamp replacement in Room 402"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                required
                                style={{ padding: '1rem', borderRadius: '12px' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontWeight: 700, marginBottom: '0.6rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Assigned Priority</label>
                            <select
                                className="input"
                                value={formData.priority}
                                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                                style={{ padding: '1rem', borderRadius: '12px' }}
                            >
                                <option value="Normal">Normal</option>
                                <option value="Urgent">Urgent</option>
                                <option value="Classical">Classical</option>
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontWeight: 700, marginBottom: '0.6rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Department / Category</label>
                            <select
                                className="input"
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                required
                                style={{ padding: '1rem', borderRadius: '12px' }}
                            >
                                <option value="" disabled>Select Department</option>
                                {categories.map((cat, i) => (
                                    <option key={i} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontWeight: 700, marginBottom: '0.6rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Description</label>
                        <textarea
                            className="input"
                            rows="6"
                            style={{ height: 'auto', padding: '1rem', borderRadius: '12px' }}
                            placeholder="Provide details about the issue..."
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            required
                        ></textarea>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <motion.div
                            whileHover={{ scale: 1.01, y: -2, border: '2px dashed var(--primary)', background: '#eff6ff' }}
                            whileTap={{ scale: 0.99 }}
                            onClick={() => fileInputRef.current?.click()}
                            style={{
                                padding: '2.5rem 1rem', border: '2px dashed #cbd5e1', borderRadius: '24px',
                                textAlign: 'center', background: '#f8fafc', cursor: 'pointer',
                                transition: 'all 0.3s ease'
                            }}
                        >
                            <input
                                type="file"
                                ref={fileInputRef}
                                style={{ display: 'none' }}
                                multiple
                                accept="image/*,.pdf"
                                onChange={handleFileChange}
                            />
                            <div style={{
                                width: '64px', height: '64px', background: 'white', borderRadius: '20px',
                                display: 'flex', justifyContent: 'center', alignItems: 'center',
                                margin: '0 auto 1.2rem auto', boxShadow: '0 8px 15px -3px rgba(0,0,0,0.08)',
                                color: 'var(--primary)'
                            }}>
                                <Upload size={28} />
                            </div>
                            <p style={{ margin: 0, fontWeight: 700, color: 'var(--text-main)', fontSize: '1rem' }}>Upload Evidence</p>
                            <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Images or PDF documents (Max 5MB)</p>
                        </motion.div>

                        <AnimatePresence>
                            {formData.files.length > 0 && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    style={{ overflow: 'hidden' }}
                                >
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '1rem', marginTop: '0.5rem' }}>
                                        {formData.files.map((file, idx) => (
                                            <motion.div
                                                initial={{ scale: 0.8, opacity: 0 }}
                                                animate={{ scale: 1, opacity: 1 }}
                                                exit={{ scale: 0.8, opacity: 0 }}
                                                key={idx}
                                                style={{
                                                    position: 'relative', padding: '0.8rem', background: 'white',
                                                    border: '1px solid var(--border)', borderRadius: '16px',
                                                    display: 'flex', flexDirection: 'column', gap: '0.6rem',
                                                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
                                                }}
                                            >
                                                {file.fileType === 'image' ? (
                                                    <div style={{ width: '100%', height: '80px', borderRadius: '10px', overflow: 'hidden', background: '#f1f5f9' }}>
                                                        <img src={file.preview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                    </div>
                                                ) : (
                                                    <div style={{ width: '100%', height: '80px', borderRadius: '10px', background: '#f8fafc', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--text-muted)' }}>
                                                        <FileText size={32} opacity={0.3} />
                                                    </div>
                                                )}
                                                <div style={{ fontSize: '0.7rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: '1.5rem' }}>
                                                    {file.name}
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                                                    style={{
                                                        position: 'absolute', top: '4px', right: '4px', background: 'rgba(239, 68, 68, 0.1)',
                                                        color: '#ef4444', border: 'none', width: '24px', height: '24px',
                                                        borderRadius: '8px', cursor: 'pointer', display: 'flex',
                                                        justifyContent: 'center', alignItems: 'center'
                                                    }}
                                                >
                                                    <X size={14} />
                                                </button>
                                            </motion.div>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {submitError && <div style={{ color: '#ef4444', fontSize: '0.85rem' }}>{submitError}</div>}

                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                        <button type="submit" disabled={submitLoading} className="btn btn-primary" style={{ padding: '1rem 3rem', borderRadius: '14px' }}>
                            {submitLoading ? 'Sending...' : <><Send size={18} /> Send Compliant</>}
                        </button>
                    </div>
                </form>
            </div>
        </motion.div>
    );

    const renderHistory = () => (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
            <div className="card" style={{ padding: '2rem' }}>
                <h3 style={{ marginBottom: '1.5rem' }}>My Compliant History</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {complaints.length === 0 ? (
                        <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>No tickets found.</p>
                    ) : (
                        complaints.map(ticket => (
                            <motion.div
                                layout
                                whileHover={{ x: 8 }}
                                key={ticket._id || ticket.id}
                                onClick={() => setSelectedTicket(ticket)}
                                style={{
                                    padding: '1.2rem', border: '1px solid var(--border)', borderRadius: '16px',
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    cursor: 'pointer', background: 'white', flexWrap: 'wrap', gap: '1rem'
                                }}
                            >
                                <div style={{ display: 'flex', gap: '1.2rem', alignItems: 'center' }}>
                                    <div style={{
                                        width: '48px', height: '48px', borderRadius: '12px',
                                        background: ticket.status === 'Resolved' ? '#10b98112' : '#2563eb12',
                                        color: ticket.status === 'Resolved' ? '#10b981' : '#2563eb',
                                        display: 'flex', justifyContent: 'center', alignItems: 'center'
                                    }}>
                                        <FileText size={20} />
                                    </div>
                                    <div>
                                        <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>{ticket.title}</h4>
                                        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>{ticket.ticketId} • {ticket.department || ticket.category}</p>
                                    </div>
                                </div>
                                <div style={{
                                    padding: '4px 12px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 800,
                                    background: ticket.status === 'Resolved' ? '#dcfce7' : '#eff6ff',
                                    color: ticket.status === 'Resolved' ? '#15803d' : '#1e40af',
                                    textTransform: 'uppercase'
                                }}>
                                    {ticket.status}
                                </div>
                            </motion.div>
                        ))
                    )}
                </div>
            </div>

            {/* Modal placeholder */}
            <AnimatePresence>
                {selectedTicket && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', zIndex: 2000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem' }}
                        onClick={() => setSelectedTicket(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
                            className="card" style={{ width: '100%', maxWidth: '600px', padding: '1.5rem', maxHeight: '90vh', overflowY: 'auto' }}
                            onClick={e => e.stopPropagation()}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                                <h3>Ticket Details</h3>
                                <button className="btn glass" onClick={() => setSelectedTicket(null)}><X size={20} /></button>
                            </div>
                            <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>{selectedTicket.title}</h2>
                            <p style={{ color: 'var(--text-muted)' }}>{selectedTicket.description}</p>
                            <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#f8fafc', borderRadius: '12px' }}>
                                <p style={{ margin: 0 }}><strong>Status:</strong> {selectedTicket.status}</p>
                                {selectedTicket.remarks && selectedTicket.remarks.length > 0 && (
                                    <div style={{ marginTop: '1.5rem' }}>
                                        <p style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '0.8rem', textTransform: 'uppercase' }}>Staff Feedback</p>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                                            {selectedTicket.remarks.map((r, i) => (
                                                <div key={i} style={{ padding: '1rem', background: '#eff6ff', borderLeft: '3px solid var(--primary)', borderRadius: '0 12px 12px 0', fontSize: '0.9rem' }}>
                                                    <p style={{ margin: 0, fontWeight: 600 }}>{typeof r === 'string' ? r : r.text}</p>
                                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                                                        {r.addedAt ? new Date(r.addedAt).toLocaleDateString() : 'Just now'} • {r.addedByName || 'Staff'}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {selectedTicket.attachments && selectedTicket.attachments.length > 0 && (
                                    <div style={{ marginTop: '1.5rem' }}>
                                        <p style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '0.8rem', textTransform: 'uppercase' }}>Attachments</p>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '0.8rem' }}>
                                            {selectedTicket.attachments.map((att, i) => (
                                                <div key={i} style={{ padding: '0.6rem', border: '1px solid var(--border)', borderRadius: '16px', background: 'white', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                                    {att.fileType === 'image' ? (
                                                        <>
                                                            <img
                                                                src={att.url.startsWith('data:') ? att.url : (att.url.startsWith('http') ? att.url : `http://localhost:5000${att.url}`)}
                                                                alt="Attachment"
                                                                style={{ width: '100%', height: '80px', objectFit: 'cover', borderRadius: '10px', cursor: 'pointer' }}
                                                                onClick={() => openFile(att.url)}
                                                            />
                                                            <button onClick={() => openFile(att.url)} className="btn glass" style={{ padding: '6px', fontSize: '0.75rem', width: '100%', justifyContent: 'center' }}>
                                                                View Screenshot
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <div
                                                            style={{ width: '100%', height: '80px', background: '#f1f5f9', display: 'flex', justifyContent: 'center', alignItems: 'center', borderRadius: '10px', cursor: 'pointer' }}
                                                            onClick={() => openFile(att.url)}
                                                        >
                                                            <FileText size={24} style={{ opacity: 0.3 }} />
                                                        </div>
                                                    )}
                                                    <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{att.name}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );

    const renderAnnouncementModal = () => (
        <AnimatePresence>
            {selectedAnnouncement && (
                <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', zIndex: 2000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem' }}
                    onClick={() => setSelectedAnnouncement(null)}
                >
                    <motion.div
                        initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                        className="card" style={{ width: '100%', maxWidth: '700px', padding: '1.5rem', maxHeight: '90vh', overflowY: 'auto' }}
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
                            <h2 className="adaptive-header" style={{ fontWeight: 900, marginTop: '1rem', letterSpacing: '-1px' }}>{selectedAnnouncement.title}</h2>
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
    );

    const getSidebarLinkStyle = (isActive) => ({
        background: isActive ? '#2563eb12' : 'transparent',
        color: isActive ? 'var(--primary)' : 'var(--text-muted)',
        fontWeight: isActive ? 800 : 500,
        display: 'flex',
        alignItems: 'center',
        gap: '0.8rem',
        padding: '0.8rem 1rem',
        borderRadius: '10px',
        textDecoration: 'none',
        fontSize: '0.85rem'
    });

    return (
        <div style={{ display: 'flex', minHeight: 'calc(100vh - 64px)', background: '#f8fafc' }}>
            <aside style={{
                width: '260px', background: 'white', borderRight: '1px solid #f1f5f9',
                padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column',
                position: 'sticky', top: '64px', height: 'calc(100vh - 64px)'
            }} className="desk-only">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', flex: 1 }}>
                    <Link to="/student" style={getSidebarLinkStyle(currentView === 'summary')}><LayoutDashboard size={18} /> Home</Link>
                    <Link to="/student/submit" style={getSidebarLinkStyle(currentView === 'submit')}><Plus size={18} /> New compliant</Link>
                    <Link to="/student/history" style={getSidebarLinkStyle(currentView === 'history')}><History size={18} /> History</Link>
                    <Link to="/student/announcements" style={getSidebarLinkStyle(currentView === 'announcements')}><Bell size={18} /> Announcements</Link>
                    <Link to="/student/settings" style={getSidebarLinkStyle(currentView === 'settings')}><Settings size={18} /> Settings</Link>
                </div>

                <button onClick={onLogout} className="btn" style={{ background: '#fecaca', color: '#b91c1c', marginTop: 'auto', width: '100%', justifyContent: 'center', padding: '0.6rem', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                    <LogOut size={16} /> Logout
                </button>
            </aside>

            <main className="responsive-container" style={{ flex: 1 }}>
                <header style={{ marginBottom: '3rem' }}>
                    <h1 className="adaptive-header" style={{ color: '#1e293b' }}>
                        {currentView === 'summary' ? `Welcome, ${capitalize(user?.name?.split(' ')[0])}!` : currentView.charAt(0).toUpperCase() + currentView.slice(1)}
                    </h1>
                </header>

                <Routes>
                    <Route index element={renderSummary()} />
                    <Route path="submit" element={renderSubmit()} />
                    <Route path="history" element={renderHistory()} />
                    <Route path="announcements" element={renderAnnouncements()} />
                    <Route path="settings" element={<StudentSettingsView user={user} setUser={setUser} />} />
                </Routes>
                {renderAnnouncementModal()}

                {/* Global Image Viewer Modal */}
                <AnimatePresence>
                    {viewImage && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
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
            </main>
        </div >
    );
};

const StudentSettingsView = ({ user, setUser }) => {
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
            } else {
                setUpdateMsg(res.message || 'Update failed');
            }
        } catch (err) {
            setUpdateMsg('Upload failed');
        }
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
            } else {
                setUpdateMsg(res.message || 'Deletion failed');
            }
        } catch (err) {
            setUpdateMsg('Deletion failed');
        }
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
            } else {
                setUpdateMsg(res.message || 'Update failed');
            }
        } catch (err) {
            setUpdateMsg('Update failed');
        }
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
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
            <div className="card" style={{ maxWidth: '650px', margin: '0 auto', padding: '2rem' }}>
                <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                    <div style={{ position: 'relative', width: '130px', height: '130px', margin: '0 auto 1.5rem auto' }}>
                        <div style={{
                            width: '100%', height: '100%', borderRadius: '40px', background: '#f8fafc',
                            overflow: 'hidden', border: '4px solid white', boxShadow: '0 12px 24px -6px rgba(0,0,0,0.12)'
                        }}>
                            {profilePhotoUrl ? (
                                <img src={profilePhotoUrl} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                <div style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--primary)', background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)' }}>
                                    <User size={56} />
                                </div>
                            )}
                        </div>
                        <button
                            onClick={() => profileInputRef.current?.click()}
                            disabled={uploading}
                            className="btn-primary"
                            style={{
                                position: 'absolute', bottom: '0', right: '0',
                                width: '44px', height: '44px', borderRadius: '15px',
                                border: '4px solid white', display: 'flex', justifyContent: 'center',
                                alignItems: 'center', cursor: 'pointer', boxShadow: '0 8px 12px -3px rgba(0,0,0,0.15)'
                            }}
                        >
                            <Camera size={20} />
                        </button>
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
                    <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--text-main)', letterSpacing: '-0.5px', textTransform: 'capitalize' }}>{user?.name || 'Student Name'}</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', fontWeight: 500 }}>Personal Security & Profile</p>
                </div>

                <form onSubmit={handleInfoUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                        <div>
                            <label style={{ display: 'block', fontWeight: 700, marginBottom: '0.6rem', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Full Name</label>
                            <div className="input" style={{ padding: '1rem', borderRadius: '12px', background: '#f1f5f9', border: '1px solid #e2e8f0', fontWeight: 600, fontSize: '1rem', textTransform: 'capitalize', color: '#64748b' }}>
                                {user?.name || 'Student Name'}
                            </div>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontWeight: 700, marginBottom: '0.6rem', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Account Role</label>
                            <div className="input" style={{ padding: '1rem', borderRadius: '12px', background: '#f1f5f9', border: '1px solid #e2e8f0', fontWeight: 600, fontSize: '1rem', textTransform: 'uppercase', color: 'var(--primary)', letterSpacing: '0.5px' }}>
                                {user?.role || 'STUDENT'}
                            </div>
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontWeight: 700, marginBottom: '0.6rem', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Email Address</label>
                        <input
                            className="input"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            style={{ padding: '1rem', borderRadius: '12px', fontSize: '1rem', fontWeight: 500 }}
                            placeholder="name@astu.edu.et"
                            disabled
                        />
                    </div>

                    {updateMsg && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            style={{
                                padding: '1rem', borderRadius: '12px',
                                background: updateMsg.toLowerCase().includes('success') || updateMsg.toLowerCase().includes('updated') ? '#f0fdf4' : '#fef2f2',
                                color: updateMsg.toLowerCase().includes('success') || updateMsg.toLowerCase().includes('updated') ? '#15803d' : '#b91c1c',
                                fontSize: '0.9rem', fontWeight: 600, textAlign: 'center',
                                border: `1px solid ${updateMsg.toLowerCase().includes('success') || updateMsg.toLowerCase().includes('updated') ? '#bcf0da' : '#fecaca'}`
                            }}
                        >
                            {updateMsg}
                        </motion.div>
                    )}
                </form>

                {/* Change Password Section */}
                <form onSubmit={handleChangePassword} style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem', borderTop: '1px solid var(--border)', paddingTop: '2rem' }}>
                    <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}>Change Password</h4>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>If you received a default password from admin, update it here.</p>
                    <input className="input" type="password" style={{ padding: '1rem', borderRadius: '12px' }} placeholder="Current Password" value={pwdForm.currentPassword} onChange={e => setPwdForm(p => ({ ...p, currentPassword: e.target.value }))} required />
                    <input className="input" type="password" style={{ padding: '1rem', borderRadius: '12px' }} placeholder="New Password (min 6 chars)" value={pwdForm.newPassword} onChange={e => setPwdForm(p => ({ ...p, newPassword: e.target.value }))} required />
                    <input className="input" type="password" style={{ padding: '1rem', borderRadius: '12px' }} placeholder="Confirm New Password" value={pwdForm.confirmPassword} onChange={e => setPwdForm(p => ({ ...p, confirmPassword: e.target.value }))} required />
                    {pwdMsg && (
                        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} style={{ padding: '0.8rem', borderRadius: '10px', textAlign: 'center', fontWeight: 600, background: pwdMsg.includes('success') ? '#f0fdf4' : '#fef2f2', color: pwdMsg.includes('success') ? '#15803d' : '#b91c1c' }}>{pwdMsg}</motion.div>
                    )}
                    <motion.button type="submit" disabled={pwdLoading} className="btn btn-primary" style={{ justifyContent: 'center', padding: '1rem', borderRadius: '12px', fontSize: '1rem' }} whileHover={{ y: -3, scale: 1.02 }} whileTap={{ scale: 0.97 }} transition={{ type: 'spring', stiffness: 300 }}>
                        {pwdLoading ? 'Changing...' : '🔒 Change Password'}
                    </motion.button>
                </form>
            </div>

        </motion.div>
    );
};

export default StudentDashboard;
