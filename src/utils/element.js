import { ARROW_LENGTH, TOOL_ITEMS, ELEMENT_ERASE_THRESHOLD } from "../constants";
import getStroke from "perfect-freehand";

import rough from "roughjs/bin/rough";
import { getArrowHeadsCoordinates, isPointCloseToLine } from "./math";

const gen = rough.generator();

export const createElement = (
  id,
  x1,
  y1,
  x2,
  y2,
  { type, stroke, fill, size }
) => {
  const element = {
    id,
    x1,
    y1,
    x2,
    y2,
    type,
    fill,
    stroke,
    size,
  };
  let options = {
    seed: id + 1, // id can't be zero
    fillStyle: "solid",
  };
  if (stroke) {
    options.stroke = stroke;
  }
  if (fill) {
    options.fill = fill;
  }
  if (size) {
    options.strokeWidth = size;
  }
  switch (type) {
    case TOOL_ITEMS.BRUSH: {
      const brushElement = {
        id,
        points: [{ x: x1, y: y1 }],
        path: new Path2D(getSvgPathFromStroke(getStroke([{ x: x1, y: y1 }]))),
        type,
        stroke,
      };
      return brushElement;
    }
    case TOOL_ITEMS.LINE:
      element.roughEle = gen.line(x1, y1, x2, y2, options);
      return element;
    case TOOL_ITEMS.RECTANGLE:
      element.roughEle = gen.rectangle(x1, y1, x2 - x1, y2 - y1, options);
      return element;
    case TOOL_ITEMS.CIRCLE:
      const cx = (x1 + x2) / 2,
        cy = (y1 + y2) / 2;
      const width = x2 - x1,
        height = y2 - y1;
      element.roughEle = gen.ellipse(cx, cy, width, height, options);
      return element;
    case TOOL_ITEMS.ARROW:
      const { x3, y3, x4, y4 } = getArrowHeadsCoordinates(
        x1,
        y1,
        x2,
        y2,
        ARROW_LENGTH
      );
      const points = [
        [x1, y1],
        [x2, y2],
        [x3, y3],
        [x2, y2],
        [x4, y4],
      ];
      element.roughEle = gen.linearPath(points, options);
      return element;
    case TOOL_ITEMS.TEXT:
      element.text = "";
      return element;
    default:
      throw new Error("Type not recognized");
  }
};

export const isPointNearElement = (element, pointX, pointY) => {
  const { x1, y1, x2, y2, type } = element;
  
  if (type !== TOOL_ITEMS.TEXT) {
    const minX = Math.min(x1, x2) - 3;
    const maxX = Math.max(x1, x2) + 3;
    const minY = Math.min(y1, y2) - 3;
    const maxY = Math.max(y1, y2) + 3;
    
    if (pointX < minX || pointX > maxX || pointY < minY || pointY > maxY) {
      return false;
    }
  }
  
  const context = document.getElementById("canvas").getContext("2d");
  
  switch (type) {
    case TOOL_ITEMS.LINE:
    case TOOL_ITEMS.ARROW:
      return isPointCloseToLine(x1, y1, x2, y2, pointX, pointY);
    case TOOL_ITEMS.RECTANGLE:
    case TOOL_ITEMS.CIRCLE:
      return (
        isPointCloseToLine(x1, y1, x2, y1, pointX, pointY) ||
        isPointCloseToLine(x2, y1, x2, y2, pointX, pointY) ||
        isPointCloseToLine(x2, y2, x1, y2, pointX, pointY) ||
        isPointCloseToLine(x1, y2, x1, y1, pointX, pointY)
      );
    case TOOL_ITEMS.BRUSH:
      try {
        return context.isPointInPath(element.path, pointX, pointY);
      } catch (error) {
        return false;
      }
    case TOOL_ITEMS.TEXT:
      if (!element.text || element.text.trim() === "") return false;
      
      context.font = `${element.size}px Caveat`;
      const textWidth = context.measureText(element.text).width;
      const textHeight = parseInt(element.size);
      
      const padding = 3;
      const baselineOffset = textHeight * 0.2;
      
      const textLeft = x1 - padding;
      const textRight = x1 + textWidth + padding;
      const textTop = y1 - baselineOffset - padding;
      const textBottom = y1 + textHeight - baselineOffset + padding;
      
      return (
        pointX >= textLeft && 
        pointX <= textRight && 
        pointY >= textTop && 
        pointY <= textBottom
      );
    default:
      return false;
  }
};

