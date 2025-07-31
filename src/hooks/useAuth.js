import { useAppContext } from '../context/AppContext';

/**
 * Custom hook to access authentication data
 * @returns {Object} Authentication data including user, token, and auth status
 */
export const useAuth = () => {
  const context = useAppContext();
  
  return {
    user: context.user,
    token: context.token,
    isAuthenticated: context.isAuthenticated,
    loading: context.loading,
    login: context.login,
    register: context.register,
    logout: context.logout,
    checkAuthStatus: context.checkAuthStatus,
  };
};

/**
 * Custom hook to get just the token
 * @returns {string|null} The current authentication token
 */
export const useToken = () => {
  const { token } = useAuth();
  return token;
};

/**
 * Custom hook to check if user is authenticated
 * @returns {boolean} True if user is authenticated
 */
export const useIsAuthenticated = () => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated;
}; 