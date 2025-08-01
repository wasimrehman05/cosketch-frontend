import { useContext, useEffect, useLayoutEffect, useRef } from "react";
import rough from "roughjs";
import cx from "classnames";
import boardContext from "../../store/board-context";
import { TOOL_ACTION_TYPES, TOOL_ITEMS, ARROW_LENGTH } from "../../constants";
import toolboxContext from "../../store/toolbox-context";
import { getArrowHeadsCoordinates } from "../../utils/math";

import classes from "./index.module.css";

function Board() {
  const canvasRef = useRef();
  const textAreaRef = useRef();
  const {
    elements,
    toolActionType,
    activeToolItem,
    selectedElements,
    selectionArea,
    boardMouseDownHandler,
    boardMouseMoveHandler,
    boardMouseUpHandler,
    textAreaBlurHandler,
    undo,
    redo,
    deleteSelected,
    copySelected,
    paste,
  } = useContext(boardContext);
  const { toolboxState } = useContext(toolboxContext);

  // Get cursor class based on active tool
  const getCursorClass = () => {
    if (toolActionType === TOOL_ACTION_TYPES.MOVING) {
      return classes.movingCursor;
    }
    
    switch (activeToolItem) {
      case TOOL_ITEMS.NONE:
        return ""; // Default cursor for view-only mode
      case TOOL_ITEMS.SELECTION:
        return classes.selectionCursor;
      case TOOL_ITEMS.BRUSH:
        return classes.brushCursor;
      case TOOL_ITEMS.ERASER:
        return classes.eraserCursor;
      case TOOL_ITEMS.LINE:
        return classes.lineCursor;
      case TOOL_ITEMS.RECTANGLE:
        return classes.rectangleCursor;
      case TOOL_ITEMS.CIRCLE:
        return classes.circleCursor;
      case TOOL_ITEMS.ARROW:
        return classes.arrowCursor;
      case TOOL_ITEMS.TEXT:
        return classes.textCursor;
      default:
        return "";
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }, []);

  useEffect(() => {
    function handleKeyDown(event) {
      // Check if the user is typing in an input field
      const activeElement = document.activeElement;
      const isTypingInInput = activeElement && (
        activeElement.tagName === 'INPUT' || 
        activeElement.tagName === 'TEXTAREA' || 
        activeElement.contentEditable === 'true'
      );
      
      if (isTypingInInput) {
        return; // Don't interfere with input field typing
      }
      
      if (toolActionType === TOOL_ACTION_TYPES.WRITING) {
        return;
      }
      
      // If tool is NONE, prevent all keyboard shortcuts - view only mode
      if (activeToolItem === TOOL_ITEMS.NONE) {
        return;
      }
      
      if (event.ctrlKey || event.metaKey) {
        if (event.key === "z") {
          event.preventDefault();
          undo();
        } else if (event.key === "y") {
          event.preventDefault();
          redo();
        } else if (event.key === "c") {
          event.preventDefault();
          copySelected();
        } else if (event.key === "v") {
          event.preventDefault();
          paste();
        }
      } else if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        deleteSelected();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [undo, redo, deleteSelected, copySelected, paste, toolActionType, activeToolItem]);

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    
    // Ensure canvas is properly sized before rendering
    if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    
    const context = canvas.getContext("2d");
    
    // Clear canvas with background first
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    context.save();

    const roughCanvas = rough.canvas(canvas);

    elements.forEach((element, index) => {
      const isSelected = selectedElements.includes(element.id);
      
      switch (element.type) {
        case TOOL_ITEMS.LINE:
        case TOOL_ITEMS.RECTANGLE:
        case TOOL_ITEMS.CIRCLE:
        case TOOL_ITEMS.ARROW:
          
          // If element doesn't have roughEle (from database), create it
          if (!element.roughEle) {
            const gen = rough.generator();
            let options = {
              seed: element.id + 1,
              fillStyle: "solid",
            };
            if (element.stroke) {
              options.stroke = element.stroke;
            }
            if (element.fill) {
              options.fill = element.fill;
            }
            if (element.size) {
              options.strokeWidth = element.size;
            }
            
            switch (element.type) {
              case TOOL_ITEMS.LINE:
                element.roughEle = gen.line(element.x1, element.y1, element.x2, element.y2, options);
                break;
              case TOOL_ITEMS.RECTANGLE:
                element.roughEle = gen.rectangle(element.x1, element.y1, element.x2 - element.x1, element.y2 - element.y1, options);
                break;
              case TOOL_ITEMS.CIRCLE:
                const cx = (element.x1 + element.x2) / 2;
                const cy = (element.y1 + element.y2) / 2;
                const width = element.x2 - element.x1;
                const height = element.y2 - element.y1;
                element.roughEle = gen.ellipse(cx, cy, width, height, options);
                break;
              case TOOL_ITEMS.ARROW:
                const { x3, y3, x4, y4 } = getArrowHeadsCoordinates(
                  element.x1, element.y1, element.x2, element.y2, ARROW_LENGTH
                );
                const points = [
                  [element.x1, element.y1],
                  [element.x2, element.y2],
                  [x3, y3],
                  [element.x2, element.y2],
                  [x4, y4],
                ];
                element.roughEle = gen.linearPath(points, options);
                break;
              default:
                console.warn(`Unrecognized element type in roughEle generation: ${element.type}`);
                break;
            }
          }
          
          roughCanvas.draw(element.roughEle);
          if (isSelected) {
            context.strokeStyle = "#007bff";
            context.lineWidth = 2;
            context.setLineDash([5, 5]);
            const minX = Math.min(element.x1, element.x2) - 5;
            const minY = Math.min(element.y1, element.y2) - 5;
            const width = Math.abs(element.x2 - element.x1) + 10;
            const height = Math.abs(element.y2 - element.y1) + 10;
            context.strokeRect(minX, minY, width, height);
            context.setLineDash([]);
          }
          break;
        case TOOL_ITEMS.BRUSH:
          context.fillStyle = element.stroke;
          context.fill(element.path);
          if (isSelected) {
            context.strokeStyle = "#007bff";
            context.lineWidth = 2;
            context.setLineDash([5, 5]);
            context.stroke(element.path);
            context.setLineDash([]);
          }
          context.restore();
          break;
        case TOOL_ITEMS.TEXT:
          context.textBaseline = "top";
          context.font = `${element.size}px Caveat`;
          context.fillStyle = element.stroke;
          context.fillText(element.text, element.x1, element.y1);
          if (isSelected) {
            const textWidth = context.measureText(element.text).width;
            const textHeight = parseInt(element.size);
            context.strokeStyle = "#007bff";
            context.lineWidth = 2;
            context.setLineDash([5, 5]);
            context.strokeRect(element.x1 - 2, element.y1 - 2, textWidth + 4, textHeight + 4);
            context.setLineDash([]);
          }
          break;
        default:
          // Handle unrecognized types gracefully
          console.warn(`Unrecognized element type: ${element.type}`);
          break;
      }
    });

    if (selectionArea && toolActionType === TOOL_ACTION_TYPES.SELECTING) {
      context.strokeStyle = "#007bff";
      context.lineWidth = 1;
      context.setLineDash([5, 5]);
      context.fillStyle = "rgba(0, 123, 255, 0.1)";
      
      const x = Math.min(selectionArea.startX, selectionArea.endX);
      const y = Math.min(selectionArea.startY, selectionArea.endY);
      const width = Math.abs(selectionArea.endX - selectionArea.startX);
      const height = Math.abs(selectionArea.endY - selectionArea.startY);
      
      context.fillRect(x, y, width, height);
      context.strokeRect(x, y, width, height);
      context.setLineDash([]);
    }

    return () => {
      context.clearRect(0, 0, canvas.width, canvas.height);
    };
  }, [elements, selectedElements, selectionArea, toolActionType]);

  useEffect(() => {
    const textarea = textAreaRef.current;
    if (toolActionType === TOOL_ACTION_TYPES.WRITING) {
      setTimeout(() => {
        textarea.focus();
      }, 0);
    }
  }, [toolActionType]);

  const handleMouseDown = (event) => {
    boardMouseDownHandler(event, toolboxState);
  };

  const handleMouseMove = (event) => {
    boardMouseMoveHandler(event);
  };

  const handleMouseUp = () => {
    boardMouseUpHandler();
  };

  return (
    <>
      {toolActionType === TOOL_ACTION_TYPES.WRITING && (
        <textarea
          type="text"
          ref={textAreaRef}
          className={classes.textElementBox}
          style={{
            top: elements[elements.length - 1].y1,
            left: elements[elements.length - 1].x1,
            fontSize: `${elements[elements.length - 1]?.size}px`,
            color: elements[elements.length - 1]?.stroke,
          }}
          onBlur={(event) => textAreaBlurHandler(event.target.value)}
        />
      )}
      <canvas
        ref={canvasRef}
        id="canvas"
        className={cx(classes.canvas, getCursorClass())}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      />
    </>
  );
}

export default Board;
