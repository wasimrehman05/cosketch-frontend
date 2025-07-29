import { createContext } from "react";

const boardContext = createContext({
  activeToolItem: "",
  toolActionType: "",
  elements: [],
  history: [[]],
  index: 0,
  selectedElements: [],
  selectionArea: null,
  clipboard: [],
  boardMouseDownHandler: () => {},
  changeToolHandler: () => {},
  boardMouseMoveHandler: () => {},
  boardMouseUpHandler: () => {},
  deleteSelected: () => {},
  copySelected: () => {},
  paste: () => {},
});

export default boardContext;
