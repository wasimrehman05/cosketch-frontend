import React, { useContext, useState, useEffect } from "react";
import classes from "./index.module.css";

import cx from "classnames";
import {
  FaSlash,
  FaRegCircle,
  FaArrowRight,
  FaPaintBrush,
  FaEraser,
  FaUndoAlt,
  FaRedoAlt,
  FaFont,
  FaDownload,
  FaRegObjectGroup,
  FaArrowLeft,
  FaUserPlus
} from "react-icons/fa";
import { LuRectangleHorizontal } from "react-icons/lu";
import { TOOL_ITEMS } from "../../constants";
import boardContext from "../../store/board-context";

const Toolbar = ({ editing = true }) => {
  const { activeToolItem, changeToolHandler, undo, redo } =
    useContext(boardContext);

  const [projectName, setProjectName] = useState("My Boards Canvas");
  const [isSharePopupOpen, setIsSharePopupOpen] = useState(false);

  const handleDownloadClick = () => {
    const canvas = document.getElementById("canvas");
    const data = canvas.toDataURL("image/png");
    const anchor = document.createElement("a");
    anchor.href = data;
    anchor.download = "board.png";
    anchor.click();
  };

  const handleProjectNameChange = (e) => {
    setProjectName(e.target.value);
  };

  const handleProjectNameKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.target.blur();
    }
  };

  useEffect(() => {
    if (editing) {
      changeToolHandler(TOOL_ITEMS.BRUSH);
    } else {
      changeToolHandler(TOOL_ITEMS.NONE);
    }
  }, [editing, changeToolHandler]);

  return (
    <div className={classes.container}>
      <div className={classes.left}>
        <div className={classes.btn}>
          <FaArrowLeft />
        </div>
        <input
          type="text"
          value={projectName}
          onChange={handleProjectNameChange}
          onKeyDown={handleProjectNameKeyDown}
          className={classes.projectName}
          disabled={!editing}
          autoFocus={editing}
          spellCheck="false"
          autoComplete="off"
        />
      </div>
      {editing && (
        <div className={classes.toolItems}>
          <div
            className={cx(classes.toolItem, {
              [classes.active]: activeToolItem === TOOL_ITEMS.SELECTION,
            })}
            onClick={() => changeToolHandler(TOOL_ITEMS.SELECTION)}
          >
            <FaRegObjectGroup />
          </div>
          <div
            className={cx(classes.toolItem, {
              [classes.active]: activeToolItem === TOOL_ITEMS.BRUSH,
            })}
            onClick={() => changeToolHandler(TOOL_ITEMS.BRUSH)}
          >
            <FaPaintBrush />
          </div>
          <div
            className={cx(classes.toolItem, {
              [classes.active]: activeToolItem === TOOL_ITEMS.LINE,
            })}
            onClick={() => changeToolHandler(TOOL_ITEMS.LINE)}
          >
            <FaSlash />
          </div>
          <div
            className={cx(classes.toolItem, {
              [classes.active]: activeToolItem === TOOL_ITEMS.RECTANGLE,
            })}
            onClick={() => changeToolHandler(TOOL_ITEMS.RECTANGLE)}
          >
            <LuRectangleHorizontal />
          </div>
          <div
            className={cx(classes.toolItem, {
              [classes.active]: activeToolItem === TOOL_ITEMS.CIRCLE,
            })}
            onClick={() => changeToolHandler(TOOL_ITEMS.CIRCLE)}
          >
            <FaRegCircle />
          </div>
          <div
            className={cx(classes.toolItem, {
              [classes.active]: activeToolItem === TOOL_ITEMS.ARROW,
            })}
            onClick={() => changeToolHandler(TOOL_ITEMS.ARROW)}
          >
            <FaArrowRight />
          </div>
          <div
            className={cx(classes.toolItem, {
              [classes.active]: activeToolItem === TOOL_ITEMS.ERASER,
            })}
            onClick={() => changeToolHandler(TOOL_ITEMS.ERASER)}
          >
            <FaEraser />
          </div>
          <div
            className={cx(classes.toolItem, {
              [classes.active]: activeToolItem === TOOL_ITEMS.TEXT,
            })}
            onClick={() => changeToolHandler(TOOL_ITEMS.TEXT)}
          >
            <FaFont />
          </div>
          <div
            className={cx(classes.toolItem, {
              [classes.disabled]: activeToolItem === TOOL_ITEMS.NONE,
            })}
            onClick={activeToolItem === TOOL_ITEMS.NONE ? undefined : undo}
          >
            <FaUndoAlt />
          </div>
          <div
            className={cx(classes.toolItem, {
              [classes.disabled]: activeToolItem === TOOL_ITEMS.NONE,
            })}
            onClick={activeToolItem === TOOL_ITEMS.NONE ? undefined : redo}
          >
            <FaRedoAlt />
          </div>
          <div className={classes.toolItem} onClick={handleDownloadClick}>
            <FaDownload />
          </div>
        </div>
      )}
      <div className={classes.right}>
        <div className={classes.btn} onClick={() => setIsSharePopupOpen(!isSharePopupOpen)}>
          <FaUserPlus />
        </div>
        {isSharePopupOpen && (
          <div className={classes.popup}>
            <div className={classes.shareBox}>
              <h3 className={classes.shareTitle}>Share Board</h3>
              <div className={classes.shareInputGroup}>
                <input 
                  type="email" 
                  placeholder="Enter email address" 
                  className={classes.shareInput}
                />
                <div className={classes.permissionGroup}>
                  <input type="checkbox" id="editor" className={classes.checkbox} />
                  <label htmlFor="editor" className={classes.checkboxLabel}>Editor</label>
                </div>
                <button className={classes.shareButton}>Share</button>
              </div>
            </div>
            <div className={classes.sharedList}>
              <h4 className={classes.sharedTitle}>Shared with</h4>
              <div className={classes.sharedItem}>
                <span>owner@gmail.com</span>
                <strong className={classes.ownerBadge}>Owner</strong>
              </div>
              <div className={classes.sharedItem}>
                <span>shared@gmail.com</span>
                <strong className={classes.editorBadge}>Editor</strong>
              </div>
              <div className={classes.sharedItem}>
                <span>shared2@gmail.com</span>
                <strong className={classes.viewerBadge}>Viewer</strong>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Toolbar;
