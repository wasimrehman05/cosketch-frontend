const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api/v1';

class CanvasService {
    constructor() {
        this.baseURL = API_BASE_URL;
    }

    // Generic request method
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
            credentials: 'include',
            ...options,
        };

        try {
            const response = await fetch(url, config);
            const data = await response.json();
            
            return {
                success: response.ok,
                ...data,
                status: response.status,
            };
        } catch (error) {
            console.error('API request failed:', error);
            return {
                success: false,
                error: 'Network error',
                status: 0,
            };
        }
    }

    async getAllCanvas(token) {
        return this.request('/canvas', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });
    }

    async createCanvas(token, canvasData) {
        return this.request('/canvas', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(canvasData || {}),
        });
    }

    async getCanvasById(token, canvasId) {
        return this.request(`/canvas/${canvasId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });
    }

    async updateCanvas(token, canvasId, canvasData) {
        return this.request(`/canvas/${canvasId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(canvasData || {}),
        });
    }

    async deleteCanvas(token, canvasId) {   
        return this.request(`/canvas/${canvasId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });
    }

    async shareCanvas(token, canvasId, shareData) {
        return this.request(`/canvas/${canvasId}/share`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(shareData),
        });
    }

    async removeShare(token, canvasId, userId) {
        return this.request(`/canvas/${canvasId}/share/${userId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });
    }

    async updateSharePermission(token, canvasId, userId, canEdit) {
        return this.request(`/canvas/${canvasId}/share/${userId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ canEdit }),
        });
    }
}

const canvasService = new CanvasService();
export default canvasService; 