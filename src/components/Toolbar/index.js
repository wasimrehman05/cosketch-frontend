import React, { useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
import { useAppContext } from "../../context/AppContext";

const Toolbar = () => {
  const { name, owner, shared_with, activeToolItem, changeToolHandler, undo, redo, updateName, shareCanvas, removeShare, updateSharePermission } = useContext(boardContext);
  const { user } = useAppContext();
  let [editing, setEditing] = useState(false);
  const [newSharedUser, setNewSharedUser] = useState({
    email: "",
    canEdit: false
  });

  const navigate = useNavigate();

  const [isSharePopupOpen, setIsSharePopupOpen] = useState(false);
  const [shareMessage, setShareMessage] = useState(null);

  const handleDownloadClick = () => {
    const canvas = document.getElementById("canvas");
    const data = canvas.toDataURL("image/png");
    const anchor = document.createElement("a");
    anchor.href = data;
    anchor.download = "board.png";
    anchor.click();
  };

  const handleProjectNameChange = (e) => {
    updateName(e.target.value);
  };

  const handleProjectNameKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.target.blur();
    }
  };

  const handleShareSubmit = async (e) => {
    e.preventDefault();
    
    if (!newSharedUser.email.trim()) {
      setShareMessage({ type: 'error', text: 'Please enter an email address' });
      return;
    }

    try {
      const result = await shareCanvas(newSharedUser.email, newSharedUser.canEdit);
      
      if (result.success) {
        setShareMessage({ type: 'success', text: result.message });
        setNewSharedUser({ email: "", canEdit: false });
        setIsSharePopupOpen(false);
      } else {
        setShareMessage({ type: 'error', text: result.message });
      }
    } catch (error) {
      setShareMessage({ type: 'error', text: 'Failed to share canvas. Please try again.' });
    }

    // Clear message after 3 seconds
    setTimeout(() => setShareMessage(null), 3000);
  };

  const handleUpdatePermission = async (userId, canEdit) => {
    try {
      const result = await updateSharePermission(userId, canEdit);
      
      if (result.success) {
        setShareMessage({ type: 'success', text: result.message });
      } else {
        setShareMessage({ type: 'error', text: result.message });
      }
    } catch (error) {
      setShareMessage({ type: 'error', text: 'Failed to update permission. Please try again.' });
    }

    // Clear message after 3 seconds
    setTimeout(() => setShareMessage(null), 3000);
  };

  const handleRemoveShare = async (userId) => {
    try {
      const result = await removeShare(userId);
      
      if (result.success) {
        setShareMessage({ type: 'success', text: result.message });
      } else {
        setShareMessage({ type: 'error', text: result.message });
      }
    } catch (error) {
      setShareMessage({ type: 'error', text: 'Failed to remove share. Please try again.' });
    }

    // Clear message after 3 seconds
    setTimeout(() => setShareMessage(null), 3000);
  };

  useEffect(() => {
    if (!(user && owner && shared_with)) return;

    if (user.email === owner.email) {
      console.log("owner");
      setEditing(true);
    } else if (shared_with.some(shared => shared.user.email === user.email && shared.canEdit)) {
      console.log("editor");
      setEditing(true);
    } else {
      console.log("viewer");
      setEditing(false);
    }
  }, [user, owner, shared_with]);

  useEffect(() => {
    if (editing) {
      changeToolHandler(TOOL_ITEMS.BRUSH);
    } else {
      changeToolHandler(TOOL_ITEMS.NONE);
    }
  }, [editing, changeToolHandler]);

  return (
    <>
      {shareMessage && (
        <div className={`${classes.shareNotification} ${classes[shareMessage.type]}`}>
          {shareMessage.text}
        </div>
      )}
      <div className={classes.container}>
      <div className={classes.left}>
        <div className={classes.btn}>
          <FaArrowLeft onClick={() => navigate("/")} />
        </div>
        <input
          type="text"
          value={name || "Untitled Canvas"}
          onChange={handleProjectNameChange}
          onKeyDown={handleProjectNameKeyDown}
          className={classes.projectName}
          disabled={!editing}
          autoFocus={false}
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
              <form className={classes.shareInputGroup} onSubmit={handleShareSubmit}>
                <input
                  type="email"
                  placeholder="Enter email address"
                  className={classes.shareInput}
                  onChange={(e) => setNewSharedUser({ ...newSharedUser, email: e.target.value })}
                />
                <div className={classes.permissionGroup}>
                  <input type="checkbox" id="editor" className={classes.checkbox} onChange={(e) => setNewSharedUser({ ...newSharedUser, canEdit: e.target.checked })} />
                  <label htmlFor="editor" className={classes.checkboxLabel}>Editor</label>
                </div>
                <button className={classes.shareButton} type="submit">Share</button>
              </form>
            </div>
            <div className={classes.sharedList}>
              <h4 className={classes.sharedTitle}>Shared with</h4>
              <div className={classes.sharedItem}>
                <span>{owner.email} {user.email === owner.email && <strong>(you)</strong>}</span>
                <strong className={classes.ownerBadge}>Owner</strong>
              </div>
              {shared_with.map((shared) => (
                <div className={classes.sharedItem} key={shared.user.email}>
                  <div className={classes.sharedUserInfo}>
                    <span>{shared.user.email} {shared.user.email === user.email && <strong>(you)</strong>}</span>
                  </div>
                  {user.email === owner.email ? (
                    <div className={classes.sharedActions}>
                      <select 
                        className={`${classes.permissionSelect} ${shared.canEdit ? classes.editorBadge : classes.viewerBadge}`}
                        value={shared.canEdit ? "editor" : "viewer"}
                        onChange={(e) => handleUpdatePermission(shared.user._id, e.target.value === "editor")}
                      >
                        <option value="viewer">Viewer</option>
                        <option value="editor">Editor</option>
                      </select>
                      <button 
                        className={classes.removeButton}
                        onClick={() => handleRemoveShare(shared.user._id)}
                        title="Remove access"
                      >
                        ×
                      </button>
                    </div>
                  ): (
                    <div className={classes.sharedActions}>
                      <strong className={shared.canEdit ? classes.editorBadge : classes.viewerBadge}>
                        {shared.canEdit ? "Editor" : "Viewer"}
                      </strong>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
    </>
  );
};

export default Toolbar;