export const isPointNearSelectedElement = (element, pointX, pointY) => {
  const { x1, y1, x2, y2, type } = element;
  
  const elementLeft = Math.min(x1, x2);
  const elementRight = Math.max(x1, x2);
  const elementTop = Math.min(y1, y2);
  const elementBottom = Math.max(y1, y2);
  
  const padding = 15;
  
  if (type === TOOL_ITEMS.TEXT && element.text) {
    const context = document.getElementById("canvas").getContext("2d");
    context.font = `${element.size}px Caveat`;
    const textWidth = context.measureText(element.text).width;
    const textHeight = parseInt(element.size);
    
    return (
      pointX >= x1 - padding && 
      pointX <= x1 + textWidth + padding && 
      pointY >= y1 - padding && 
      pointY <= y1 + textHeight + padding
    );
  }
  
  if (type === TOOL_ITEMS.BRUSH && element.points) {
    const context = document.getElementById("canvas").getContext("2d");
    try {
      const tempCanvas = document.createElement('canvas');
      const tempContext = tempCanvas.getContext('2d');
      tempContext.lineWidth = 10;
      tempContext.strokeStyle = 'black';
      const thickPath = new Path2D();
      
      if (element.points.length > 1) {
        thickPath.moveTo(element.points[0].x, element.points[0].y);
        for (let i = 1; i < element.points.length; i++) {
          thickPath.lineTo(element.points[i].x, element.points[i].y);
        }
      }
      
      return tempContext.isPointInStroke(thickPath, pointX, pointY);
    } catch (error) {
      return element.points.some(point => 
        Math.abs(point.x - pointX) <= padding && 
        Math.abs(point.y - pointY) <= padding
      );
    }
  }
  
  return (
    pointX >= elementLeft - padding && 
    pointX <= elementRight + padding && 
    pointY >= elementTop - padding && 
    pointY <= elementBottom + padding
  );
};

export const isElementInSelection = (element, selectionArea) => {
  const { startX, startY, endX, endY } = selectionArea;
  const { x1, y1, x2, y2, type } = element;
  
  const selectionLeft = Math.min(startX, endX);
  const selectionRight = Math.max(startX, endX);
  const selectionTop = Math.min(startY, endY);
  const selectionBottom = Math.max(startY, endY);
  
  const selectionWidth = selectionRight - selectionLeft;
  const selectionHeight = selectionBottom - selectionTop;
  const isSmallSelection = selectionWidth < 20 && selectionHeight < 20;
  
  const elementLeft = Math.min(x1, x2);
  const elementRight = Math.max(x1, x2);
  const elementTop = Math.min(y1, y2);
  const elementBottom = Math.max(y1, y2);
  
  if (type === TOOL_ITEMS.TEXT && element.text) {
    const context = document.getElementById("canvas").getContext("2d");
    context.font = `${element.size}px Caveat`;
    const textWidth = context.measureText(element.text).width;
    const textHeight = parseInt(element.size);
    
    const textLeft = x1;
    const textRight = x1 + textWidth;
    const textTop = y1;
    const textBottom = y1 + textHeight;
    
    if (isSmallSelection) {
      return (
        selectionLeft < textRight &&
        selectionRight > textLeft &&
        selectionTop < textBottom &&
        selectionBottom > textTop
      );
    }
    
    return (
      textLeft >= selectionLeft &&
      textRight <= selectionRight &&
      textTop >= selectionTop &&
      textBottom <= selectionBottom
    );
  }
  
  if (type === TOOL_ITEMS.BRUSH && element.points) {
    if (isSmallSelection) {
      return element.points.some(point =>
        point.x >= selectionLeft && point.x <= selectionRight &&
        point.y >= selectionTop && point.y <= selectionBottom
      );
    }
    
    return element.points.every(point =>
      point.x >= selectionLeft && point.x <= selectionRight &&
      point.y >= selectionTop && point.y <= selectionBottom
    );
  }
  
  if (isSmallSelection) {
    return (
      elementLeft < selectionRight &&
      elementRight > selectionLeft &&
      elementTop < selectionBottom &&
      elementBottom > selectionTop
    );
  }
  
  return (
    elementLeft >= selectionLeft &&
    elementRight <= selectionRight &&
    elementTop >= selectionTop &&
    elementBottom <= selectionBottom
  );
};

export const getSvgPathFromStroke = (stroke) => {
  if (!stroke.length) return "";

  const d = stroke.reduce(
    (acc, [x0, y0], i, arr) => {
      const [x1, y1] = arr[(i + 1) % arr.length];
      acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
      return acc;
    },
    ["M", ...stroke[0], "Q"]
  );

  d.push("Z");
  return d.join(" ");
};
