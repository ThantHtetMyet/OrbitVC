const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://localhost:7003/api';

/**
 * API Service for handling all HTTP requests to the backend
 */
class ApiService {
    constructor() {
        this.baseUrl = API_BASE_URL;
    }

    /**
     * Get authorization headers with token if available
     */
    getHeaders() {
        const headers = {
            'Content-Type': 'application/json',
        };

        const token = localStorage.getItem('authToken');
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        return headers;
    }

    /**
     * Handle API response
     */
    async handleResponse(response) {
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'An error occurred');
        }

        return data;
    }

    /**
     * Make a GET request
     */
    async get(endpoint) {
        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                method: 'GET',
                headers: this.getHeaders(),
                credentials: 'include',
            });

            return await this.handleResponse(response);
        } catch (error) {
            console.error('GET request failed:', error);
            throw error;
        }
    }

    /**
     * Make a POST request
     */
    async post(endpoint, data) {
        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                method: 'POST',
                headers: this.getHeaders(),
                credentials: 'include',
                body: JSON.stringify(data),
            });

            return await this.handleResponse(response);
        } catch (error) {
            console.error('POST request failed:', error);
            throw error;
        }
    }

    /**
     * Make a PUT request
     */
    async put(endpoint, data) {
        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                method: 'PUT',
                headers: this.getHeaders(),
                credentials: 'include',
                body: JSON.stringify(data),
            });

            return await this.handleResponse(response);
        } catch (error) {
            console.error('PUT request failed:', error);
            throw error;
        }
    }

    /**
     * Make a DELETE request
     */
    async delete(endpoint) {
        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                method: 'DELETE',
                headers: this.getHeaders(),
                credentials: 'include',
            });

            return await this.handleResponse(response);
        } catch (error) {
            console.error('DELETE request failed:', error);
            throw error;
        }
    }

    // ============================================
    // Auth API Methods
    // ============================================

    /**
     * Login user
     */
    async login(userId, password) {
        const response = await this.post('/Auth/login', { userId, password });

        if (response.success && response.token) {
            localStorage.setItem('authToken', response.token);
            localStorage.setItem('user', JSON.stringify(response.user));
        }

        return response;
    }

    /**
     * Sign up new user
     */
    async signUp(userData) {
        const response = await this.post('/Auth/signup', userData);

        if (response.success && response.token) {
            localStorage.setItem('authToken', response.token);
            localStorage.setItem('user', JSON.stringify(response.user));
        }

        return response;
    }

    /**
     * Request password reset
     */
    async forgotPassword(userId) {
        return await this.post('/Auth/forgot-password', { userId });
    }

    /**
     * Request UserID retrieval
     */
    async forgotUserID(emailOrMobile) {
        return await this.post('/Auth/forgot-userid', { emailOrMobile });
    }

    /**
     * Reset password with token
     */
    async resetPassword(email, token, newPassword, confirmPassword) {
        return await this.post('/Auth/reset-password', {
            email,
            token,
            newPassword,
            confirmPassword,
        });
    }

    /**
     * Get all user roles
     */
    async getUserRoles() {
        return await this.get('/UserRole');
    }

    /**
     * Logout user
     */
    logout() {
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
    }

    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        return !!localStorage.getItem('authToken');
    }

    /**
     * Get current user
     */
    getCurrentUser() {
        const user = localStorage.getItem('user');
        return user ? JSON.parse(user) : null;
    }
}

const apiService = new ApiService();
export default apiService;
