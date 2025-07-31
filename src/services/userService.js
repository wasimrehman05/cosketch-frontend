const API_BASE_URL = 'http://localhost:3001/api/v1';


class UserService {
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
                ...data, // Spread the response data directly
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

    // Auth methods
    async login(email, password) {
        return this.request('/user/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });
    }

    async register(name, email, password) {
        return this.request('/user/register', {
            method: 'POST',
            body: JSON.stringify({ name, email, password }),
        });
    }

    async getProfile(token) {
        return this.request('/user/profile', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });
    }
}

const userService = new UserService();
export default userService; 