import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Проверяем, авторизован ли пользователь
        checkAuth();
    }, []);

    const checkAuth = async () => {
        try {
            const response = await api.get('/api/profile');
            setUser(response.data.user);
        } catch (error) {
            // Если не авторизован, user останется null
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    const login = async (email, password) => {
        try {
            const response = await api.post('/api/login', { email, password });
            const { user } = response.data;

            // Куки установятся автоматически сервером (httpOnly)
            setUser(user);

            return { success: true };
        } catch (error) {
            return { success: false, error: error.response?.data?.error || 'Login failed' };
        }
    };

    const register = async (email, password, firstName, lastName) => {
        try {
            const response = await api.post('/api/register', {
                email,
                password,
                first_name: firstName,
                last_name: lastName
            });
            const { user } = response.data;

            setUser(user);

            return { success: true };
        } catch (error) {
            return { success: false, error: error.response?.data?.error || 'Registration failed' };
        }
    };

    const logout = async () => {
        try {
            // Отправляем запрос на сервер для очистки кук
            await api.post('/api/logout');
        } catch (error) {
            // Игнорируем ошибки при логауте
        } finally {
            setUser(null);
        }
    };

    const updateProfile = async (firstName, lastName) => {
        try {
            const response = await api.put('/api/profile', {
                first_name: firstName,
                last_name: lastName
            });
            const updatedUser = { ...user, ...response.data.user };
            setUser(updatedUser);

            return { success: true };
        } catch (error) {
            return { success: false, error: error.response?.data?.error || 'Update failed' };
        }
    };

    return (
        <AuthContext.Provider value={{
            user,
            login,
            register,
            logout,
            updateProfile,
            loading
        }}>
            {children}
        </AuthContext.Provider>
    );
};