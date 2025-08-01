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
  roomUsers: [],
  isConnected: false,
  boardMouseDownHandler: () => {},
  changeToolHandler: () => {},
  boardMouseMoveHandler: () => {},
  boardMouseUpHandler: () => {},
  deleteSelected: () => {},
  copySelected: () => {},
  paste: () => {},
  saveCanvas: () => {},
  loadCanvas: () => {},
  autoSave: () => {},
  updateName: () => {},
  shareCanvas: () => {},
  removeShare: () => {},
  updateSharePermission: () => {},
});

export default boardContext;
