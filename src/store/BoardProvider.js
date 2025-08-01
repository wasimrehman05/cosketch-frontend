import React, { useCallback, useReducer, useRef, useEffect } from "react";

import boardContext from "./board-context";
import { BOARD_ACTIONS, TOOL_ACTION_TYPES, TOOL_ITEMS } from "../constants";
import {
  createElement,
  getSvgPathFromStroke,
  isPointNearElement,
  isElementInSelection,
  isPointNearSelectedElement,
} from "../utils/element";
import getStroke from "perfect-freehand";
import { useAppContext } from "../context/AppContext";
import { useParams } from "react-router-dom";
import canvasService from "../services/CanvasService";
import userService from "../services/userService";
import webSocketService from "../services/websocketService";
import { WEBSOCKET } from "../constants/websocket";

const boardReducer = (state, action) => {
  switch (action.type) {
    case BOARD_ACTIONS.CHANGE_TOOL: {
      return {
        ...state,
        activeToolItem: action.payload.tool,
        selectedElements: [],
        selectionArea: null,
      };
    }
    case BOARD_ACTIONS.CHANGE_ACTION_TYPE:
      return {
        ...state,
        toolActionType: action.payload.actionType,
        lastMousePosition: action.payload.mousePosition || state.lastMousePosition,
      };
    case BOARD_ACTIONS.DRAW_DOWN: {
      const { clientX, clientY, stroke, fill, size } = action.payload;
      const newElement = createElement(
        state.elements.length,
        clientX,
        clientY,
        clientX,
        clientY,
        { type: state.activeToolItem, stroke, fill, size }
      );
      const prevElements = state.elements;
      
                  // Emit element creation via WebSocket immediately
            if (webSocketService.getConnectionStatus()) {
              webSocketService.createElement(newElement);
            }
      
      return {
        ...state,
        toolActionType:
          state.activeToolItem === TOOL_ITEMS.TEXT
            ? TOOL_ACTION_TYPES.WRITING
            : TOOL_ACTION_TYPES.DRAWING,
        elements: [...prevElements, newElement],
      };
    }
    case BOARD_ACTIONS.DRAW_MOVE: {
      const { clientX, clientY } = action.payload;
      const newElements = [...state.elements];
      const index = state.elements.length - 1;
      const { type } = newElements[index];
      switch (type) {
        case TOOL_ITEMS.LINE:
        case TOOL_ITEMS.RECTANGLE:
        case TOOL_ITEMS.CIRCLE:
        case TOOL_ITEMS.ARROW:
          const { x1, y1, stroke, fill, size } = newElements[index];
          const newElement = createElement(index, x1, y1, clientX, clientY, {
            type: state.activeToolItem,
            stroke,
            fill,
            size,
          });
          newElements[index] = newElement;
          
                      // Emit element update via WebSocket immediately
            if (webSocketService.getConnectionStatus()) {
              webSocketService.updateElement(newElement.id, newElement);
            }
          
          return {
            ...state,
            elements: newElements,
          };
        case TOOL_ITEMS.BRUSH:
          newElements[index].points = [
            ...newElements[index].points,
            { x: clientX, y: clientY },
          ];
          newElements[index].path = new Path2D(
            getSvgPathFromStroke(getStroke(newElements[index].points, { size: newElements[index].size || 5 }))
          );
          
                      // Emit brush update via WebSocket with throttling
            if (webSocketService.getConnectionStatus() && newElements[index].points.length % WEBSOCKET.BRUSH_THROTTLE_INTERVAL === 0) {
            webSocketService.updateElement(newElements[index].id, {
              points: newElements[index].points,
              path: newElements[index].path
            });
          }
          
          return {
            ...state,
            elements: newElements,
          };
        default:
          throw new Error("Type not recognized");
      }
    }
    case BOARD_ACTIONS.DRAW_UP: {
      const elementsCopy = [...state.elements];
      const newHistory = state.history.slice(0, state.index + 1);
      newHistory.push(elementsCopy);
      
      // Send final update for brush strokes to ensure complete data
      if (webSocketService.getConnectionStatus() && elementsCopy.length > 0) {
        const lastElement = elementsCopy[elementsCopy.length - 1];
        if (lastElement.type === TOOL_ITEMS.BRUSH) {
          webSocketService.updateElement(lastElement.id, {
            points: lastElement.points,
            path: lastElement.path
          });
        }
      }
      
      return {
        ...state,
        history: newHistory,
        index: state.index + 1,
      };
    }
    case BOARD_ACTIONS.ERASE: {
      const { clientX, clientY } = action.payload;
      let newElements = [...state.elements];
      const elementsToRemove = [];
      
      newElements.forEach((element, index) => {
        if (isPointNearElement(element, clientX, clientY)) {
          elementsToRemove.push(index);
        }
      });
      
      if (elementsToRemove.length > 0) {
        elementsToRemove.reverse().forEach(index => {
          newElements.splice(index, 1);
        });
        
        const newHistory = state.history.slice(0, state.index + 1);
        newHistory.push(newElements);
        return {
          ...state,
          elements: newElements,
          history: newHistory,
          index: state.index + 1,
        };
      }
      
      return state;
    }
    case BOARD_ACTIONS.CHANGE_TEXT: {
      const index = state.elements.length - 1;
      const newElements = [...state.elements];
      newElements[index].text = action.payload.text;
      const newHistory = state.history.slice(0, state.index + 1);
      newHistory.push(newElements);
      
      // Emit text update via WebSocket immediately
      if (webSocketService.getConnectionStatus()) {
        webSocketService.updateElement(newElements[index].id, { text: action.payload.text });
      }
      
      return {
        ...state,
        toolActionType: TOOL_ACTION_TYPES.NONE,
        elements: newElements,
        history: newHistory,
        index: state.index + 1,
      };
    }
    case BOARD_ACTIONS.UNDO: {
      if (state.index <= 0) return state;
      return {
        ...state,
        elements: state.history[state.index - 1],
        index: state.index - 1,
      };
    }
    case BOARD_ACTIONS.REDO: {
      if (state.index >= state.history.length - 1) return state;
      return {
        ...state,
        elements: state.history[state.index + 1],
        index: state.index + 1,
      };
    }
    case BOARD_ACTIONS.SELECT_START: {
      const { clientX, clientY } = action.payload;
      return {
        ...state,
        toolActionType: TOOL_ACTION_TYPES.SELECTING,
        selectionArea: {
          startX: clientX,
          startY: clientY,
          endX: clientX,
          endY: clientY,
        },
        selectedElements: [],
        lastMousePosition: { x: clientX, y: clientY },
      };
    }
    case BOARD_ACTIONS.SELECT_MOVE: {
      const { clientX, clientY } = action.payload;
      return {
        ...state,
        selectionArea: {
          ...state.selectionArea,
          endX: clientX,
          endY: clientY,
        },
        lastMousePosition: { x: clientX, y: clientY },
      };
    }
    case BOARD_ACTIONS.SELECT_END: {
      const { selectedElements } = action.payload;
      return {
        ...state,
        toolActionType: TOOL_ACTION_TYPES.NONE,
        selectedElements,
      };
    }
    case BOARD_ACTIONS.MOVE_ELEMENTS: {
      const { deltaX, deltaY } = action.payload;
      const newElements = [...state.elements];
      
      state.selectedElements.forEach(elementId => {
        const elementIndex = newElements.findIndex(el => el.id === elementId);
        if (elementIndex !== -1) {
          const element = newElements[elementIndex];
          const updatedElement = {
            ...element,
            x1: element.x1 + deltaX,
            y1: element.y1 + deltaY,
            x2: element.x2 + deltaX,
            y2: element.y2 + deltaY,
          };
          
          if (element.type === TOOL_ITEMS.BRUSH && element.points) {
            updatedElement.points = element.points.map(point => ({
              x: point.x + deltaX,
              y: point.y + deltaY,
            }));
            updatedElement.path = new Path2D(
              getSvgPathFromStroke(getStroke(updatedElement.points, { size: element.size || 5 }))
            );
          } else if ([TOOL_ITEMS.LINE, TOOL_ITEMS.RECTANGLE, TOOL_ITEMS.CIRCLE, TOOL_ITEMS.ARROW].includes(element.type)) {
            updatedElement.roughEle = createElement(
              element.id,
              updatedElement.x1,
              updatedElement.y1,
              updatedElement.x2,
              updatedElement.y2,
              {
                type: element.type,
                stroke: element.stroke,
                fill: element.fill,
                size: element.size,
              }
            ).roughEle;
          }
          
          newElements[elementIndex] = updatedElement;
          
          // Emit element move via WebSocket immediately
          if (webSocketService.getConnectionStatus()) {
            webSocketService.updateElement(elementId, {
              x1: updatedElement.x1,
              y1: updatedElement.y1,
              x2: updatedElement.x2,
              y2: updatedElement.y2,
              points: updatedElement.points,
              path: updatedElement.path,
              roughEle: updatedElement.roughEle
            });
          }
        }
      });
      
      return {
        ...state,
        elements: newElements,
        lastMousePosition: {
          x: state.lastMousePosition.x + deltaX,
          y: state.lastMousePosition.y + deltaY,
        },
      };
    }
    case BOARD_ACTIONS.MOVE_COMPLETE: {
      const newHistory = state.history.slice(0, state.index + 1);
      newHistory.push([...state.elements]);
      
      return {
        ...state,
        toolActionType: TOOL_ACTION_TYPES.NONE,
        history: newHistory,
        index: state.index + 1,
      };
    }
    case BOARD_ACTIONS.CLEAR_SELECTION: {
      return {
        ...state,
        selectedElements: [],
        selectionArea: null,
      };
    }
    case BOARD_ACTIONS.DELETE_SELECTED: {
      const newElements = state.elements.filter(
        element => !state.selectedElements.includes(element.id)
      );
      const newHistory = state.history.slice(0, state.index + 1);
      newHistory.push(newElements);
      
      // Emit element deletions via WebSocket immediately
      if (webSocketService.getConnectionStatus()) {
        state.selectedElements.forEach(elementId => {
          webSocketService.deleteElement(elementId);
        });
      }
      
      return {
        ...state,
        elements: newElements,
        selectedElements: [],
        history: newHistory,
        index: state.index + 1,
      };
    }
    case BOARD_ACTIONS.COPY_SELECTED: {
      const selectedElementsData = state.elements.filter(
        element => state.selectedElements.includes(element.id)
      );
      
      return {
        ...state,
        clipboard: selectedElementsData,
      };
    }
    case BOARD_ACTIONS.PASTE_ELEMENTS: {
      if (state.clipboard.length === 0) return state;
      
      const { pasteX, pasteY } = action.payload || {};
      const newElements = [...state.elements];
      const pastedElementIds = [];
      
      let baseOffsetX = 20;
      let baseOffsetY = 20;
      
      if (pasteX !== undefined && pasteY !== undefined && state.clipboard.length > 0) {
        const firstElement = state.clipboard[0];
        baseOffsetX = pasteX - firstElement.x1;
        baseOffsetY = pasteY - firstElement.y1;
      }
      
      state.clipboard.forEach((element, index) => {
        const newId = Date.now() + index;
        
        const newElement = {
          ...element,
          id: newId,
          x1: element.x1 + baseOffsetX,
          y1: element.y1 + baseOffsetY,
          x2: element.x2 + baseOffsetX,
          y2: element.y2 + baseOffsetY,
        };
        
        if (element.type === TOOL_ITEMS.BRUSH && element.points) {
          newElement.points = element.points.map(point => ({
            x: point.x + baseOffsetX,
            y: point.y + baseOffsetY,
          }));
          newElement.path = new Path2D(
            getSvgPathFromStroke(getStroke(newElement.points))
          );
        } else if ([TOOL_ITEMS.LINE, TOOL_ITEMS.RECTANGLE, TOOL_ITEMS.CIRCLE, TOOL_ITEMS.ARROW].includes(element.type)) {
          const createdElement = createElement(
            newId,
            newElement.x1,
            newElement.y1,
            newElement.x2,
            newElement.y2,
            {
              type: element.type,
              stroke: element.stroke,
              fill: element.fill,
              size: element.size,
            }
          );
          newElement.roughEle = createdElement.roughEle;
        }
        
        newElements.push(newElement);
        pastedElementIds.push(newId);
      });
      
      const newHistory = state.history.slice(0, state.index + 1);
      newHistory.push(newElements);
      
      return {
        ...state,
        elements: newElements,
        selectedElements: pastedElementIds,
        history: newHistory,
        index: state.index + 1,
      };
    }
    case BOARD_ACTIONS.LOAD_CANVAS_DATA: {
      const { name, description, owner, elements, shared_with, isPublic } = action.payload;
      
      // Helper function to reconstruct brush paths from points data
      const reconstructElement = (element) => {
        let reconstructedElement = { ...element };
        
        if (element.type === TOOL_ITEMS.BRUSH && element.points && !element.path) {
          // Recreate Path2D from points
          const path = new Path2D(
            getSvgPathFromStroke(getStroke(element.points, { size: element.size || 5 }))
          );
          reconstructedElement.path = path;
        }
        
        // Reconstruct rough elements for shapes
        if ([TOOL_ITEMS.LINE, TOOL_ITEMS.RECTANGLE, TOOL_ITEMS.CIRCLE, TOOL_ITEMS.ARROW].includes(element.type) && !element.roughEle) {
          const createdElement = createElement(
            element.id,
            element.x1,
            element.y1,
            element.x2,
            element.y2,
            {
              type: element.type,
              stroke: element.stroke,
              fill: element.fill,
              size: element.size,
            }
          );
          reconstructedElement.roughEle = createdElement.roughEle;
        }
        
        return reconstructedElement;
      };
      
      // Reconstruct brush paths from points data
      const reconstructedElements = (elements || []).map(reconstructElement);
      
      // Reconstruct history as well
      // const reconstructedHistory = (history || [[]]).map(historyElements => 
      //   historyElements.map(reconstructElement)
      // );
      
      return {
        ...state,
        name,
        description,
        owner,
        shared_with,
        isPublic,
        elements: reconstructedElements,
        history: [],
        index: 0,
        selectedElements: [],
        selectionArea: null,
      };
    }
    case BOARD_ACTIONS.UPDATE_NAME: {
      return {
        ...state,
        name: action.payload.name,
      };
    }
    case BOARD_ACTIONS.SHARE_CANVAS: {
      const { user, canEdit } = action.payload;
      const existingShareIndex = state.shared_with.findIndex(
        share => share.user._id === user._id
      );
      
      if (existingShareIndex >= 0) {
        // Update existing share
        const updatedSharedWith = [...state.shared_with];
        updatedSharedWith[existingShareIndex] = {
          ...updatedSharedWith[existingShareIndex],
          canEdit,
          sharedAt: new Date()
        };
        return {
          ...state,
          shared_with: updatedSharedWith,
        };
      } else {
        // Add new share
        return {
          ...state,
          shared_with: [
            ...state.shared_with,
            {
              user,
              canEdit,
              sharedAt: new Date()
            }
          ],
        };
      }
    }
    case BOARD_ACTIONS.REMOVE_SHARE: {
      const { userId } = action.payload;
      return {
        ...state,
        shared_with: state.shared_with.filter(
          share => share.user._id !== userId
        ),
      };
    }
    case BOARD_ACTIONS.UPDATE_SHARE_PERMISSION: {
      const { userId, canEdit } = action.payload;
      return {
        ...state,
        shared_with: state.shared_with.map(share => 
          share.user._id === userId 
            ? { ...share, canEdit, sharedAt: new Date() }
            : share
        ),
      };
    }
    case BOARD_ACTIONS.SAVE_CANVAS_DATA: {
      // This action doesn't change state, just triggers save
      return state;
    }
    case BOARD_ACTIONS.SET_ROOM_USERS: {
      return {
        ...state,
        roomUsers: action.payload.users,
      };
    }
    case BOARD_ACTIONS.SET_CONNECTION_STATUS: {
      return {
        ...state,
        isConnected: action.payload.isConnected,
      };
    }
    case BOARD_ACTIONS.ADD_ELEMENT_FROM_SOCKET: {
      const { element } = action.payload;
      
      // Helper function to reconstruct brush paths from points data
      const reconstructElement = (element) => {
        let reconstructedElement = { ...element };
        
        if (element.type === TOOL_ITEMS.BRUSH && element.points && !element.path) {
          // Recreate Path2D from points
          const path = new Path2D(
            getSvgPathFromStroke(getStroke(element.points, { size: element.size || 5 }))
          );
          reconstructedElement.path = path;
        }
        
        // Reconstruct rough elements for shapes
        if ([TOOL_ITEMS.LINE, TOOL_ITEMS.RECTANGLE, TOOL_ITEMS.CIRCLE, TOOL_ITEMS.ARROW].includes(element.type) && !element.roughEle) {
          const createdElement = createElement(
            element.id,
            element.x1,
            element.y1,
            element.x2,
            element.y2,
            {
              type: element.type,
              stroke: element.stroke,
              fill: element.fill,
              size: element.size,
            }
          );
          reconstructedElement.roughEle = createdElement.roughEle;
        }
        
        return reconstructedElement;
      };
      
      const reconstructedElement = reconstructElement(element);
      const newElements = [...state.elements, reconstructedElement];
      
      return {
        ...state,
        elements: newElements,
      };
    }
    case BOARD_ACTIONS.UPDATE_ELEMENT_FROM_SOCKET: {
      const { elementId, updates } = action.payload;
      
      // Helper function to reconstruct brush paths from points data
      const reconstructElement = (element) => {
        let reconstructedElement = { ...element };
        
        if (element.type === TOOL_ITEMS.BRUSH && element.points && !element.path) {
          // Recreate Path2D from points
          const path = new Path2D(
            getSvgPathFromStroke(getStroke(element.points, { size: element.size || 5 }))
          );
          reconstructedElement.path = path;
        }
        
        // Reconstruct rough elements for shapes
        if ([TOOL_ITEMS.LINE, TOOL_ITEMS.RECTANGLE, TOOL_ITEMS.CIRCLE, TOOL_ITEMS.ARROW].includes(element.type) && !element.roughEle) {
          const createdElement = createElement(
            element.id,
            element.x1,
            element.y1,
            element.x2,
            element.y2,
            {
              type: element.type,
              stroke: element.stroke,
              fill: element.fill,
              size: element.size,
            }
          );
          reconstructedElement.roughEle = createdElement.roughEle;
        }
        
        return reconstructedElement;
      };
      
      const newElements = state.elements.map(element => {
        if (element.id === elementId) {
          const updatedElement = { ...element, ...updates };
          return reconstructElement(updatedElement);
        }
        return element;
      });
      
      return {
        ...state,
        elements: newElements,
      };
    }
    case BOARD_ACTIONS.DELETE_ELEMENT_FROM_SOCKET: {
      const { elementId } = action.payload;
      const newElements = state.elements.filter(element => element.id !== elementId);
      return {
        ...state,
        elements: newElements,
      };
    }
    case BOARD_ACTIONS.UPDATE_CANVAS_FROM_SOCKET: {
      const { elements, name } = action.payload;
      return {
        ...state,
        elements: elements || state.elements,
        name: name || state.name,
      };
    }
    default:
      return state;
  }
};

