// Central API base URL — easy to change for deployment
export const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000';
const API_BASE = `${SERVER_URL}/api`;

// Helper: get auth headers
const authHeaders = () => {
    const token = localStorage.getItem('astu_token');
    return {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
    };
};

// Auth
export const apiSignup = (data) =>
    fetch(`${API_BASE}/auth/signup`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json());

export const apiLogin = (data) =>
    fetch(`${API_BASE}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json());

export const apiGoogleLogin = (idToken) =>
    fetch(`${API_BASE}/auth/google`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken }) }).then(r => r.json());

export const apiUpdateProfile = (data) => {
    const token = localStorage.getItem('astu_token');
    const isFormData = data instanceof FormData;
    return fetch(`${API_BASE}/auth/profile`, {
        method: 'PUT',
        headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(isFormData ? {} : { 'Content-Type': 'application/json' })
        },
        body: isFormData ? data : JSON.stringify(data)
    }).then(r => r.json());
};

export const apiChangePassword = (data) =>
    fetch(`${API_BASE}/auth/change-password`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(data) }).then(r => r.json());


export const apiCreateTicket = (formData) => {
    const token = localStorage.getItem('astu_token');
    return fetch(`${API_BASE}/tickets`, {
        method: 'POST',
        headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: formData
    }).then(r => r.json());
};

export const apiGetMyTickets = () =>
    fetch(`${API_BASE}/tickets/my`, { headers: authHeaders() }).then(r => r.json());

// Tickets — Staff
export const apiGetDepartmentTickets = () =>
    fetch(`${API_BASE}/tickets/department`, { headers: authHeaders() }).then(r => r.json());

export const apiUpdateTicketStatus = (id, data) =>
    fetch(`${API_BASE}/tickets/${id}/status`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(data) }).then(r => r.json());

export const apiAddRemark = (id, text) =>
    fetch(`${API_BASE}/tickets/${id}/remarks`, { method: 'POST', headers: authHeaders(), body: JSON.stringify({ text }) }).then(r => r.json());

export const apiUpdateRemark = (id, remarkId, text) =>
    fetch(`${API_BASE}/tickets/${id}/remarks/${remarkId}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify({ text }) }).then(r => r.json());

// Tickets — Admin
export const apiGetAllTickets = (params = '') =>
    fetch(`${API_BASE}/tickets?${params}`, { headers: authHeaders() }).then(r => r.json());

export const apiDeleteTicket = (id) =>
    fetch(`${API_BASE}/tickets/${id}`, { method: 'DELETE', headers: authHeaders() }).then(r => r.json());

// Admin — Stats
export const apiGetAdminStats = () =>
    fetch(`${API_BASE}/admin/stats`, { headers: authHeaders() }).then(r => r.json());

// Admin — Users
export const apiGetAllUsers = (search = '') =>
    fetch(`${API_BASE}/admin/users?search=${search}`, { headers: authHeaders() }).then(r => r.json());

export const apiCreateUser = (data) =>
    fetch(`${API_BASE}/admin/users`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(data) }).then(r => r.json());

export const apiUpdateUser = (id, data) =>
    fetch(`${API_BASE}/admin/users/${id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(data) }).then(r => r.json());

export const apiDeleteUser = (id) =>
    fetch(`${API_BASE}/admin/users/${id}`, { method: 'DELETE', headers: authHeaders() }).then(r => r.json());

// Admin — Categories
export const apiGetCategories = () =>
    fetch(`${API_BASE}/admin/categories`, { headers: authHeaders() }).then(r => r.json());

export const apiCreateCategory = (data) =>
    fetch(`${API_BASE}/admin/categories`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(data) }).then(r => r.json());

export const apiUpdateCategory = (id, data) =>
    fetch(`${API_BASE}/admin/categories/${id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(data) }).then(r => r.json());

export const apiDeleteCategory = (id) =>
    fetch(`${API_BASE}/admin/categories/${id}`, { method: 'DELETE', headers: authHeaders() }).then(r => r.json());

// Admin — Announcements
export const apiGetAnnouncements = () =>
    fetch(`${API_BASE}/admin/announcements`, { headers: authHeaders() }).then(r => r.json());

export const apiCreateAnnouncement = (data) =>
    fetch(`${API_BASE}/admin/announcements`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(data) }).then(r => r.json());

export const apiDeleteAnnouncement = (id) =>
    fetch(`${API_BASE}/admin/announcements/${id}`, { method: 'DELETE', headers: authHeaders() }).then(r => r.json());

// Notifications
export const apiGetNotifications = () =>
    fetch(`${API_BASE}/notifications`, { headers: authHeaders() }).then(r => r.json());

export const apiMarkNotificationRead = (id) =>
    fetch(`${API_BASE}/notifications/${id}/read`, { method: 'PUT', headers: authHeaders() }).then(r => r.json());

export const apiMarkAllNotificationsRead = () =>
    fetch(`${API_BASE}/notifications/read-all`, { method: 'PUT', headers: authHeaders() }).then(r => r.json());

export const apiDeleteNotification = (id) =>
    fetch(`${API_BASE}/notifications/${id}`, { method: 'DELETE', headers: authHeaders() }).then(r => r.json());

export const apiDeleteProfilePicture = () =>
    fetch(`${API_BASE}/auth/profile/image`, { method: 'DELETE', headers: authHeaders() }).then(r => r.json());

// Chatbot
export const apiGetChats = () =>
    fetch(`${API_BASE}/chat`, { headers: authHeaders() }).then(r => r.json());

export const apiDeleteChat = (id) =>
    fetch(`${API_BASE}/chat/${id}`, { method: 'DELETE', headers: authHeaders() }).then(r => r.json());

export const apiSendMessage = (data) =>
    fetch(`${API_BASE}/chat`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(data) }).then(r => r.json());

// Admin — RAG
export const apiUploadKnowledgeBase = (formData) => {
    const token = localStorage.getItem('astu_token');
    return fetch(`${API_BASE}/admin/rag/upload`, {
        method: 'POST',
        headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: formData
    }).then(r => r.json());
};

export const apiGetKnowledgeBaseFiles = () =>
    fetch(`${API_BASE}/admin/rag/files`, { headers: authHeaders() }).then(r => r.json());

export const apiDeleteKnowledgeBaseFile = (filename) =>
    fetch(`${API_BASE}/admin/rag/files/${encodeURIComponent(filename)}`, { method: 'DELETE', headers: authHeaders() }).then(r => r.json());

// For streaming
export const apiSendMessageStream = (data) => {
    const token = localStorage.getItem('astu_token');
    return fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(data)
    });
};
