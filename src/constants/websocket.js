// WebSocket Configuration
export const WEBSOCKET = {
    // Server URL
    SERVER_URL: 'http://localhost:3001',
    
    // Connection settings
    RECONNECTION_ATTEMPTS: 5,
    RECONNECTION_DELAY: 1000,
    CONNECTION_TIMEOUT: 20000,
    
    // Event names
    EVENTS: {
        // Connection events
        CONNECT: 'connect',
        DISCONNECT: 'disconnect',
        CONNECT_ERROR: 'connect_error',
        ERROR: 'error',
        CONNECTION_STATUS: 'connection-status',
        
        // Canvas events
        JOIN_CANVAS: 'join-canvas',
        CANVAS_JOINED: 'canvas-joined',
        CANVAS_UPDATE: 'canvas-update',
        CANVAS_UPDATED: 'canvas-updated',
        CANVAS_NAME_UPDATE: 'canvas-name-update',
        CANVAS_NAME_UPDATED: 'canvas-name-updated',
        
        // Element events
        ELEMENT_CREATE: 'element-create',
        ELEMENT_CREATED: 'element-created',
        ELEMENT_UPDATE: 'element-update',
        ELEMENT_UPDATED: 'element-updated',
        ELEMENT_DELETE: 'element-delete',
        ELEMENT_DELETED: 'element-deleted',
        
        // User events
        USER_JOINED: 'user-joined',
        USER_LEFT: 'user-left',
        ROOM_USERS: 'room-users',
        
        // Cursor events
        CURSOR_UPDATE: 'cursor-update',
        CURSOR_UPDATED: 'cursor-updated'
    },
    
    // Brush throttling
    BRUSH_THROTTLE_INTERVAL: 5, // Update every 5 points
    
    // Error messages
    ERRORS: {
        CONNECTION_FAILED: 'Failed to connect to server',
        DISCONNECTED: 'Disconnected from server',
        AUTHENTICATION_FAILED: 'Authentication failed',
        CANVAS_ACCESS_DENIED: 'Access denied to canvas',
        ELEMENT_UPDATE_FAILED: 'Failed to update element',
        ELEMENT_CREATE_FAILED: 'Failed to create element',
        ELEMENT_DELETE_FAILED: 'Failed to delete element'
    }
};

// Connection status
export const CONNECTION_STATUS = {
    CONNECTED: 'connected',
    DISCONNECTED: 'disconnected',
    CONNECTING: 'connecting',
    ERROR: 'error'
}; 