import React, { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Board from "../components/Board";
import Toolbar from "../components/Toolbar";
import Toolbox from "../components/Toolbox";
import BoardProvider from "../store/BoardProvider";
import ToolboxProvider from "../store/ToolboxProvider";
import boardContext from "../store/board-context";
import Notification from "../components/Notification";

const CanvasContent = () => {
  const { elements, loadCanvas } = useContext(boardContext);
  const navigate = useNavigate();
  const [notification, setNotification] = useState(null);

  // useEffect(() => {
    // Check if there's auto-saved data and load it
    // const autoSavedData = canvasPersistenceService.loadAutoSavedCanvasData();
    // if (autoSavedData && autoSavedData.elements && autoSavedData.elements.length > 0) {
    //   console.log('Loading auto-saved canvas data...');
    //   setNotification({
    //     message: `Loaded ${autoSavedData.elements.length} elements from your previous session`,
    //     type: 'success'
    //   });
    // }
  // }, []);


  return (
    <>
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}
      <Toolbar />
      <Board />
      <Toolbox />
    </>
  );
};

const Canvas = () => {
  return (
    <BoardProvider>
      <ToolboxProvider>
        <CanvasContent />
      </ToolboxProvider>
    </BoardProvider>
  );
};

export default Canvas; 