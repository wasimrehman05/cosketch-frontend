import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import Cookies from 'js-cookie';
import userService from '../services/userService';

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
    const [token, setToken] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);

    const fetchUserProfile = useCallback(async (authToken) => {
        try {
            const result = await userService.getProfile(authToken);

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
        const storedToken = Cookies.get('token');
        if (storedToken) {
            setToken(storedToken);
            await fetchUserProfile(storedToken);
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
        setToken(null);
        setUser(null);
        setIsAuthenticated(false);
    }, []);

    const login = async (email, password) => {
        try {
            const result = await userService.login(email, password);

            if (result.success) {
                const { accessToken } = result.data;
                Cookies.set('token', accessToken, { expires: 1 });
                setToken(accessToken);
                fetchUserProfile(accessToken);
                setIsAuthenticated(true);
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
            const result = await userService.register(name, email, password);

            if (result.success) {
                const { accessToken, user: userData } = result.data;
                Cookies.set('token', accessToken, { expires: 1 });
                setToken(accessToken);
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
        token,
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