import { apiClient } from './apiClient';
import { API_ENDPOINTS } from './config';

export const authService = {
    async login(email, password) {
        try {
            const response = await apiClient.post(API_ENDPOINTS.auth.login, {
                email,
                password,
            });
            return response.data.user;
        } catch (error) {
            if (error.response) {
                const message = error.response.data?.error?.message || 'Login failed';
                throw new Error(message);
            }
            throw new Error('Network error');
        }
    },

    async register(userData) {
        try {
            const response = await apiClient.post(API_ENDPOINTS.auth.register, userData);
            return response.data.user;
        } catch (error) {
            if (error.response) {
                const message = error.response.data?.error?.message || 'Registration failed';
                throw new Error(message);
            }
            throw new Error('Network error');
        }
    },

    async logout() {
        try {
            await apiClient.post(API_ENDPOINTS.auth.logout);
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            localStorage.removeItem('user');
        }
    },

    async getProfile() {
        try {
            const response = await apiClient.get(API_ENDPOINTS.auth.profile);
            if (response.data.user) {
                localStorage.setItem('user', JSON.stringify(response.data.user));
            }
            return response.data.user;
        } catch (error) {
            console.error('Get profile error:', error);
            throw error;
        }
    },

    async updateProfile(userData) {
        try {
            const response = await apiClient.put(API_ENDPOINTS.auth.profile, userData);
            if (response.data.user) {
                localStorage.setItem('user', JSON.stringify(response.data.user));
            }
            return response.data.user;
        } catch (error) {
            console.error('Update profile error:', error);
            throw error;
        }
    },

    isAuthenticated() {
        return !!this.getProfile();
    },
};