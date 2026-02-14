// LUVY Platform - API Helper
// Central API configuration for all backend calls

const API_BASE = 'http://localhost:8080/api';

// Get JWT token from localStorage
function getToken() {
    return localStorage.getItem('token');
}

// API Helper Object
const API = {
    // ==========================================
    // AUTH
    // ==========================================
    async register(name, email, password) {
        const response = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({name, email, password})
        });
        if (!response.ok) throw new Error('Registration failed');
        return await response.json();
    },

    async login(email, password) {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({email, password})
        });
        if (!response.ok) throw new Error('Login failed');
        
        const data = await response.json();
        if (data.token) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
        }
        return data;
    },

    // ==========================================
    // USER
    // ==========================================
    async getProfile() {
        const response = await fetch(`${API_BASE}/user/profile`, {
            headers: {'Authorization': `Bearer ${getToken()}`}
        });
        if (!response.ok) throw new Error('Failed to get profile');
        return await response.json();
    },

    async updateProfile(name, email, phone) {
        const response = await fetch(`${API_BASE}/user/profile`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getToken()}`
            },
            body: JSON.stringify({name, email, phone})
        });
        if (!response.ok) throw new Error('Failed to update profile');
        return await response.json();
    },

    async getBalance() {
        const response = await fetch(`${API_BASE}/user/balance`, {
            headers: {'Authorization': `Bearer ${getToken()}`}
        });
        if (!response.ok) throw new Error('Failed to get balance');
        return await response.json();
    },

    // ==========================================
    // RECEIPTS
    // ==========================================
    async submitReceipt(merchant, category, amount, receiptDate, imageUrl = '') {
        const response = await fetch(`${API_BASE}/receipts/submit`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getToken()}`
            },
            body: JSON.stringify({
                merchant,
                category,
                amount: parseFloat(amount),
                receipt_date: receiptDate,
                image_url: imageUrl
            })
        });
        if (!response.ok) throw new Error('Failed to submit receipt');
        return await response.json();
    },

    async getReceipts() {
        const response = await fetch(`${API_BASE}/receipts`, {
            headers: {'Authorization': `Bearer ${getToken()}`}
        });
        if (!response.ok) throw new Error('Failed to get receipts');
        return await response.json();
    },

    async getReceiptStats() {
        const response = await fetch(`${API_BASE}/receipts/stats`, {
            headers: {'Authorization': `Bearer ${getToken()}`}
        });
        if (!response.ok) throw new Error('Failed to get stats');
        return await response.json();
    },

    async deleteReceipt(id) {
        const response = await fetch(`${API_BASE}/receipts/${id}`, {
            method: 'DELETE',
            headers: {'Authorization': `Bearer ${getToken()}`}
        });
        if (!response.ok) throw new Error('Failed to delete receipt');
        return await response.json();
    },

    // ==========================================
    // ANALYTICS
    // ==========================================
    async getAnalyticsOverview() {
        const response = await fetch(`${API_BASE}/analytics/overview`, {
            headers: {'Authorization': `Bearer ${getToken()}`}
        });
        if (!response.ok) throw new Error('Failed to get analytics');
        return await response.json();
    },

    async getSpending() {
        const response = await fetch(`${API_BASE}/analytics/spending`, {
            headers: {'Authorization': `Bearer ${getToken()}`}
        });
        if (!response.ok) throw new Error('Failed to get spending data');
        return await response.json();
    },

    async getCategories() {
        const response = await fetch(`${API_BASE}/analytics/categories`, {
            headers: {'Authorization': `Bearer ${getToken()}`}
        });
        if (!response.ok) throw new Error('Failed to get categories');
        return await response.json();
    },

    async getTopMerchants() {
        const response = await fetch(`${API_BASE}/analytics/merchants`, {
            headers: {'Authorization': `Bearer ${getToken()}`}
        });
        if (!response.ok) throw new Error('Failed to get merchants');
        return await response.json();
    },

    // ==========================================
    // ADMIN
    // ==========================================
    async getAdminDashboard() {
        const response = await fetch(`${API_BASE}/admin/dashboard`, {
            headers: {'Authorization': `Bearer ${getToken()}`}
        });
        if (!response.ok) throw new Error('Failed to get admin dashboard');
        return await response.json();
    },

    async getAdminUsers() {
        const response = await fetch(`${API_BASE}/admin/users`, {
            headers: {'Authorization': `Bearer ${getToken()}`}
        });
        if (!response.ok) throw new Error('Failed to get users');
        return await response.json();
    },

    async getAdminRevenue() {
        const response = await fetch(`${API_BASE}/admin/revenue`, {
            headers: {'Authorization': `Bearer ${getToken()}`}
        });
        if (!response.ok) throw new Error('Failed to get revenue');
        return await response.json();
    },

    // ==========================================
    // PUBLIC
    // ==========================================
    async getMerchants() {
        const response = await fetch(`${API_BASE}/merchants`);
        if (!response.ok) throw new Error('Failed to get merchants');
        return await response.json();
    }
};

// Helper: Check if user is logged in
function isLoggedIn() {
    return !!getToken();
}

// Helper: Logout
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login.html';
}
