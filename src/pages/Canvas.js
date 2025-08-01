import React, { useState } from "react";
import Board from "../components/Board";
import Toolbar from "../components/Toolbar";
import Toolbox from "../components/Toolbox";
import BoardProvider from "../store/BoardProvider";
import ToolboxProvider from "../store/ToolboxProvider";
import Notification from "../components/Notification";

const CanvasContent = () => {
  const [notification, setNotification] = useState(null);

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