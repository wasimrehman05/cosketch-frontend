import { io } from 'socket.io-client';
import { WEBSOCKET } from '../constants/websocket';

class WebSocketService {
    constructor() {
        this.socket = null;
        this.isConnected = false;
        this.canvasId = null;
        this.token = null;
        this.eventHandlers = new Map();
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = WEBSOCKET.RECONNECTION_ATTEMPTS;
        this.reconnectDelay = WEBSOCKET.RECONNECTION_DELAY;
    }

    connect(token, canvasId) {
        if (this.socket && this.isConnected) {
            this.disconnect();
        }

        this.token = token;
        this.canvasId = canvasId;



        this.socket = io(WEBSOCKET.SERVER_URL, {
            auth: { token },
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: this.maxReconnectAttempts,
            reconnectionDelay: this.reconnectDelay,
            timeout: WEBSOCKET.CONNECTION_TIMEOUT
        });

        this.setupEventHandlers();
    }

    setupEventHandlers() {
        this.socket.on(WEBSOCKET.EVENTS.CONNECT, () => {
            this.isConnected = true;
            this.reconnectAttempts = 0;
            
            // Emit connection status change
            this.emit(WEBSOCKET.EVENTS.CONNECTION_STATUS, { isConnected: true });
            
            // Join canvas room after connection
            if (this.canvasId) {
                this.joinCanvas(this.canvasId);
            }
        });

        this.socket.on(WEBSOCKET.EVENTS.DISCONNECT, (reason) => {
            this.isConnected = false;
            
            // Emit connection status change
            this.emit(WEBSOCKET.EVENTS.CONNECTION_STATUS, { isConnected: false });
            
            if (reason === 'io server disconnect') {
                // Server disconnected us, try to reconnect
                this.socket.connect();
            }
        });

        this.socket.on(WEBSOCKET.EVENTS.CONNECT_ERROR, (error) => {
            console.error('WebSocket connection error:', error);
            this.isConnected = false;
            
            // Emit connection status change
            this.emit(WEBSOCKET.EVENTS.CONNECTION_STATUS, { isConnected: false });
        });

        this.socket.on(WEBSOCKET.EVENTS.ERROR, (error) => {
            console.error('WebSocket error:', error);
            this.emit('error', error);
        });

        // Canvas events
        this.socket.on(WEBSOCKET.EVENTS.CANVAS_JOINED, (data) => {
            this.emit(WEBSOCKET.EVENTS.CANVAS_JOINED, data);
        });

        this.socket.on(WEBSOCKET.EVENTS.CANVAS_UPDATED, (data) => {
            this.emit(WEBSOCKET.EVENTS.CANVAS_UPDATED, data);
        });

        this.socket.on(WEBSOCKET.EVENTS.CANVAS_NAME_UPDATED, (data) => {
            this.emit(WEBSOCKET.EVENTS.CANVAS_NAME_UPDATED, data);
        });

        // Element events
        this.socket.on(WEBSOCKET.EVENTS.ELEMENT_CREATED, (data) => {
            this.emit(WEBSOCKET.EVENTS.ELEMENT_CREATED, data);
        });

        this.socket.on(WEBSOCKET.EVENTS.ELEMENT_UPDATED, (data) => {
            this.emit(WEBSOCKET.EVENTS.ELEMENT_UPDATED, data);
        });

        this.socket.on(WEBSOCKET.EVENTS.ELEMENT_DELETED, (data) => {
            this.emit(WEBSOCKET.EVENTS.ELEMENT_DELETED, data);
        });

        // User events
        this.socket.on(WEBSOCKET.EVENTS.USER_JOINED, (data) => {
            this.emit(WEBSOCKET.EVENTS.USER_JOINED, data);
        });

        this.socket.on(WEBSOCKET.EVENTS.USER_LEFT, (data) => {
            this.emit(WEBSOCKET.EVENTS.USER_LEFT, data);
        });

        this.socket.on(WEBSOCKET.EVENTS.ROOM_USERS, (users) => {
            this.emit(WEBSOCKET.EVENTS.ROOM_USERS, users);
        });

        // Cursor events
        this.socket.on(WEBSOCKET.EVENTS.CURSOR_UPDATED, (data) => {
            this.emit(WEBSOCKET.EVENTS.CURSOR_UPDATED, data);
        });
    }

    joinCanvas(canvasId) {
        if (this.socket && this.isConnected) {
            this.socket.emit(WEBSOCKET.EVENTS.JOIN_CANVAS, { canvasId });
        }
    }

    // Canvas operations
    updateCanvas(elements, name) {
        if (this.socket && this.isConnected && this.canvasId) {
            this.socket.emit(WEBSOCKET.EVENTS.CANVAS_UPDATE, {
                canvasId: this.canvasId,
                elements,
                name
            });
        }
    }

    updateCanvasName(name) {
        if (this.socket && this.isConnected && this.canvasId) {
            this.socket.emit(WEBSOCKET.EVENTS.CANVAS_NAME_UPDATE, {
                canvasId: this.canvasId,
                name
            });
        }
    }

    // Element operations
    createElement(element) {
        if (this.socket && this.isConnected && this.canvasId) {
            this.socket.emit(WEBSOCKET.EVENTS.ELEMENT_CREATE, {
                canvasId: this.canvasId,
                element
            });
        }
    }

    updateElement(elementId, updates) {
        if (this.socket && this.isConnected && this.canvasId) {
            this.socket.emit(WEBSOCKET.EVENTS.ELEMENT_UPDATE, {
                canvasId: this.canvasId,
                elementId,
                updates
            });
        }
    }

    deleteElement(elementId) {
        if (this.socket && this.isConnected && this.canvasId) {
            this.socket.emit(WEBSOCKET.EVENTS.ELEMENT_DELETE, {
                canvasId: this.canvasId,
                elementId
            });
        }
    }

    // Cursor operations
    updateCursor(position) {
        if (this.socket && this.isConnected && this.canvasId) {
            this.socket.emit(WEBSOCKET.EVENTS.CURSOR_UPDATE, {
                canvasId: this.canvasId,
                position
            });
        }
    }

    // Event handling
    on(event, handler) {
        if (!this.eventHandlers.has(event)) {
            this.eventHandlers.set(event, []);
        }
        this.eventHandlers.get(event).push(handler);
    }

    off(event, handler) {
        if (this.eventHandlers.has(event)) {
            const handlers = this.eventHandlers.get(event);
            const index = handlers.indexOf(handler);
            if (index > -1) {
                handlers.splice(index, 1);
            }
        }
    }

    emit(event, data) {
        if (this.eventHandlers.has(event)) {
            this.eventHandlers.get(event).forEach(handler => {
                try {
                    handler(data);
                } catch (error) {
                    console.error(`Error in event handler for ${event}:`, error);
                }
            });
        }
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        this.isConnected = false;
        this.canvasId = null;
        this.token = null;
        this.eventHandlers.clear();
    }

    // Utility methods
    getConnectionStatus() {
        return this.isConnected;
    }

    getCanvasId() {
        return this.canvasId;
    }


}

// Create singleton instance
const webSocketService = new WebSocketService();
export default webSocketService; 