import React, { useState, useEffect, cloneElement, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users, FileText, CheckCircle, TrendingUp, Filter, Download,
    ArrowUpRight, LayoutDashboard, Settings, Bell, Grid,
    UserPlus, Edit, Trash2, Check, X, Search, Plus, Send, Clock,
    BarChart2, PieChart as PieChartIcon, Activity, User as UserIcon,
    Camera, Save, Database, Upload, FileUp, Share2, RefreshCcw, MoreVertical
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import {
    apiGetAdminStats, apiGetAllTickets, apiDeleteTicket, apiUpdateTicketStatus,
    apiGetAllUsers, apiCreateUser, apiUpdateUser, apiDeleteUser,
    apiGetCategories, apiCreateCategory, apiUpdateCategory, apiDeleteCategory,
    apiGetAnnouncements, apiCreateAnnouncement, apiDeleteAnnouncement,
    apiUpdateProfile, apiGetNotifications, apiMarkAllNotificationsRead, apiDeleteProfilePicture,
    apiUploadKnowledgeBase, apiGetKnowledgeBaseFiles, apiDeleteKnowledgeBaseFile, apiChangePassword,
    SERVER_URL
} from '../api';

// Redundant DEPARTMENTS removed

const AdminDashboard = ({ user, setUser, onLogout }) => {
    const location = useLocation();
    const [activeSection, setActiveSection] = useState('overview');

    // Helper to capitalize strings
    const capitalize = (str) => {
        if (!str) return 'User';
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    };


    // ── Real API state ──
    const [stats, setStats] = useState([
        { label: 'Total Complaints', value: '…', icon: <FileText />, color: '#2563eb', trend: '' },
        { label: 'Active Tickets', value: '…', icon: <Clock />, color: '#f59e0b', trend: '' },
        { label: 'Resolution Rate', value: '…', icon: <CheckCircle />, color: '#10b981', trend: '' },
        { label: 'System Users', value: '…', icon: <Users />, color: '#6366f1', trend: '' },
    ]);
    const [chartData, setChartData] = useState([]);
    const [users, setUsers] = useState([]);
    const [categories, setCategories] = useState([]);
    const [complaints, setComplaints] = useState([]);
    const [announcements, setAnnouncements] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [viewImage, setViewImage] = useState(null);

    const containerVariants = {
        hidden: { opacity: 1 },
        visible: { opacity: 1, transition: { duration: 0 } }
    };

    const itemVariants = {
        hidden: { opacity: 1, y: 0 },
        visible: { opacity: 1, y: 0, transition: { duration: 0 } }
    };

    // ── Departments list (Dynamically derived from categories) ──
    const DEPARTMENTS = useMemo(() => {
        // In the new model, category name is the department
        const uniqueDepts = [...new Set(categories.map(cat => typeof cat === 'string' ? cat : cat.name).filter(Boolean))];
        return uniqueDepts.sort();
    }, [categories]);

    const [showUserModal, setShowUserModal] = useState(false);
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [showComplaintModal, setShowComplaintModal] = useState(false);
    const [editingEntity, setEditingEntity] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
    const [userSearchTerm, setUserSearchTerm] = useState('');
    const [selectedCats, setSelectedCats] = useState([]); // For staff granular assignment
    const [modalRole, setModalRole] = useState('student'); // Track role in modal for UI toggles
    const [modalDepts, setModalDepts] = useState([]); // Pending depts selection in modal (Array)
    const [showDeptList, setShowDeptList] = useState(false); // Collapsible trigger state
    const [modalName, setModalName] = useState(''); // Controlled name field
    const [modalEmail, setModalEmail] = useState(''); // Controlled email field
    const [modalStatus, setModalStatus] = useState('active'); // Controlled status field

    // RAG Upload States
    const [uploading, setUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState(null);
    const [kbFiles, setKbFiles] = useState([]);
    const [loadingFiles, setLoadingFiles] = useState(false);

    const fetchKbFiles = async () => {
        setLoadingFiles(true);
        try {
            const res = await apiGetKnowledgeBaseFiles();
            if (res.success) {
                setKbFiles(res.files);
            }
        } catch (error) {
            console.error('Error fetching KB files:', error);
        } finally {
            setLoadingFiles(false);
        }
    };

    useEffect(() => {
        if (activeSection === 'knowledge-base') {
            fetchKbFiles();
        }
    }, [activeSection]);

    const handleDeleteKbFile = async (filename) => {
        if (!window.confirm(`Are you sure you want to delete "${filename}" and all its knowledge base entries?`)) return;
        try {
            const res = await apiDeleteKnowledgeBaseFile(filename);
            if (res.success) {
                fetchKbFiles();
            } else {
                alert(res.message || 'Failed to delete file');
            }
        } catch (error) {
            console.error('Delete error', error);
            alert('Error deleting file');
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        setUploading(true);
        setUploadStatus({ type: 'info', message: 'Processing knowledge base... this may take a moment.' });

        try {
            const res = await apiUploadKnowledgeBase(formData);
            if (res.success) {
                setUploadStatus({ type: 'success', message: res.message });
                fetchKbFiles();
            } else {
                setUploadStatus({ type: 'error', message: res.message || 'Upload failed' });
            }
        } catch (error) {
            setUploadStatus({ type: 'error', message: 'Connection error during upload' });
        } finally {
            setUploading(false);
            e.target.value = null; // Reset input
        }
    };

    const openUserModal = (user = null) => {
        setEditingEntity(user);
        setSelectedCats(user?.assignedCategories || []);
        setModalRole(user?.role || 'student');
        setModalDepts(user?.departments || []);
        setModalName(user?.name || '');
        setModalEmail(user?.email || '');
        setModalStatus(user?.status || 'active');
        setShowUserModal(true);
    };

    const openFile = (url) => {
        if (!url) return;
        if (url.match(/\.(jpeg|jpg|gif|png|webp|bmp)$/i) || url.startsWith('data:image')) {
            setViewImage(url.startsWith('http') || url.startsWith('data:') ? url : `${SERVER_URL}${url}`);
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
            window.open(url.startsWith('http') ? url : `${SERVER_URL}${url}`, '_blank');
        }
    };

    useEffect(() => {
        const handleAuthError = (res) => {
            if (res.message && (res.message.includes('authorized') || res.message.includes('401'))) {
                onLogout();
                return true;
            }
            return false;
        };

        apiGetAdminStats().then(res => {
            if (handleAuthError(res)) return;
            if (res.success) {
                const { totalTickets, activeTickets, resolvedTickets, totalUsers, resolutionRate } = res.stats;
                setStats([
                    { label: 'Total Complaints', value: String(totalTickets), icon: <FileText />, color: '#2563eb', trend: '' },
                    { label: 'Active Tickets', value: String(activeTickets), icon: <Clock />, color: '#f59e0b', trend: '' },
                    { label: 'Resolution Rate', value: `${resolutionRate}%`, icon: <CheckCircle />, color: '#10b981', trend: '' },
                    { label: 'System Users', value: String(totalUsers), icon: <Users />, color: '#6366f1', trend: '' },
                ]);
                setChartData(res.chartData || []);
            }
        });
        apiGetAllTickets().then(res => {
            if (handleAuthError(res)) return;
            if (res.success) {
                setComplaints(res.tickets);
                if (location.state?.openTicketId) {
                    const ticketToOpen = res.tickets.find(t => (t._id || t.id) === location.state.openTicketId);
                    if (ticketToOpen) {
                        setEditingEntity(ticketToOpen);
                        setShowComplaintModal(true);
                        setActiveSection('complaints');
                        window.history.replaceState({}, document.title, location.pathname);
                    }
                }
            }
        });
        apiGetAllUsers().then(res => {
            if (handleAuthError(res)) return;
            if (res.success) setUsers(res.users);
        });
        apiGetCategories().then(res => {
            if (handleAuthError(res)) return;
            if (res.success) setCategories(res.categories);
        });
        apiGetAnnouncements().then(res => {
            if (handleAuthError(res)) return;
            if (res.success) setAnnouncements(res.announcements);
        });
        apiGetNotifications().then(res => {
            if (handleAuthError(res)) return;
            if (res.success) setNotifications(res.notifications);
        });
    }, []);

    const filteredComplaints = useMemo(() => {
        const term = searchTerm.toLowerCase();
        return complaints.filter(c =>
            (c.ticketId || '').toLowerCase().includes(term) ||
            (c.studentName || '').toLowerCase().includes(term) ||
            (c.title || '').toLowerCase().includes(term)
        );
    }, [complaints, searchTerm]);

    const filteredUsers = useMemo(() => {
        return users.filter(u =>
            u.name.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
            u.email.toLowerCase().includes(userSearchTerm.toLowerCase())
        );
    }, [users, userSearchTerm]);

    const trendsData = [
        { name: 'Sep', complaints: 120, resolved: 100 },
        { name: 'Oct', complaints: 150, resolved: 130 },
        { name: 'Nov', complaints: 180, resolved: 170 },
        { name: 'Dec', complaints: 210, resolved: 195 },
        { name: 'Jan', complaints: 190, resolved: 185 },
        { name: 'Feb', complaints: 240, resolved: 210 },
    ];

    const menuItems = [
        { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={20} /> },
        { id: 'complaints', label: 'Complaints', icon: <FileText size={20} /> },
        { id: 'users', label: 'Users', icon: <Users size={20} /> },
        { id: 'categories', label: 'Categories', icon: <Grid size={20} /> },
        { id: 'analytics', label: 'Analytics', icon: <BarChart2 size={20} /> },
        { id: 'announcements', label: 'Announcements', icon: <Bell size={20} /> },
        { id: 'knowledge-base', label: 'Knowledge Base', icon: <Database size={20} /> },
        { id: 'settings', label: 'Settings', icon: <Settings size={20} /> },
    ];

    // --- Real-time computed analytics from actual complaints data ---
    const totalComplaints = complaints.length;
    const openComplaints = useMemo(() => complaints.filter(c => c.status === 'Open').length, [complaints]);
    const inProgressComplaints = useMemo(() => complaints.filter(c => c.status === 'In Progress').length, [complaints]);
    const resolvedComplaints = useMemo(() => complaints.filter(c => c.status === 'Resolved').length, [complaints]);

    const pct = (n) => totalComplaints === 0 ? 0 : Math.round((n / totalComplaints) * 100);

    // Complaints grouped by department, with open/in-progress/resolved breakdown
    // Now initialized with ALL categories so departments with 0 complaints still show up
    const departmentStats = useMemo(() => {
        const map = {};

        // Initialize map with all available categories
        categories.forEach(cat => {
            const deptName = typeof cat === 'string' ? cat : cat.name;
            if (deptName) {
                map[deptName] = { name: deptName, total: 0, open: 0, inProgress: 0, resolved: 0 };
            }
        });

        // Populate with actual complaint data
        complaints.forEach(c => {
            const dept = c.department || 'Unassigned';
            if (!map[dept]) map[dept] = { name: dept, total: 0, open: 0, inProgress: 0, resolved: 0 };
            map[dept].total++;
            if (c.status === 'Open') map[dept].open++;
            else if (c.status === 'In Progress') map[dept].inProgress++;
            else if (c.status === 'Resolved') map[dept].resolved++;
        });

        return Object.values(map).sort((a, b) => b.total - a.total);
    }, [complaints, categories]);

    // Pie chart data from real department data
    const categoryData = useMemo(() => departmentStats.map(d => ({ name: d.name, value: d.total })), [departmentStats]);

    const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#6366f1', '#ec4899', '#8b5cf6', '#14b8a6', '#f97316'];


    const renderOverview = () => (
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="overview-container">
            {/* Main stats row */}
            <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.2rem', marginBottom: '1.5rem' }}>
                {stats.map((s, i) => (
                    <motion.div variants={itemVariants} whileHover={{ y: -5, scale: 1.02 }} key={i} className="card" style={{ padding: '0.8rem 1rem', border: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <div style={{ padding: '6px', background: `${s.color}15`, color: s.color, borderRadius: '8px' }}>{cloneElement(s.icon, { size: 16 })}</div>
                        </div>
                        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.75rem' }}>{s.label}</p>
                        <h3 style={{ margin: '0.1rem 0 0 0', fontSize: '1.2rem' }}>{s.value}</h3>
                    </motion.div>
                ))}
            </div>

            {/* Real-time status breakdown */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.2rem', marginBottom: '2rem' }}>
                {[
                    { label: 'Total Complaints', value: totalComplaints, color: '#2563eb', bg: '#eff6ff', sub: '100% of all tickets' },
                    { label: 'Open', value: openComplaints, color: '#ef4444', bg: '#fef2f2', sub: `${pct(openComplaints)}% of total` },
                    { label: 'In Progress', value: inProgressComplaints, color: '#f59e0b', bg: '#fffbeb', sub: `${pct(inProgressComplaints)}% of total` },
                    { label: 'Resolved', value: resolvedComplaints, color: '#10b981', bg: '#f0fdf4', sub: `${pct(resolvedComplaints)}% of total` },
                ].map((stat, i) => (
                    <motion.div variants={itemVariants} key={i} whileHover={{ y: -5, scale: 1.02 }} className="card" style={{ padding: '1rem', border: `1px solid ${stat.color}30`, background: stat.bg }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <p style={{ margin: 0, fontSize: '0.7rem', fontWeight: 700, color: stat.color, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{stat.label}</p>
                                <h2 style={{ margin: '0.3rem 0 0 0', fontSize: '2rem', fontWeight: 900, color: stat.color, lineHeight: 1 }}>{stat.value}</h2>
                                <p style={{ margin: '0.3rem 0 0 0', fontSize: '0.72rem', color: '#64748b' }}>{stat.sub}</p>
                            </div>
                            {/* Progress arc */}
                            <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: `conic-gradient(${stat.color} ${pct(stat.value)}%, #e2e8f0 0)`, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: stat.bg, display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '0.6rem', fontWeight: 800, color: stat.color }}>
                                    {stat.label === 'Total Complaints' ? '∑' : `${pct(stat.value)}%`}
                                </div>
                            </div>
                        </div>
                        {/* Progress bar */}
                        <div style={{ marginTop: '0.8rem', height: '4px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${stat.label === 'Total Complaints' ? 100 : pct(stat.value)}%` }}
                                transition={{ duration: 0.8, ease: 'easeOut' }}
                                style={{ height: '100%', background: stat.color, borderRadius: '4px' }}
                            />
                        </div>
                    </motion.div>
                ))}
            </div>

            <motion.div variants={itemVariants} className="admin-charts-grid" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem', marginBottom: '2.5rem' }}>

                <div className="card">
                    <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem' }}>By Department</h3>
                    <div style={{ height: '260px', width: '100%', position: 'relative' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={categoryData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={4} dataKey="value">
                                    {categoryData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(val, name) => [`${val} tickets (${pct(val)}%)`, name]} contentStyle={{ borderRadius: '10px', border: 'none', fontSize: '0.8rem' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '150px', overflowY: 'auto' }}>
                        {categoryData.map((c, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '3px 0' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: COLORS[i % COLORS.length] }} />
                                    <span style={{ fontSize: '0.75rem' }}>{c.name}</span>
                                </div>
                                <span style={{ fontWeight: 700, fontSize: '0.75rem', color: COLORS[i % COLORS.length] }}>{c.value} ({pct(c.value)}%)</span>
                            </div>
                        ))}
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );


    const renderComplaints = () => (
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="card">
            <div className="admin-controls-row">
                <div className="admin-search-container">
                    <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                        className="input"
                        placeholder="Search tickets by ID, title, or student..."
                        style={{ paddingLeft: '40px' }}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="admin-filter-container">
                    <select className="input" style={{ width: 'auto' }}>
                        <option>All Status</option>
                        <option>Open</option>
                        <option>In Progress</option>
                        <option>Resolved</option>
                    </select>
                    <button className="btn glass admin-btn-sm"><Filter size={18} /> <span className="desk-only">Filter</span></button>
                </div>
            </div>
            <div className="table-container">
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1000px' }}>
                    <thead>
                        <tr style={{ color: 'var(--text-muted)', fontSize: '0.75rem', borderBottom: '1px solid var(--border)' }}>
                            <th style={{ padding: '0.75rem' }}>Ticket ID</th>
                            <th style={{ padding: '0.75rem' }}>Details</th>
                            <th style={{ padding: '0.75rem' }}>Department</th>
                            <th style={{ padding: '0.75rem' }}>Priority</th>
                            <th style={{ padding: '0.75rem' }}>Status</th>
                            <th style={{ padding: '0.75rem', textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <motion.tbody variants={containerVariants} initial="hidden" animate="visible">
                        {filteredComplaints.map((c) => (
                            <motion.tr variants={itemVariants} layout whileHover={{ background: '#f8fafc', scale: 1.002, x: 2 }} key={c._id || c.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                                <td style={{ padding: '0.75rem', fontWeight: 600, fontSize: '0.85rem' }}>{c.ticketId || c._id || c.id}</td>
                                <td style={{ padding: '0.75rem' }}>
                                    <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{c.title}</div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>by {c.studentName}</div>
                                </td>
                                <td style={{ padding: '1.2rem 1rem' }}>
                                    <select
                                        className="input"
                                        value={c.department}
                                        onChange={(e) => {
                                            const newDept = e.target.value;
                                            apiUpdateTicketStatus(c._id || c.id, { department: newDept, category: newDept }).then(res => {
                                                if (res.success) setComplaints(complaints.map(t => (t._id === c._id || t.id === c.id) ? res.ticket : t));
                                            });
                                        }}
                                        style={{ padding: '4px 8px', fontSize: '0.8rem', width: 'auto' }}
                                    >
                                        {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                                    </select>
                                </td>
                                <td style={{ padding: '1.2rem 1rem' }}>
                                    <select
                                        className="input"
                                        value={c.priority || 'Normal'}
                                        onChange={(e) => {
                                            const newPriority = e.target.value;
                                            apiUpdateTicketStatus(c._id || c.id, { priority: newPriority }).then(res => {
                                                if (res.success) setComplaints(complaints.map(t => (t._id === c._id || t.id === c.id) ? res.ticket : t));
                                            });
                                        }}
                                        style={{
                                            padding: '4px 8px', fontSize: '0.8rem', width: 'auto',
                                            fontWeight: 600,
                                            color: c.priority === 'Critical' ? '#ef4444' : c.priority === 'Urgent' ? '#f59e0b' : 'var(--text-main)'
                                        }}
                                    >
                                        <option value="Normal">Normal</option>
                                        <option value="Urgent">Urgent</option>
                                        <option value="Critical">Critical</option>
                                        <option value="Classical">Classical</option>
                                    </select>
                                </td>
                                <td style={{ padding: '1.2rem 1rem' }}>
                                    <select
                                        className="input"
                                        value={c.status}
                                        onChange={(e) => {
                                            const newStatus = e.target.value;
                                            apiUpdateTicketStatus(c._id || c.id, { status: newStatus }).then(res => {
                                                if (res.success) setComplaints(complaints.map(t => (t._id === c._id || t.id === c.id) ? res.ticket : t));
                                            });
                                        }}
                                        style={{
                                            padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600,
                                            background: c.status === 'Resolved' ? '#def7ec' : c.status === 'Open' ? '#fde8e8' : '#feecdc',
                                            color: c.status === 'Resolved' ? '#03543f' : c.status === 'Open' ? '#9b1c1c' : '#9a3412',
                                            border: 'none', width: 'auto'
                                        }}
                                    >
                                        <option>Open</option>
                                        <option>In Progress</option>
                                        <option>Resolved</option>
                                    </select>
                                </td>
                                <td style={{ padding: '1.2rem 1rem', textAlign: 'right' }}>
                                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                        <button
                                            className="btn glass"
                                            style={{ padding: '6px' }}
                                            onClick={() => { setEditingEntity(c); setShowComplaintModal(true); }}
                                        >
                                            <ArrowUpRight size={16} />
                                        </button>
                                        <button
                                            className="btn"
                                            style={{ padding: '6px', background: '#fee2e2', color: '#dc2626' }}
                                            onClick={() => {
                                                apiDeleteTicket(c._id || c.id).then(res => {
                                                    if (res.success) setComplaints(complaints.filter(t => (t._id || t.id) !== (c._id || c.id)));
                                                    else alert(res.message);
                                                });
                                            }}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            </motion.tr>
                        ))}
                    </motion.tbody>
                </table>
            </div>
        </motion.div>
    );

    const renderUsers = () => (
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ position: 'relative', width: '300px' }}>
                    <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                        className="input"
                        placeholder="Search users by name or email..."
                        style={{ paddingLeft: '40px' }}
                        value={userSearchTerm}
                        onChange={(e) => setUserSearchTerm(e.target.value)}
                    />
                </div>
                <button
                    className="btn btn-primary"
                    onClick={() => { setEditingEntity(null); setShowUserModal(true); }}
                >
                    <UserPlus size={18} /> Add User
                </button>
            </div>
            <div className="table-container">
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
                    <thead>
                        <tr style={{ color: 'var(--text-muted)', fontSize: '0.75rem', borderBottom: '1px solid var(--border)' }}>
                            <th style={{ padding: '0.75rem' }}>User Info</th>
                            <th style={{ padding: '0.75rem' }}>Role</th>
                            <th style={{ padding: '0.75rem' }}>Department</th>
                            <th style={{ padding: '0.75rem' }}>Status</th>
                            <th style={{ padding: '0.75rem', textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <motion.tbody variants={containerVariants} initial="hidden" animate="visible">
                        {filteredUsers.map((u) => (
                            <motion.tr variants={itemVariants} layout whileHover={{ background: '#f8fafc', scale: 1.002, x: 2 }} key={u._id || u.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                                <td style={{ padding: '0.75rem' }}>
                                    <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{u.name}</div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{u.email}</div>
                                </td>
                                <td style={{ padding: '0.75rem', fontSize: '0.8rem' }}>
                                    <span style={{ textTransform: 'capitalize' }}>{u.role}</span>
                                </td>
                                <td style={{ padding: '0.75rem', fontSize: '0.8rem' }}>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                        {u.departments && u.departments.length > 0 ? (
                                            u.departments.map((dept, idx) => (
                                                <span key={idx} style={{
                                                    background: '#f1f5f9', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', color: '#475569', fontWeight: 600
                                                }}>{dept}</span>
                                            ))
                                        ) : (
                                            <span style={{ color: 'var(--text-muted)' }}>{u.department || '-'}</span>
                                        )}
                                    </div>
                                </td>
                                <td style={{ padding: '0.75rem' }}>
                                    <span style={{
                                        fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase',
                                        padding: '2px 8px', borderRadius: '10px',
                                        background: u.status === 'active' ? '#dcfce7' : '#f1f5f9',
                                        color: u.status === 'active' ? '#166534' : '#64748b'
                                    }}>{u.status}</span>
                                </td>
                                <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                                    <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                                        <button
                                            className="btn glass"
                                            style={{ padding: '4px' }}
                                            onClick={() => openUserModal(u)}
                                        >
                                            <Edit size={14} />
                                        </button>
                                        <button
                                            className="btn"
                                            style={{ padding: '4px', background: '#fee2e2', color: '#dc2626' }}
                                            onClick={() => {
                                                apiDeleteUser(u._id || u.id).then(res => {
                                                    if (res.success) setUsers(users.filter(usr => (usr._id || usr.id) !== (u._id || u.id)));
                                                    else alert(res.message);
                                                });
                                            }}
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </td>
                            </motion.tr>
                        ))}
                    </motion.tbody>
                </table>
            </div>
        </motion.div>
    );

    const renderCategories = () => (
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="card">
            <div className="admin-section-header">
                <h3>System Categories</h3>
                <button
                    className="btn btn-primary admin-btn-sm"
                    onClick={() => { setEditingEntity(null); setShowCategoryModal(true); }}
                >
                    <Plus size={18} /> New Category
                </button>
            </div>
            <motion.div variants={containerVariants} initial="hidden" animate="visible" className="admin-categories-grid">
                {categories.map((cat, i) => (
                    <motion.div variants={itemVariants} whileHover={{ y: -5, scale: 1.01 }} key={cat._id || i} className="card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.8rem', border: '1px solid var(--border)', position: 'relative' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>{typeof cat === 'string' ? cat : cat.name}</h4>
                            </div>
                            <div style={{ display: 'flex', gap: '0.4rem' }}>
                                <button
                                    className="btn glass"
                                    style={{ padding: '6px' }}
                                    onClick={() => { setEditingEntity(cat); setShowCategoryModal(true); }}
                                >
                                    <Edit size={14} />
                                </button>
                                <button
                                    className="btn"
                                    style={{ padding: '6px', background: '#fee2e2', color: '#dc2626' }}
                                    onClick={() => {
                                        apiDeleteCategory(cat._id).then(res => {
                                            if (res.success) setCategories(categories.filter(c => c._id !== cat._id));
                                        });
                                    }}
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                        {cat.description && <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>{cat.description}</p>}
                    </motion.div>
                ))}
            </motion.div>
        </motion.div>
    );

    const renderAnnouncements = () => (
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="admin-charts-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '1.5rem' }}>
            <motion.div variants={itemVariants} className="card" style={{ padding: '1.2rem' }}>
                <h3 style={{ marginBottom: '1.2rem', fontSize: '1rem' }}>Compose Announcement</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>Target Audience</label>
                        <select id="annTarget" className="input" style={{ marginTop: '0.3rem', padding: '0.6rem' }}>
                            <option>All Users</option>
                            <option>Students Only</option>
                            <option>Staff Only</option>
                            <option>Admins Only</option>
                        </select>
                    </div>
                    <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>Subject</label>
                        <input id="annTitle" className="input" placeholder="Emergency Maintenance..." style={{ marginTop: '0.3rem', padding: '0.6rem' }} />
                    </div>
                    <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>Message</label>
                        <textarea id="annText" className="input" rows="4" placeholder="Type your announcement here..." style={{ marginTop: '0.3rem', padding: '0.6rem', height: 'auto' }} />
                    </div>
                    <button
                        className="btn btn-primary"
                        style={{ marginTop: '0.5rem' }}
                        onClick={() => {
                            const title = document.getElementById('annTitle').value;
                            const text = document.getElementById('annText').value;
                            const target = document.getElementById('annTarget').value;
                            if (title && text) {
                                apiCreateAnnouncement({ title, text, target }).then(res => {
                                    if (res.success) {
                                        setAnnouncements([res.announcement, ...announcements]);
                                        document.getElementById('annTitle').value = '';
                                        document.getElementById('annText').value = '';
                                    }
                                });
                            }
                        }}
                    >
                        <Send size={16} /> Broadcast Message
                    </button>
                </div>
            </motion.div>

            <motion.div variants={itemVariants} className="card" style={{ padding: '1.2rem' }}>
                <h3 style={{ marginBottom: '1.2rem', fontSize: '1rem' }}>Broadcast History</h3>
                <motion.div variants={containerVariants} initial="hidden" animate="visible" style={{ display: 'flex', flexDirection: 'column', gap: '0.80rem' }}>
                    {announcements.map(a => (
                        <motion.div
                            variants={itemVariants}
                            key={a._id || a.id}
                            style={{ padding: '1.2rem', border: '1px solid var(--border)', borderRadius: '16px', background: '#f8fafc', cursor: 'pointer' }}
                            onClick={() => setSelectedAnnouncement(a)}
                            whileHover={{ y: -2, background: 'white', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                                <span style={{ fontSize: '0.65rem', fontWeight: 800, background: 'var(--primary)', color: 'white', padding: '4px 10px', borderRadius: '6px', textTransform: 'uppercase' }}>{a.target}</span>
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{new Date(a.createdAt || a.date).toLocaleDateString()}</span>
                            </div>
                            <h4 style={{ margin: '0 0 0.4rem 0', fontSize: '1rem', fontWeight: 700 }}>{a.title}</h4>
                            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5, maxHeight: '3.6em', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                                {a.text || a.content}
                            </p>
                            <div style={{ marginTop: '0.8rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <button
                                    className="btn"
                                    style={{ padding: '6px', background: '#fee2e2', color: '#dc2626' }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        apiDeleteAnnouncement(a._id || a.id).then(res => {
                                            if (res.success) setAnnouncements(announcements.filter(ann => (ann._id || ann.id) !== (a._id || a.id)));
                                            else alert(res.message);
                                        });
                                    }}
                                >
                                    <Trash2 size={16} />
                                </button>
                                <motion.button
                                    className="btn glass"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedAnnouncement(a);
                                    }}
                                    style={{ padding: '6px 12px', fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600, border: 'none', background: 'transparent' }}
                                    whileHover={{ x: 5, color: '#1d4ed8', scale: 1.05 }}
                                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                                >
                                    View Detail →
                                </motion.button>
                            </div>
                        </motion.div>
                    ))}
                </motion.div>
            </motion.div>
        </motion.div>
    );

    const renderAnalytics = () => (
        <motion.div variants={containerVariants} initial="hidden" animate="visible">

            {/* Summary stat cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                {[
                    { label: 'Total Complaints', value: totalComplaints, color: '#2563eb', pct: 100 },
                    { label: 'Open', value: openComplaints, color: '#ef4444', pct: pct(openComplaints) },
                    { label: 'In Progress', value: inProgressComplaints, color: '#f59e0b', pct: pct(inProgressComplaints) },
                    { label: 'Resolved', value: resolvedComplaints, color: '#10b981', pct: pct(resolvedComplaints) },
                ].map((s, i) => (
                    <motion.div variants={itemVariants} key={i} whileHover={{ y: -5, scale: 1.02 }} className="card" style={{ padding: '1.2rem', border: `2px solid ${s.color}20` }}>
                        <p style={{ margin: 0, fontSize: '0.7rem', fontWeight: 700, color: s.color, textTransform: 'uppercase' }}>{s.label}</p>
                        <h2 style={{ margin: '0.4rem 0 0.2rem 0', fontSize: '2.2rem', fontWeight: 900, color: s.color }}>{s.value}</h2>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ flex: 1, height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${s.pct}%` }}
                                    transition={{ duration: 0, delay: 0 }}
                                    style={{ height: '100%', background: s.color, borderRadius: '3px' }}
                                />
                            </div>
                            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: s.color, minWidth: '32px' }}>{s.pct}%</span>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Department breakdown — full real data */}
            <div className="card" style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1rem' }}>Complaints by Department</h3>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>{departmentStats.length} departments</span>
                </div>

                {departmentStats.length === 0 ? (
                    <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem 0' }}>No complaints yet.</p>
                ) : (
                    <motion.div variants={containerVariants} initial="hidden" animate="visible" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {departmentStats.map((dept, i) => (
                            <motion.div variants={itemVariants} whileHover={{ scale: 1.01, x: 2 }} key={dept.name} style={{ padding: '1rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid var(--border)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem', flexWrap: 'wrap', gap: '0.6rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: COLORS[i % COLORS.length] }} />
                                        <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{dept.name}</span>
                                    </div>
                                    <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', fontWeight: 700, flexWrap: 'wrap' }}>
                                        <span style={{ color: '#ef4444' }}>{dept.open} Open</span>
                                        <span style={{ color: '#f59e0b' }}>{dept.inProgress} In Progress</span>
                                        <span style={{ color: '#10b981' }}>{dept.resolved} Resolved</span>
                                        <span style={{ color: '#64748b' }}>Total: {dept.total} ({pct(dept.total)}%)</span>
                                    </div>
                                </div>
                                {/* Stacked bar */}
                                <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden', display: 'flex' }}>
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${dept.total === 0 ? 0 : Math.round(dept.open / dept.total * 100)}%` }}
                                        transition={{ duration: 0, delay: 0 }}
                                        style={{ height: '100%', background: '#ef4444' }}
                                    />
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${dept.total === 0 ? 0 : Math.round(dept.inProgress / dept.total * 100)}%` }}
                                        transition={{ duration: 0, delay: 0 }}
                                        style={{ height: '100%', background: '#f59e0b' }}
                                    />
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${dept.total === 0 ? 0 : Math.round(dept.resolved / dept.total * 100)}%` }}
                                        transition={{ duration: 0, delay: 0 }}
                                        style={{ height: '100%', background: '#10b981' }}
                                    />
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>
                )}
            </div>

            {/* Charts row */}
            <div className="admin-charts-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                {/* Department totals bar chart */}
                <div className="card">
                    <h3 style={{ fontSize: '0.9rem', marginBottom: '1.2rem' }}>Complaints per Department</h3>
                    <div style={{ height: '260px', width: '100%', position: 'relative' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={departmentStats} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} width={90} />
                                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '10px', border: 'none' }} formatter={(v, name) => [`${v} (${pct(v)}%)`, name]} />
                                <Bar dataKey="open" stackId="a" fill="#ef4444" radius={0} name="Open" />
                                <Bar dataKey="inProgress" stackId="a" fill="#f59e0b" radius={0} name="In Progress" />
                                <Bar dataKey="resolved" stackId="a" fill="#10b981" radius={[0, 4, 4, 0]} name="Resolved" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Status distribution pie */}
                <div className="card">
                    <h3 style={{ fontSize: '0.9rem', marginBottom: '1.2rem' }}>Status Distribution</h3>
                    <div style={{ height: '200px', width: '100%', position: 'relative', minWidth: 0 }}>
                        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                            <PieChart>
                                <Pie
                                    data={[
                                        { name: 'Open', value: openComplaints },
                                        { name: 'In Progress', value: inProgressComplaints },
                                        { name: 'Resolved', value: resolvedComplaints },
                                    ].filter(d => d.value > 0)}
                                    cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value"
                                >
                                    <Cell fill="#ef4444" />
                                    <Cell fill="#f59e0b" />
                                    <Cell fill="#10b981" />
                                </Pie>
                                <Tooltip formatter={(v, name) => [`${v} (${pct(v)}%)`, name]} contentStyle={{ borderRadius: '10px', border: 'none', fontSize: '0.8rem' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', gap: '0.5rem', marginTop: '0.5rem' }}>
                        {[
                            { label: 'Open', value: openComplaints, color: '#ef4444' },
                            { label: 'In Progress', value: inProgressComplaints, color: '#f59e0b' },
                            { label: 'Resolved', value: resolvedComplaints, color: '#10b981' },
                        ].map(s => (
                            <div key={s.label} style={{ textAlign: 'center', padding: '0.5rem', background: `${s.color}10`, borderRadius: '8px' }}>
                                <p style={{ margin: 0, fontSize: '0.65rem', color: s.color, fontWeight: 700 }}>{s.label}</p>
                                <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: s.color }}>{s.value}</p>
                                <p style={{ margin: 0, fontSize: '0.65rem', color: '#64748b' }}>{pct(s.value)}%</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </motion.div>
    );


    useEffect(() => {
        const handleAdminSectionChange = (e) => {
            if (e.detail && e.detail.section) {
                setActiveSection(e.detail.section);
            }
        };
        window.addEventListener('admin-section-change', handleAdminSectionChange);
        return () => window.removeEventListener('admin-section-change', handleAdminSectionChange);
    }, []);

    // Role-Based Guard (moved after hooks to follow Rules of Hooks)

    const renderKnowledgeBase = () => (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="admin-kb-section-wrapper">
            <div className="admin-kb-grid">
                {/* Left side: Upload */}
                <div className="admin-kb-left">
                    <div className="admin-kb-upload-box">
                        <div className="admin-kb-upload-icon-container">
                            <FileUp size={40} />
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <h2 className="admin-kb-title">Expand Knowledge Base</h2>
                            <p className="admin-kb-subtitle">Upload documents to help the AI assistant answer campus queries.</p>
                        </div>

                        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div className="admin-kb-features">
                                <span className="admin-kb-feature"><CheckCircle size={14} color="#10b981" /> PDF Support</span>
                                <span className="admin-kb-feature"><CheckCircle size={14} color="#10b981" /> Text Files</span>
                                <span className="admin-kb-feature"><CheckCircle size={14} color="#10b981" /> Auto-Chunking</span>
                            </div>

                            <label className={`btn ${uploading ? 'disabled' : 'btn-primary'} admin-kb-upload-btn`}>
                                {uploading ? <div className="spinner-small" style={{ marginRight: '8px' }} /> : <Upload size={18} style={{ marginRight: '8px' }} />}
                                {uploading ? 'Processing Document...' : 'Select File to Upload'}
                                <input type="file" hidden accept=".pdf,.txt,.doc,.docx" onChange={handleFileUpload} disabled={uploading} />
                            </label>
                        </div>

                        {uploadStatus && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`admin-kb-status-alert status-${uploadStatus.type}`}
                            >
                                {uploadStatus.message}
                            </motion.div>
                        )}
                    </div>

                    <div className="admin-kb-tips">
                        <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>RAG Integration Tips</h4>
                        <ul className="admin-kb-tips-list">
                            <li>Ensure documents are text-searchable (not scanned images).</li>
                            <li>High-quality content leads to better AI responses.</li>
                            <li>Existing knowledge base will be appended with new data.</li>
                            <li>The assistant will strictly follow these instructions and respond to university related questions.</li>
                        </ul>
                    </div>
                </div>

                {/* Right Side: Uploaded Files List */}
                <div className="admin-kb-right">
                    <div className="admin-kb-right-header">
                        <h3 className="admin-kb-right-title">Knowledge Base Files</h3>
                        <div className="admin-kb-file-count">
                            {kbFiles.length} files
                        </div>
                    </div>

                    <div className="admin-kb-files-list">
                        {loadingFiles ? (
                            <div className="spinner-small" style={{ alignSelf: 'center', margin: '2rem 0' }} />
                        ) : kbFiles.length > 0 ? (
                            kbFiles.map((file, i) => (
                                <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                                    className="admin-kb-file-card"
                                    whileHover={{ borderColor: 'var(--primary)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                                >
                                    <div className="admin-kb-file-info">
                                        <div className="admin-kb-file-icon">
                                            <Database size={20} />
                                        </div>
                                        <div style={{ overflow: 'hidden', flex: 1 }}>
                                            <p className="admin-kb-file-name" title={file.fileName}>{file.fileName}</p>
                                            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                {new Date(file.uploadedAt).toLocaleDateString()} • {file.chunkCount} chunks
                                            </p>
                                        </div>
                                    </div>
                                    <button onClick={() => handleDeleteKbFile(file.fileName)} className="btn btn-icon admin-kb-delete-btn" title="Remove from Knowledge Base">
                                        <Trash2 size={16} />
                                    </button>
                                </motion.div>
                            ))
                        ) : (
                            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem 0', background: '#f8fafc', borderRadius: '16px', border: '2px dashed var(--border)' }}>
                                <Database size={40} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                                <p style={{ fontWeight: 600, margin: '0' }}>No files mapped.</p>
                                <p style={{ fontSize: '0.8rem', margin: '0' }}>Upload documents to populate.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    );

    if (user?.role !== 'admin') {
        return (
            <div className="card" style={{ textAlign: 'center', padding: '10rem', margin: '2rem' }}>
                <Activity size={48} style={{ color: 'var(--danger)', marginBottom: '1.5rem' }} />
                <h2>Access Denied</h2>
                <p style={{ color: 'var(--text-muted)' }}>You do not have administrative privileges to access this area.</p>
                <button className="btn btn-primary" style={{ marginTop: '2rem' }} onClick={() => window.location.href = '/'}>Return Home</button>
            </div>
        );
    }

    return (
        <div className="admin-dashboard-layout">

            {/* Sidebar */}
            <aside className="desk-only" style={{
                width: '190px', background: 'white', borderRight: '1px solid var(--border)',
                display: 'flex', flexDirection: 'column', padding: '0.8rem 0.5rem',
                position: 'sticky', top: '64px', height: 'calc(100vh - 64px)', zIndex: 100
            }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem', flex: 1, marginTop: '1rem' }}>
                    {menuItems.map(item => {
                        return (
                            <button
                                key={item.id}
                                onClick={() => {
                                    setActiveSection(item.id);
                                    if (item.id === 'complaints') {
                                        apiMarkAllNotificationsRead().then(res => {
                                            if (res.success) {
                                                setNotifications(notifications.map(n => ({ ...n, isRead: true })));
                                            }
                                        });
                                    }
                                }}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                                    background: activeSection === item.id ? '#2563eb10' : 'transparent',
                                    color: activeSection === item.id ? 'var(--primary)' : 'var(--text-muted)',
                                    border: 'none', padding: '0.5rem 0.8rem', borderRadius: '8px',
                                    fontWeight: activeSection === item.id ? 700 : 500, cursor: 'pointer',
                                    textAlign: 'left', transition: 'all 0.2s ease', position: 'relative'
                                }}
                            >
                                {cloneElement(item.icon, { size: 16 })}
                                <span style={{ fontSize: '0.8rem' }}>{item.label}</span>
                            </button>
                        );
                    })}
                </div>

                <button onClick={onLogout} className="btn" style={{ background: '#fecaca', color: '#b91c1c', marginTop: 'auto', width: '100%', justifyContent: 'center', padding: '0.4rem', fontSize: '0.75rem', marginBottom: '1.5rem' }}>
                    Logout
                </button>
            </aside>

            {/* Main Content */}
            <main style={{ flex: 1, padding: '1rem 2rem', overflowY: 'auto', minWidth: 0 }}>
                <header style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem' }}>
                    <div>
                        <h1 style={{ fontSize: '2.2rem', fontWeight: 800, letterSpacing: '-0.5px', textTransform: 'capitalize', margin: 0 }}>
                            {activeSection === 'overview' ? `Welcome, ${capitalize(user?.name?.split(' ')[0])}` : activeSection}
                        </h1>
                        <p style={{ color: 'var(--text-muted)', margin: '0.2rem 0 0 0' }}>Managing ASTU campus operations</p>
                    </div>
                </header>

                <AnimatePresence mode="wait">
                    {activeSection === 'overview' && renderOverview()}
                    {activeSection === 'complaints' && renderComplaints()}
                    {activeSection === 'users' && renderUsers()}
                    {activeSection === 'categories' && renderCategories()}
                    {activeSection === 'analytics' && renderAnalytics()}
                    {activeSection === 'announcements' && renderAnnouncements()}
                    {activeSection === 'knowledge-base' && renderKnowledgeBase()}
                    {activeSection === 'settings' && <AdminSettingsView user={user} setUser={setUser} />}

                    {/* Placeholder for other sections */}
                    {!['overview', 'complaints', 'users', 'categories', 'analytics', 'announcements', 'knowledge-base', 'settings'].includes(activeSection) && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card" style={{ textAlign: 'center', padding: '5rem' }}>
                            <Activity size={48} style={{ color: 'var(--primary)', opacity: 0.2, marginBottom: '1.5rem' }} />
                            <h3>Section under management</h3>
                            <p style={{ color: 'var(--text-muted)' }}>The {activeSection} controls are being configured for your department.</p>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Modals for CRUD operations */}
                <AnimatePresence>
                    {showUserModal && (
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="modal-backdrop" onClick={() => setShowUserModal(false)}
                        >
                            <motion.div
                                initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
                                className="card" style={{ width: '400px', padding: '2rem' }} onClick={e => e.stopPropagation()}
                            >
                                <h3 style={{ marginBottom: '1.5rem' }}>{editingEntity ? 'Edit User' : 'Add New User'}</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                                    <input className="input" placeholder="Full Name" value={modalName} onChange={e => setModalName(e.target.value)} disabled={!!editingEntity} style={{ background: editingEntity ? '#f1f5f9' : 'white' }} />
                                    <input className="input" placeholder="Email Address" value={modalEmail} onChange={e => setModalEmail(e.target.value)} disabled={!!editingEntity} style={{ background: editingEntity ? '#f1f5f9' : 'white' }} />
                                    <select
                                        className="input"
                                        value={modalRole}
                                        onChange={(e) => setModalRole(e.target.value)}
                                    >
                                        <option value="student">Student</option>
                                        <option value="staff">Staff</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                    <select className="input" value={modalStatus} onChange={e => setModalStatus(e.target.value)}>
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                    </select>

                                    {/* Staff manual department selection */}
                                    {modalRole === 'staff' && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>Assigned Departments</label>
                                            <div style={{ position: 'relative' }}>
                                                <div
                                                    className="input"
                                                    onClick={() => setShowDeptList(!showDeptList)}
                                                    style={{
                                                        minHeight: '44px', display: 'flex', flexWrap: 'wrap', gap: '6px',
                                                        padding: '8px 40px 8px 12px', background: 'white', borderRadius: '12px',
                                                        border: '1px solid var(--border)', alignItems: 'center', cursor: 'pointer',
                                                        position: 'relative'
                                                    }}
                                                >
                                                    {modalDepts.length > 0 ? (
                                                        modalDepts.map(d => (
                                                            <span key={d} style={{
                                                                background: 'var(--primary)', color: 'white', fontSize: '0.75rem',
                                                                padding: '2px 10px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '4px'
                                                            }}>
                                                                {d}
                                                                <X size={12} style={{ cursor: 'pointer' }} onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setModalDepts(modalDepts.filter(dept => dept !== d));
                                                                }} />
                                                            </span>
                                                        ))
                                                    ) : (
                                                        <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Select departments...</span>
                                                    )}
                                                    <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                                                        {showDeptList ? <X size={18} /> : <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>^</div>}
                                                    </div>
                                                </div>

                                                {showDeptList && (
                                                    <motion.div
                                                        initial={{ opacity: 0, y: -10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        style={{
                                                            position: 'absolute', bottom: '100%', left: 0, right: 0, zIndex: 100,
                                                            marginBottom: '6px', background: 'white', borderRadius: '14px',
                                                            border: '1px solid var(--border)', boxShadow: '0 -20px 25px -5px rgba(0,0,0,0.1)',
                                                            maxHeight: '260px', overflow: 'hidden', display: 'flex', flexDirection: 'column'
                                                        }}
                                                    >
                                                        <div style={{ overflowY: 'auto', padding: '8px', flex: 1 }}>
                                                            {/* Dynamic Categories as Departments */}
                                                            {categories.map((c, idx) => {
                                                                const deptName = c.name;
                                                                const isSelected = modalDepts.includes(deptName);
                                                                return (
                                                                    <div
                                                                        key={`${c._id}-${idx}`}
                                                                        onClick={() => {
                                                                            if (isSelected) setModalDepts(modalDepts.filter(d => d !== deptName));
                                                                            else setModalDepts([...modalDepts, deptName]);
                                                                        }}
                                                                        style={{
                                                                            padding: '10px 14px', borderRadius: '10px', marginBottom: '4px',
                                                                            display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer',
                                                                            background: isSelected ? '#eff6ff' : 'transparent',
                                                                            transition: '0.2s'
                                                                        }}
                                                                    >
                                                                        <div style={{
                                                                            width: '18px', height: '18px', borderRadius: '4px',
                                                                            border: isSelected ? '2px solid var(--primary)' : '2px solid #cbd5e1',
                                                                            background: isSelected ? 'var(--primary)' : 'transparent',
                                                                            display: 'flex', justifyContent: 'center', alignItems: 'center'
                                                                        }}>
                                                                            {isSelected && <Check size={14} color="white" />}
                                                                        </div>
                                                                        <span style={{ fontSize: '0.9rem', fontWeight: isSelected ? 700 : 500 }}>{deptName}</span>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                        <div style={{ borderTop: '1px solid var(--border)', padding: '8px', textAlign: 'right' }}>
                                                            <button
                                                                className="btn btn-primary"
                                                                style={{ width: '100%', fontSize: '0.8rem', padding: '8px' }}
                                                                onClick={() => setShowDeptList(false)}
                                                            >
                                                                Confirm Selection
                                                            </button>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                        <button className="btn glass" style={{ flex: 1 }} onClick={() => setShowUserModal(false)}>Cancel</button>
                                        <motion.button
                                            className="btn btn-primary"
                                            style={{ flex: 2 }}
                                            whileHover={{ y: -3, scale: 1.03, boxShadow: '0 10px 25px -5px rgba(37,99,235,0.4)' }}
                                            whileTap={{ scale: 0.96 }}
                                            transition={{ type: 'spring', stiffness: 300, damping: 18 }}
                                            onClick={() => {
                                                const name = modalName.trim();
                                                const email = modalEmail.trim();
                                                const role = modalRole;
                                                const status = modalStatus;

                                                if (!editingEntity && (!name || !email)) return alert('Name and email are required');

                                                const departments = (role === 'staff') ? modalDepts : [];
                                                const assignedCategories = departments;

                                                if (role === 'staff' && departments.length === 0) return alert('At least one department is required for staff');

                                                const payload = { name, email, role, departments, status, assignedCategories };

                                                if (editingEntity?._id || editingEntity?.id) {
                                                    apiUpdateUser(editingEntity._id || editingEntity.id, payload).then(res => {
                                                        if (res.success) {
                                                            setUsers(users.map(u => (u._id === editingEntity._id || u.id === editingEntity.id) ? res.user : u));
                                                            setShowUserModal(false);
                                                        } else alert(res.message);
                                                    });
                                                } else {
                                                    apiCreateUser(payload).then(res => {
                                                        if (res.success) {
                                                            setUsers([res.user, ...users]);
                                                            setShowUserModal(false);
                                                        } else alert(res.message);
                                                    });
                                                }
                                            }}>{editingEntity ? 'Save Changes' : 'Save User'}</motion.button>
                                    </div>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}

                    {showCategoryModal && (
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="modal-backdrop" onClick={() => setShowCategoryModal(false)}
                        >
                            <motion.div
                                initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
                                className="card" style={{ width: '450px', padding: '2rem' }} onClick={e => e.stopPropagation()}
                            >
                                <h3 style={{ marginBottom: '1.5rem' }}>{editingEntity ? 'Edit Category' : 'Add Category'}</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>Category / Department Name</label>
                                        <input id="catName" className="input" placeholder="e.g. ICT Support" defaultValue={editingEntity?.name} style={{ marginTop: '0.3rem' }} />
                                    </div>
                                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: 0 }}>
                                        * Name will be used for both Category and Department labels.
                                    </p>

                                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                        <button className="btn glass" style={{ flex: 1 }} onClick={() => setShowCategoryModal(false)}>Cancel</button>
                                        <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => {
                                            const name = document.getElementById('catName').value;

                                            if (!name) return alert('Name is required');

                                            const payload = { name };

                                            if (editingEntity?._id) {
                                                apiUpdateCategory(editingEntity._id, payload).then(res => {
                                                    if (res.success) {
                                                        setCategories(categories.map(c => c._id === editingEntity._id ? res.category : c));
                                                        setShowCategoryModal(false);
                                                    }
                                                });
                                            } else {
                                                apiCreateCategory(payload).then(res => {
                                                    if (res.success) {
                                                        setCategories([...categories, res.category]);
                                                        setShowCategoryModal(false);
                                                    }
                                                });
                                            }
                                        }}>Save Category</button>
                                    </div>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}

                    {showComplaintModal && editingEntity && (
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="modal-backdrop" onClick={() => setShowComplaintModal(false)}
                        >
                            <motion.div
                                initial={{ scale: 0.9, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 30 }}
                                className="card" style={{ width: '600px', padding: '2rem', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                    {/* This section was likely intended for the Users view, not Complaint Modal */}
                                    {/* <h3 style={{ margin: 0 }}>System Users</h3>
                                    <button className="btn btn-primary" onClick={() => openUserModal()}>
                                        <UserPlus size={16} /> Add User
                                    </button> */}
                                    <h3 style={{ margin: 0 }}>Ticket Details: {editingEntity.ticketId || editingEntity.id}</h3>
                                    <button className="btn" onClick={() => setShowComplaintModal(false)}><X size={20} /></button>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        <div>
                                            <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.3rem' }}>STUDENT</p>
                                            <p style={{ fontWeight: 600 }}>{editingEntity.studentName || editingEntity.student}</p>
                                        </div>
                                        <div>
                                            <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.3rem' }}>PRIORITY</p>
                                            <span style={{
                                                fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: '4px',
                                                background: editingEntity.priority === 'Critical' ? '#fde8e8' : editingEntity.priority === 'Urgent' ? '#feecdc' : '#f1f5f9',
                                                color: editingEntity.priority === 'Critical' ? '#9b1c1c' : editingEntity.priority === 'Urgent' ? '#9a3412' : '#64748b'
                                            }}>{editingEntity.priority || 'Normal'}</span>
                                        </div>
                                    </div>
                                    <div>
                                        <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.3rem' }}>ISSUE TITLE</p>
                                        <p style={{ fontWeight: 600 }}>{editingEntity.title}</p>
                                    </div>
                                    <div>
                                        <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.3rem' }}>DESCRIPTION</p>
                                        <p style={{ lineHeight: 1.6, background: '#f8fafc', padding: '1rem', borderRadius: '12px' }}>{editingEntity.description}</p>
                                    </div>
                                    <div>
                                        <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.3rem' }}>DEPARTMENT</p>
                                        <select
                                            className="input"
                                            defaultValue={editingEntity.department || editingEntity.category}
                                            onChange={(e) => {
                                                const newDept = e.target.value;
                                                apiUpdateTicketStatus(editingEntity._id || editingEntity.id, { department: newDept, category: newDept }).then(res => {
                                                    if (res.success) {
                                                        setComplaints(complaints.map(t => (t._id === editingEntity._id || t.id === editingEntity.id) ? res.ticket : t));
                                                        setEditingEntity(res.ticket);
                                                    }
                                                    else alert(res.message);
                                                });
                                            }}
                                        >
                                            <option value="">Select Department</option>
                                            {categories.map(c => <option key={c._id} value={c.name}>{c.name}</option>)}
                                        </select>
                                    </div>
                                    {editingEntity.attachments?.length > 0 && (
                                        <div>
                                            <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.8rem' }}>ATTACHMENTS & EVIDENCE</p>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '1rem' }}>
                                                {editingEntity.attachments.map((att, i) => (
                                                    <div key={i} style={{ padding: '0.5rem', background: '#f8fafc', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
                                                        {att.fileType === 'image' ? (
                                                            <div style={{ width: '100%', height: '80px', borderRadius: '8px', marginBottom: '0.5rem', overflow: 'hidden' }}>
                                                                <img src={att.url.startsWith('data:') ? att.url : (att.url.startsWith('http') ? att.url : `${SERVER_URL}${att.url}`)} alt="Evidence" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                            </div>
                                                        ) : (
                                                            <div style={{ width: '100%', height: '80px', background: '#e2e8f0', borderRadius: '8px', marginBottom: '0.5rem', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                                                <FileText size={24} style={{ opacity: 0.3 }} />
                                                            </div>
                                                        )}
                                                        <div style={{ fontSize: '0.7rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '0.4rem' }}>{att.name}</div>
                                                        <button className="btn glass w-full" style={{ padding: '6px', fontSize: '0.75rem', justifyContent: 'center' }} onClick={() => openFile(att.url)}>View Screenshot</button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    <div>
                                        <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>STAFF REMARKS</p>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                                            {editingEntity.remarks && editingEntity.remarks.length > 0 ? editingEntity.remarks.map((r, i) => (
                                                <div key={i} style={{ padding: '1rem', background: '#eff6ff', borderLeft: '3px solid var(--primary)', borderRadius: '0 12px 12px 0', fontSize: '0.9rem' }}>
                                                    <p style={{ margin: 0, fontWeight: 600 }}>{typeof r === 'string' ? r : r.text}</p>
                                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                                                        {r.addedAt ? new Date(r.addedAt).toLocaleDateString() : 'Just now'} • {r.addedByName || 'Staff'}
                                                    </span>
                                                </div>
                                            )) : <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No remarks yet.</p>}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

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
                                        <h3 style={{ margin: 0 }}>Broadcast Details</h3>
                                    </div>
                                    <button className="btn glass" onClick={() => setSelectedAnnouncement(null)}><X size={20} /></button>
                                </div>

                                <div style={{ marginBottom: '1.5rem' }}>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 700, background: 'rgba(37, 99, 235, 0.1)', padding: '6px 16px', borderRadius: '30px', textTransform: 'uppercase' }}>
                                        {selectedAnnouncement.target}
                                    </span>
                                    <h2 style={{ fontSize: '2rem', fontWeight: 900, marginTop: '1rem', letterSpacing: '-1px' }}>{selectedAnnouncement.title}</h2>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '0.5rem' }}>
                                        Posted on {new Date(selectedAnnouncement.createdAt || selectedAnnouncement.date).toLocaleDateString()} at {new Date(selectedAnnouncement.createdAt || selectedAnnouncement.date).toLocaleTimeString()}
                                    </p>
                                </div>

                                <div style={{ background: '#f8fafc', padding: '2rem', borderRadius: '20px', border: '1px solid var(--border)', lineHeight: 1.8, fontSize: '1.1rem', color: 'var(--text-main)', whiteSpace: 'pre-wrap' }}>
                                    {selectedAnnouncement.text || selectedAnnouncement.content}
                                </div>

                                <div style={{ marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
                                    <button className="btn btn-primary" onClick={() => setSelectedAnnouncement(null)} style={{ padding: '0.8rem 2.5rem' }}>Close</button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

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

            <style>{`
                @media (max-width: 1024px) {
                    main { padding: 1.5rem !important; }
                    .admin-charts-grid { grid-template-columns: 1fr !important; }
                    .desk-only { display: none !important; }
                }
            `}</style>
        </div >
    );
};

const AdminSettingsView = ({ user, setUser }) => {
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
        ? (user.profilePicture.startsWith('data:') ? user.profilePicture : `${SERVER_URL}${user.profilePicture}`)
        : null;

    return (
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}>
            <div className="card" style={{ maxWidth: '650px', margin: '0 auto', padding: '3rem' }}>
                <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                    <div style={{ position: 'relative', width: '130px', height: '130px', margin: '0 auto 1.5rem auto' }}>
                        <div style={{
                            width: '100%', height: '100%', borderRadius: '40px', background: '#f8fafc',
                            overflow: 'hidden', border: '4px solid white', boxShadow: '0 12px 24px -6px rgba(0,0,0,0.12)'
                        }}>
                            {profilePhotoUrl ? (
                                <img src={profilePhotoUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                <div style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--primary)', background: '#eff6ff' }}>
                                    <UserIcon size={56} />
                                </div>
                            )}
                        </div>
                        <button
                            onClick={() => profileInputRef.current?.click()}
                            className="btn-primary"
                            style={{ position: 'absolute', bottom: '0', right: '0', width: '44px', height: '44px', borderRadius: '15px', border: '4px solid white', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', boxShadow: '0 8px 12px -3px rgba(0,0,0,0.15)' }}
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
                    <h2 style={{ fontSize: '1.75rem', fontWeight: 900, textTransform: 'capitalize' }}>{user?.name}</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>System Administrator Profile</p>
                </div>

                <form onSubmit={handleInfoUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                        <div>
                            <label style={{ display: 'block', fontWeight: 700, marginBottom: '0.6rem', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Admin Type</label>
                            <div className="input" style={{ padding: '1rem', background: '#f1f5f9', fontWeight: 600, color: 'var(--primary)' }}>SYSTEM ADMIN</div>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontWeight: 700, marginBottom: '0.6rem', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Full Name</label>
                            <div className="input" style={{ padding: '1rem', background: '#f1f5f9', fontWeight: 600, textTransform: 'capitalize' }}>{user?.name}</div>
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontWeight: 700, marginBottom: '0.6rem', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Email Address</label>
                        <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled />
                    </div>

                    {updateMsg && (
                        <div style={{
                            padding: '1rem', borderRadius: '12px', textAlign: 'center', fontWeight: 600,
                            background: updateMsg.includes('success') ? '#f0fdf4' : '#fef2f2',
                            color: updateMsg.includes('success') ? '#15803d' : '#b91c1c'
                        }}>
                            {updateMsg}
                        </div>
                    )}
                </form>

                {/* Change Password Section */}
                <form onSubmit={handleChangePassword} style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem', borderTop: '1px solid var(--border)', paddingTop: '2rem' }}>
                    <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}>Change Password</h4>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Update your admin account password below.</p>
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

export default AdminDashboard;
