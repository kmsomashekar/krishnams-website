/**
 * Same-Origin API Client Infrastructure
 */
export const API = {
    async request(endpoint, options = {}) {
        const defaultHeaders = {
            'Content-Type': 'application/json'
        };

        const config = {
            ...options,
            headers: {
                ...defaultHeaders,
                ...options.headers
            }
        };

        try {
            const response = await fetch(`/api/v1${endpoint}`, config);
            const result = await response.json();
            
            if (!response.ok || !result.success) {
                throw new Error(result.error?.message || 'API transactional error encountered');
            }
            
            return result.data;
        } catch (error) {
            console.error(`[API Error] Path /api/v1${endpoint}:`, error);
            throw error;
        }
    },

    async checkHealth() {
        return this.request('/health', { method: 'GET' });
    }
};