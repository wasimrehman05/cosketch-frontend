import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import Cookies from 'js-cookie';
import apiService from '../services/api';

const AppContext = createContext();

export const useAppContext = () => {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useAppContext must be used within an AppProvider');
    }
    return context;
};

export const AppProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);

    const fetchUserProfile = useCallback(async (token) => {
        try {
            const result = await apiService.getProfile(token);

            if (result.success) {
                const { user: userData } = result.data;
                setUser(userData);
                setIsAuthenticated(true);
            } else {
                logout();
            }
        } catch (error) {
            console.error('Error fetching user profile:', error);
            logout();
        } finally {
            setLoading(false);
        }
        // eslint-disable-next-line
    }, []);

    const checkAuthStatus = useCallback(async () => {
        const token = Cookies.get('token');
        if (token) {
            await fetchUserProfile(token);
        } else {
            setLoading(false);
        }
    }, [fetchUserProfile]);

    useEffect(() => {
        checkAuthStatus();
        // eslint-disable-next-line
    }, []);

    const logout = useCallback(() => {
        Cookies.remove('token');
        setUser(null);
        setIsAuthenticated(false);
    }, []);

    const login = async (email, password) => {
        try {
            const result = await apiService.login(email, password);

            if (result.success) {
                const { accessToken } = result.data;
                Cookies.set('token', accessToken, { expires: 1 });
                setIsAuthenticated(true);
                fetchUserProfile(accessToken);
                return { success: true };
            } else {
                return { success: false, error: result.message || 'Login failed' };
            }
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, error: 'Network error' };
        }
    };

    const register = async (name, email, password) => {
        try {
            const result = await apiService.register(name, email, password);

            if (result.success) {
                const { accessToken, user: userData } = result.data;
                Cookies.set('token', accessToken, { expires: 1 });
                setUser(userData);
                setIsAuthenticated(true);
                return { success: true };
            } else {
                return { success: false, error: result.message || 'Registration failed' };
            }
        } catch (error) {
            console.error('Registration error:', error);
            return { success: false, error: 'Network error' };
        }
    };

    const value = {
        user,
        isAuthenticated,
        loading,
        login,
        register,
        logout,
        checkAuthStatus,
    };

    return (
        <AppContext.Provider value={value}>
            {children}
        </AppContext.Provider>
    );
}; 