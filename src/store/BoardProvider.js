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
    case BOARD_ACTIONS.SAVE_CANVAS_DATA: {
      // This action doesn't change state, just triggers save
      return state;
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
};

const BoardProvider = ({ children }) => {
  const {token} = useAppContext();
  const {canvasId} = useParams();


  const [boardState, dispatchBoardAction] = useReducer(
    boardReducer,
    initialBoardState
  );
  
  const eraserThrottleRef = useRef(null);
  const autoSaveIntervalRef = useRef(null);

  // Load auto-saved data on mount
  useEffect(() => {
    const loadAutoSavedData = async () => {
      // Only try to load canvas if canvasId exists (not for new canvases)
      if (canvasId) {
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



  // Set up auto-save interval
  useEffect(() => {
    autoSaveIntervalRef.current = setInterval(() => {
      if (boardState.elements.length > 0) {
        autoSaveHandler();
      }
    }, 30000); // Auto-save every 30 seconds

    return () => {
      if (autoSaveIntervalRef.current) {
        clearInterval(autoSaveIntervalRef.current);
      }
    };
  }, [boardState.elements.length]);

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
  }, [boardState.elements.length]);

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
        elements: cleanElements
      });

      if (res.success) {
        console.log("Canvas updated successfully");
      } else {
        console.error("Failed to update canvas:", res);
      }
    } else {
      const res = await canvasService.createCanvas(token, {
        elements: cleanElements
      });

      if (res.success) {
        console.log("Canvas created successfully");
      } else {
        console.error("Failed to create canvas:", res);
      }
    }
  }, [boardState.elements, boardState.history, boardState.index]);

  const loadCanvasHandler = useCallback(async () => {
    const res = await canvasService.getCanvasById(token, canvasId);
    if (res.success) {
      const canvasData = res.data.canvas;
      dispatchBoardAction({
        type: BOARD_ACTIONS.LOAD_CANVAS_DATA,
        payload: canvasData,
      });
    }
  }, []);
  

  const autoSaveHandler = useCallback(async () => {

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
        elements: cleanElements
      });

      if (res.success) {
        console.log("Canvas updated successfully");
      } else {
        console.error("Failed to update canvas:", res);
      }
    } else {
      const res = await canvasService.createCanvas(token, {
        elements: cleanElements
      });
    }
  }, [boardState.elements]);

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
  };

  return (
    <boardContext.Provider value={boardContextValue}>
      {children}
    </boardContext.Provider>
  );
};

export default BoardProvider;
