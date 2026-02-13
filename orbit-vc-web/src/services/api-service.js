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
        // Handle 204 No Content responses (empty body)
        if (response.status === 204) {
            if (!response.ok) {
                throw new Error('An error occurred');
            }
            return null;
        }

        const text = await response.text();
        const data = text ? JSON.parse(text) : null;

        if (!response.ok) {
            throw new Error(data?.message || 'An error occurred');
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

    // ============================================
    // Device API Methods
    // ============================================

    /**
     * Get all devices
     */
    async getDevices() {
        return await this.get('/Device');
    }

    /**
     * Get devices with pagination
     */
    async getDevicesPaged(page = 1, pageSize = 10, search = '') {
        let endpoint = `/Device/paged?page=${page}&pageSize=${pageSize}`;
        if (search) {
            endpoint += `&search=${encodeURIComponent(search)}`;
        }
        return await this.get(endpoint);
    }

    /**
     * Get device by ID
     */
    async getDeviceById(id) {
        return await this.get(`/Device/${id}`);
    }

    /**
     * Get monitored files for a device
     */
    async getDeviceMonitoredFiles(id) {
        return await this.get(`/Device/${id}/monitored-files`);
    }

    /**
     * Get unique directories for a device
     */
    async getDeviceDirectories(id) {
        return await this.get(`/Device/${id}/directories`);
    }

    /**
     * Create a new device
     */
    async createDevice(deviceData) {
        return await this.post('/Device', deviceData);
    }

    /**
     * Update an existing device
     */
    async updateDevice(id, deviceData) {
        return await this.put(`/Device/${id}`, deviceData);
    }

    /**
     * Delete a device
     */
    async deleteDevice(id) {
        return await this.delete(`/Device/${id}`);
    }

    // ============================================
    // Device Lookup API Methods
    // ============================================

    /**
     * Get all OS types
     */
    async getOSTypes() {
        return await this.get('/Device/lookup/os-types');
    }

    /**
     * Get all device types
     */
    async getDeviceTypes() {
        return await this.get('/Device/lookup/device-types');
    }

    /**
     * Get all connection types
     */
    async getConnectionTypes() {
        return await this.get('/Device/lookup/connection-types');
    }

    /**
     * Get all IP address types
     */
    async getIPAddressTypes() {
        return await this.get('/Device/lookup/ip-address-types');
    }

    // ============================================
    // FileControl API Methods (Monitored Directories & Files)
    // ============================================





    /**
     * Get monitored file by ID
     */
    async getMonitoredFileById(id) {
        return await this.get(`/FileControl/files/${id}`);
    }

    /**
     * Get monitored file versions by file ID
     */
    async getMonitoredFileVersions(id) {
        return await this.get(`/FileControl/files/${id}/versions`);
    }

    /**
     * Get a specific file version by version ID
     */
    async getFileVersionById(versionId) {
        return await this.get(`/FileControl/versions/${versionId}`);
    }

    /**
     * Get change history for a specific version
     */
    async getChangeHistoryByVersionId(versionId) {
        return await this.get(`/FileControl/versions/${versionId}/change-history`);
    }

    /**
     * Get a specific change history by ID
     */
    async getChangeHistoryById(id) {
        return await this.get(`/FileControl/change-history/${id}`);
    }

    /**
     * Download a version file
     */
    async downloadVersionFile(versionId) {
        const token = localStorage.getItem('authToken');
        const headers = {};
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        const response = await fetch(`${this.baseUrl}/FileControl/versions/${versionId}/download`, { headers });
        if (!response.ok) throw new Error('Download failed');
        return response.blob();
    }

    /**
     * Download a change history file
     */
    async downloadChangeHistoryFile(id) {
        const token = localStorage.getItem('authToken');
        const headers = {};
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        const response = await fetch(`${this.baseUrl}/FileControl/change-history/${id}/download`, { headers });
        if (!response.ok) throw new Error('Download failed');
        return response.blob();
    }

    /**
     * Upload a new version for a monitored file
     */
    async uploadMonitoredFileVersion(fileId, file, fileName, directoryPath) {
        const formData = new FormData();
        formData.append('file', file);
        if (fileName) formData.append('fileName', fileName);
        if (directoryPath) formData.append('directoryPath', directoryPath);

        try {
            const token = localStorage.getItem('authToken');
            const headers = {};
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch(`${this.baseUrl}/FileControl/files/${fileId}/versions`, {
                method: 'POST',
                headers: headers,
                body: formData
            });

            return await this.handleResponse(response);
        } catch (error) {
            console.error('Upload file version failed:', error);
            throw error;
        }
    }

    /**
     * Create a new monitored file
     */
    async createMonitoredFile(fileData) {
        return await this.post('/FileControl/files', fileData);
    }

    /**
     * Update a monitored file
     */
    async updateMonitoredFile(fileData) {
        return await this.put('/FileControl/files', fileData);
    }

    /**
     * Delete a monitored file
     */
    async deleteMonitoredFile(id) {
        return await this.delete(`/FileControl/files/${id}`);
    }

    // ============================================
    // Alert API Methods
    // ============================================

    /**
     * Get all monitored file alerts
     */
    async getAllAlerts() {
        return await this.get('/FileControl/alerts');
    }

    /**
     * Acknowledge an alert
     */
    async acknowledgeAlert(id, acknowledgedBy) {
        return await this.put(`/FileControl/alerts/${id}/acknowledge?acknowledgedBy=${encodeURIComponent(acknowledgedBy)}`, {});
    }

    /**
     * Clear an alert
     */
    async clearAlert(id, clearedBy) {
        return await this.put(`/FileControl/alerts/${id}/clear?clearedBy=${encodeURIComponent(clearedBy)}`, {});
    }

    /**
     * Restore a file version to its original location
     */
    async restoreFileVersion(versionId) {
        return await this.post(`/FileControl/versions/${versionId}/restore`, {});
    }
}

const apiService = new ApiService();
export default apiService;