const initialBoardState = {
  name: "Untitled Canvas",
  description: "",
  owner: null,
  shared_with: [],
  isPublic: false,
  activeToolItem: TOOL_ITEMS.BRUSH,
  toolActionType: TOOL_ACTION_TYPES.NONE,
  elements: [],
  history: [[]],
  index: 0,
  selectedElements: [],
  selectionArea: null,
  lastMousePosition: { x: 0, y: 0 },
  clipboard: [],
  roomUsers: [],
  isConnected: false,
};

const BoardProvider = ({ children }) => {
  const {token} = useAppContext();
  const {canvasId} = useParams();


  const [boardState, dispatchBoardAction] = useReducer(
    boardReducer,
    initialBoardState
  );
  
  const eraserThrottleRef = useRef(null);


  // WebSocket integration
  useEffect(() => {
    if (!token || !canvasId) return;

    // Connect to WebSocket
    webSocketService.connect(token, canvasId);

    // Set up WebSocket event handlers
    const handleCanvasJoined = (data) => {
      dispatchBoardAction({
        type: BOARD_ACTIONS.LOAD_CANVAS_DATA,
        payload: data,
      });
    };

    const handleCanvasUpdated = (data) => {
      if (data.updatedBy !== token) { // Don't update if it's our own update
        dispatchBoardAction({
          type: BOARD_ACTIONS.UPDATE_CANVAS_FROM_SOCKET,
          payload: { elements: data.elements, name: data.name },
        });
      }
    };

    const handleCanvasNameUpdated = (data) => {
      if (data.updatedBy !== token) {
        dispatchBoardAction({
          type: BOARD_ACTIONS.UPDATE_NAME,
          payload: { name: data.name },
        });
      }
    };

    const handleElementCreated = (data) => {
      if (data.createdBy !== token) {
        dispatchBoardAction({
          type: BOARD_ACTIONS.ADD_ELEMENT_FROM_SOCKET,
          payload: { element: data.element },
        });
      }
    };

    const handleElementUpdated = (data) => {
      if (data.updatedBy !== token) {
        dispatchBoardAction({
          type: BOARD_ACTIONS.UPDATE_ELEMENT_FROM_SOCKET,
          payload: { elementId: data.elementId, updates: data.updates },
        });
      }
    };

    const handleElementDeleted = (data) => {
      if (data.deletedBy !== token) {
        dispatchBoardAction({
          type: BOARD_ACTIONS.DELETE_ELEMENT_FROM_SOCKET,
          payload: { elementId: data.elementId },
        });
      }
    };

    const handleRoomUsers = (users) => {
      dispatchBoardAction({
        type: BOARD_ACTIONS.SET_ROOM_USERS,
        payload: { users },
      });
    };

    const handleUserJoined = (data) => {
      // When a user joins, we don't need to manually update the user count
      // The backend will send a room-users event with the updated list
    };

    const handleUserLeft = (data) => {
      // When a user leaves, we don't need to manually update the user count
      // The backend will send a room-users event with the updated list
    };

    const handleConnectionStatus = (data) => {
      dispatchBoardAction({
        type: BOARD_ACTIONS.SET_CONNECTION_STATUS,
        payload: { isConnected: data.isConnected },
      });
    };

    // Register event handlers
    webSocketService.on(WEBSOCKET.EVENTS.CANVAS_JOINED, handleCanvasJoined);
    webSocketService.on(WEBSOCKET.EVENTS.CANVAS_UPDATED, handleCanvasUpdated);
    webSocketService.on(WEBSOCKET.EVENTS.CANVAS_NAME_UPDATED, handleCanvasNameUpdated);
    webSocketService.on(WEBSOCKET.EVENTS.ELEMENT_CREATED, handleElementCreated);
    webSocketService.on(WEBSOCKET.EVENTS.ELEMENT_UPDATED, handleElementUpdated);
    webSocketService.on(WEBSOCKET.EVENTS.ELEMENT_DELETED, handleElementDeleted);
    webSocketService.on(WEBSOCKET.EVENTS.ROOM_USERS, handleRoomUsers);
    webSocketService.on(WEBSOCKET.EVENTS.USER_JOINED, handleUserJoined);
    webSocketService.on(WEBSOCKET.EVENTS.USER_LEFT, handleUserLeft);
    webSocketService.on(WEBSOCKET.EVENTS.CONNECTION_STATUS, handleConnectionStatus);

    // Cleanup on unmount
    return () => {
      webSocketService.off(WEBSOCKET.EVENTS.CANVAS_JOINED, handleCanvasJoined);
      webSocketService.off(WEBSOCKET.EVENTS.CANVAS_UPDATED, handleCanvasUpdated);
      webSocketService.off(WEBSOCKET.EVENTS.CANVAS_NAME_UPDATED, handleCanvasNameUpdated);
      webSocketService.off(WEBSOCKET.EVENTS.ELEMENT_CREATED, handleElementCreated);
      webSocketService.off(WEBSOCKET.EVENTS.ELEMENT_UPDATED, handleElementUpdated);
      webSocketService.off(WEBSOCKET.EVENTS.ELEMENT_DELETED, handleElementDeleted);
      webSocketService.off(WEBSOCKET.EVENTS.ROOM_USERS, handleRoomUsers);
      webSocketService.off(WEBSOCKET.EVENTS.USER_JOINED, handleUserJoined);
      webSocketService.off(WEBSOCKET.EVENTS.USER_LEFT, handleUserLeft);
      webSocketService.off(WEBSOCKET.EVENTS.CONNECTION_STATUS, handleConnectionStatus);
      webSocketService.disconnect();
    };
  }, [canvasId, token]);

  // Load auto-saved data on mount (fallback for non-WebSocket scenarios)
  useEffect(() => {
    const loadAutoSavedData = async () => {
      // Only try to load canvas if canvasId exists (not for new canvases)
      if (canvasId && !webSocketService.getConnectionStatus()) {
        const res = await canvasService.getCanvasById(token, canvasId);
        if (res.success) {
          const canvasData = res.data.canvas;
          dispatchBoardAction({
            type: BOARD_ACTIONS.LOAD_CANVAS_DATA,
            payload: canvasData,
          });
        }
      }
    };

    loadAutoSavedData();
  }, [canvasId, token]);

  const autoSaveHandler = useCallback(async () => {
    // Always use current boardState values to ensure we have the latest name
    const cleanElements = boardState.elements.map(element => {
      const cleanElement = { ...element };
      if (element.type === 'BRUSH' && element.path) {
        // Remove path property as it can't be serialized
        delete cleanElement.path;
      }
      // Remove roughEle property as it can't be serialized
      if (cleanElement.roughEle) {
        delete cleanElement.roughEle;
      }
      return cleanElement;
    });

    // Use WebSocket if connected, otherwise fallback to REST API
    const isWebSocketConnected = webSocketService.getConnectionStatus();
    
    
    if (isWebSocketConnected && canvasId) {
      webSocketService.updateCanvas(cleanElements, boardState.name);
    } else {
      if (canvasId) {
        const res = await canvasService.updateCanvas(token, canvasId, {
          elements: cleanElements,
          name: boardState.name
        });

        if (!res.success) {
          console.error("Failed to update canvas:", res);
        }
      } else {
        await canvasService.createCanvas(token, {
          elements: cleanElements,
          name: boardState.name
        });
      }
    }
  }, [boardState.elements, boardState.name, canvasId, token]);



  // Auto-save when leaving the page
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (boardState.elements.length > 0) {
        autoSaveHandler();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [boardState.elements.length, boardState.name, autoSaveHandler]);

  // Auto-save when name changes (for immediate name persistence)
  useEffect(() => {
    if (canvasId && boardState.name && boardState.name !== "Untitled Canvas") {
      // Debounce the name save to avoid too many API calls
      const timeoutId = setTimeout(() => {
        autoSaveHandler();
      }, 1000); // Save after 1 second of no changes

      return () => clearTimeout(timeoutId);
    }
  }, [boardState.name, canvasId, autoSaveHandler]);

  const changeToolHandler = useCallback((tool) => {
    dispatchBoardAction({
      type: BOARD_ACTIONS.CHANGE_TOOL,
      payload: {
        tool,
      },
    });
  }, []);

  const boardMouseDownHandler = (event, toolboxState) => {
    if (boardState.toolActionType === TOOL_ACTION_TYPES.WRITING) return;
    
    // If tool is NONE, prevent all editing actions - view only mode
    if (boardState.activeToolItem === TOOL_ITEMS.NONE) return;
    
    const { clientX, clientY } = event;
    
    if (boardState.activeToolItem === TOOL_ITEMS.SELECTION) {
      if (boardState.selectedElements.length > 0) {
        const clickedSelectedElement = boardState.elements.find(element =>
          boardState.selectedElements.includes(element.id) && 
          isPointNearSelectedElement(element, clientX, clientY)
        );
        
        if (clickedSelectedElement) {
          dispatchBoardAction({
            type: BOARD_ACTIONS.CHANGE_ACTION_TYPE,
            payload: {
              actionType: TOOL_ACTION_TYPES.MOVING,
              mousePosition: { x: clientX, y: clientY },
            },
          });
          return;
        }
      }
      
      const clickedElement = boardState.elements.find(element =>
        isPointNearElement(element, clientX, clientY)
      );
      
      if (clickedElement) {
        dispatchBoardAction({
          type: BOARD_ACTIONS.CLEAR_SELECTION,
        });
      } else if (boardState.selectedElements.length > 0) {
        dispatchBoardAction({
          type: BOARD_ACTIONS.CLEAR_SELECTION,
        });
      }
      
      dispatchBoardAction({
        type: BOARD_ACTIONS.SELECT_START,
        payload: {
          clientX,
          clientY,
        },
      });
      return;
    }
    
    if (boardState.activeToolItem === TOOL_ITEMS.ERASER) {
      dispatchBoardAction({
        type: BOARD_ACTIONS.ERASE,
        payload: {
          clientX,
          clientY,
        },
      });
      
      dispatchBoardAction({
        type: BOARD_ACTIONS.CHANGE_ACTION_TYPE,
        payload: {
          actionType: TOOL_ACTION_TYPES.ERASING,
        },
      });
      return;
    }
    
    dispatchBoardAction({
      type: BOARD_ACTIONS.DRAW_DOWN,
      payload: {
        clientX,
        clientY,
        stroke: toolboxState[boardState.activeToolItem]?.stroke,
        fill: toolboxState[boardState.activeToolItem]?.fill,
        size: toolboxState[boardState.activeToolItem]?.size,
      },
    });
  };

  const boardMouseMoveHandler = (event) => {
    if (boardState.toolActionType === TOOL_ACTION_TYPES.WRITING) return;
    
    // If tool is NONE, prevent all editing actions - view only mode
    if (boardState.activeToolItem === TOOL_ITEMS.NONE) return;
    
    const { clientX, clientY } = event;
    
    if (boardState.toolActionType === TOOL_ACTION_TYPES.SELECTING) {
      dispatchBoardAction({
        type: BOARD_ACTIONS.SELECT_MOVE,
        payload: {
          clientX,
          clientY,
        },
      });
    } else if (boardState.toolActionType === TOOL_ACTION_TYPES.MOVING) {
      const deltaX = clientX - boardState.lastMousePosition.x;
      const deltaY = clientY - boardState.lastMousePosition.y;
      
      if (Math.abs(deltaX) > 0 || Math.abs(deltaY) > 0) {
        dispatchBoardAction({
          type: BOARD_ACTIONS.MOVE_ELEMENTS,
          payload: {
            deltaX,
            deltaY,
          },
        });
      }
    } else if (boardState.toolActionType === TOOL_ACTION_TYPES.DRAWING) {
      dispatchBoardAction({
        type: BOARD_ACTIONS.DRAW_MOVE,
        payload: {
          clientX,
          clientY,
        },
      });
    } else if (boardState.toolActionType === TOOL_ACTION_TYPES.ERASING) {
      if (eraserThrottleRef.current) {
        clearTimeout(eraserThrottleRef.current);
      }
      
      eraserThrottleRef.current = setTimeout(() => {
        dispatchBoardAction({
          type: BOARD_ACTIONS.ERASE,
          payload: {
            clientX,
            clientY,
          },
        });
      }, 16);
    }
  };

  const boardMouseUpHandler = () => {
    if (boardState.toolActionType === TOOL_ACTION_TYPES.WRITING) return;
    
    // If tool is NONE, prevent all editing actions - view only mode
    if (boardState.activeToolItem === TOOL_ITEMS.NONE) return;
    
    if (eraserThrottleRef.current) {
      clearTimeout(eraserThrottleRef.current);
      eraserThrottleRef.current = null;
    }
    
    if (boardState.toolActionType === TOOL_ACTION_TYPES.SELECTING) {
      const selectedElements = boardState.elements
        .filter(element => isElementInSelection(element, boardState.selectionArea))
        .map(element => element.id);
      
      dispatchBoardAction({
        type: BOARD_ACTIONS.SELECT_END,
        payload: {
          selectedElements,
        },
      });
    } else if (boardState.toolActionType === TOOL_ACTION_TYPES.MOVING) {
      dispatchBoardAction({
        type: BOARD_ACTIONS.MOVE_COMPLETE,
      });
    } else if (boardState.toolActionType === TOOL_ACTION_TYPES.DRAWING) {
      dispatchBoardAction({
        type: BOARD_ACTIONS.DRAW_UP,
      });
    }
    
    dispatchBoardAction({
      type: BOARD_ACTIONS.CHANGE_ACTION_TYPE,
      payload: {
        actionType: TOOL_ACTION_TYPES.NONE,
      },
    });
  };

  const textAreaBlurHandler = (text) => {
    dispatchBoardAction({
      type: BOARD_ACTIONS.CHANGE_TEXT,
      payload: {
        text,
      },
    });
  };

  const boardUndoHandler = useCallback(() => {
    dispatchBoardAction({
      type: BOARD_ACTIONS.UNDO,
    });
  }, []);

  const boardRedoHandler = useCallback(() => {
    dispatchBoardAction({
      type: BOARD_ACTIONS.REDO,
    });
  }, []);

  const deleteSelectedHandler = useCallback(() => {
    if (boardState.selectedElements.length > 0) {
      dispatchBoardAction({
        type: BOARD_ACTIONS.DELETE_SELECTED,
      });
    }
  }, [boardState.selectedElements]);

  const copySelectedHandler = useCallback(() => {
    if (boardState.selectedElements.length > 0) {
      dispatchBoardAction({
        type: BOARD_ACTIONS.COPY_SELECTED,
      });
    }
  }, [boardState.selectedElements]);

  const pasteHandler = useCallback((pasteX, pasteY) => {
    dispatchBoardAction({
      type: BOARD_ACTIONS.PASTE_ELEMENTS,
      payload: {
        pasteX,
        pasteY,
      },
    });
  }, []);

  const saveCanvasHandler = useCallback(async() => {
    const cleanElements = boardState.elements.map(element => {
      const cleanElement = { ...element };
      if (element.type === 'BRUSH' && element.path) {
        // Remove path property as it can't be serialized
        delete cleanElement.path;
      }
      // Remove roughEle property as it can't be serialized
      if (cleanElement.roughEle) {
        delete cleanElement.roughEle;
      }
      return cleanElement;
    });

    if (canvasId) {
      const res = await canvasService.updateCanvas(token, canvasId, {
        elements: cleanElements,
        name: boardState.name
      });

      if (!res.success) {
        console.error("Failed to update canvas:", res);
      }
    } else {
      const res = await canvasService.createCanvas(token, {
        elements: cleanElements,
        name: boardState.name
      });

      if (!res.success) {
        console.error("Failed to create canvas:", res);
      }
    }
  }, [boardState.elements, canvasId, token]);

  const loadCanvasHandler = useCallback(async () => {
    const res = await canvasService.getCanvasById(token, canvasId);
    if (res.success) {
      const canvasData = res.data.canvas;
      dispatchBoardAction({
        type: BOARD_ACTIONS.LOAD_CANVAS_DATA,
        payload: canvasData,
      });
    }
  }, [canvasId, token]);

  const updateNameHandler = useCallback((newName) => {
    dispatchBoardAction({
      type: BOARD_ACTIONS.UPDATE_NAME,
      payload: { name: newName },
    });
    
    // Emit name update via WebSocket immediately
    if (webSocketService.getConnectionStatus()) {
      webSocketService.updateCanvasName(newName);
    }
  }, []);

  const shareCanvasHandler = useCallback(async (email, canEdit) => {
    try {
      // Check if we have a valid canvasId
      if (!canvasId) {
        throw new Error('Canvas not saved yet. Please save the canvas first before sharing.');
      }

      // Check if we have a valid token
      if (!token) {
        throw new Error('Authentication required. Please log in again.');
      }

      // First check if user exists
      const userCheckRes = await userService.checkUserExists(email);
      
      if (!userCheckRes.success) {
        throw new Error(userCheckRes.message || 'User not found. Please make sure the email is registered.');
      }

      const user = userCheckRes.data.user;
      
      // Share canvas with backend
      const shareRes = await canvasService.shareCanvas(token, canvasId, {
        email,
        canEdit
      });

      if (shareRes.success) {
        // Update local state
        dispatchBoardAction({
          type: BOARD_ACTIONS.SHARE_CANVAS,
          payload: { user, canEdit },
        });
        return { success: true, message: 'Canvas shared successfully!' };
      } else {
        throw new Error(shareRes.message || 'Failed to share canvas');
      }
    } catch (error) {
      return { success: false, message: error.message };
    }
  }, [canvasId, token]);

  const removeShareHandler = useCallback(async (userId) => {
    try {
      const res = await canvasService.removeShare(token, canvasId, userId);
      
      if (res.success) {
        dispatchBoardAction({
          type: BOARD_ACTIONS.REMOVE_SHARE,
          payload: { userId },
        });
        return { success: true, message: 'Share removed successfully!' };
      } else {
        throw new Error(res.message || 'Failed to remove share');
      }
    } catch (error) {
      return { success: false, message: error.message };
    }
  }, [canvasId, token]);

  const updateSharePermissionHandler = useCallback(async (userId, canEdit) => {
    try {
      const res = await canvasService.updateSharePermission(token, canvasId, userId, canEdit);
      
      if (res.success) {
        dispatchBoardAction({
          type: BOARD_ACTIONS.UPDATE_SHARE_PERMISSION,
          payload: { userId, canEdit },
        });
        return { success: true, message: 'Permission updated successfully!' };
      } else {
        throw new Error(res.message || 'Failed to update permission');
      }
    } catch (error) {
      return { success: false, message: error.message };
    }
  }, [canvasId, token]);

  const boardContextValue = {
    name: boardState.name,
    description: boardState.description,
    owner: boardState.owner,
    shared_with: boardState.shared_with,
    isPublic: boardState.isPublic,
    activeToolItem: boardState.activeToolItem,
    elements: boardState.elements,
    toolActionType: boardState.toolActionType,
    selectedElements: boardState.selectedElements,
    selectionArea: boardState.selectionArea,
    clipboard: boardState.clipboard,
    roomUsers: boardState.roomUsers,
    isConnected: boardState.isConnected,
    changeToolHandler,
    boardMouseDownHandler,
    boardMouseMoveHandler,
    boardMouseUpHandler,
    textAreaBlurHandler,
    undo: boardUndoHandler,
    redo: boardRedoHandler,
    deleteSelected: deleteSelectedHandler,
    copySelected: copySelectedHandler,
    paste: pasteHandler,
    saveCanvas: saveCanvasHandler,
    loadCanvas: loadCanvasHandler,
    autoSave: autoSaveHandler,
    updateName: updateNameHandler,
    shareCanvas: shareCanvasHandler,
    removeShare: removeShareHandler,
    updateSharePermission: updateSharePermissionHandler,
  };

  return (
    <boardContext.Provider value={boardContextValue}>
      {children}
    </boardContext.Provider>
  );
};

export default BoardProvider;
