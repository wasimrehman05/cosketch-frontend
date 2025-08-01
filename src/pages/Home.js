import React, { useEffect } from "react";
import { Button, Typography, Card, CardContent, Avatar, Menu, MenuItem, IconButton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from "@mui/material";
import { Edit as EditIcon, Share as ShareIcon, Group as GroupIcon, AccountCircle as AccountIcon, Logout as LogoutIcon, Description as DescriptionIcon, OpenInNew as OpenIcon, Delete as DeleteIcon } from "@mui/icons-material";
import { FaUsers } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
import canvasService from "../services/CanvasService";
import styles from "./styles/Home.module.css";


const FeatureCard = ({ title, description, icon, avatarClassName }) => {
    return (
        <Card className={styles.featureCard}>
            <CardContent className={styles.cardContent}>
                <Avatar className={avatarClassName}>{icon}</Avatar>
                <Typography variant="subtitle1" className={styles.cardTitle}>{title}</Typography>
                <Typography variant="body2" className={styles.cardDescription}>{description}</Typography>
            </CardContent>
        </Card>
    );
};

const CanvasTableRow = ({ canvas, user, onCanvasOpen, onCanvasDelete }) => {
    const isOwner = canvas.owner._id === user?._id;
    const isShared = canvas.shared_with && canvas.shared_with.length > 0;
    const lastModified = new Date(canvas.updatedAt).toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });

    return (
        <TableRow className={styles.canvasTableRow}>
            <TableCell className={styles.canvasNameCell}>
                <div className={styles.canvasNameContainer}>
                    <DescriptionIcon className={styles.canvasIcon} />
                    <div className={styles.canvasNameContent}>
                        <Typography variant="body2" className={styles.canvasName}>
                            {canvas.name}
                        </Typography>
                        {isShared && (
                            <FaUsers className={styles.sharedIcon} />
                        )}
                    </div>
                </div>
            </TableCell>
            <TableCell className={styles.canvasOwnerCell}>
                <Typography variant="body2" className={styles.canvasOwner}>
                    {isOwner ? "me" : canvas.owner.name}
                </Typography>
            </TableCell>
            <TableCell className={styles.canvasDateCell}>
                <Typography variant="body2" className={styles.canvasDate}>
                    {lastModified}
                </Typography>
            </TableCell>
            <TableCell className={styles.canvasActionsCell}>
                <div className={styles.canvasActions}>
                    <IconButton 
                        size="small" 
                        className={styles.actionButton}
                        onClick={() => onCanvasOpen(canvas)}
                        title="Open Canvas"
                    >
                        <OpenIcon />
                    </IconButton>
                    {isOwner && (
                        <IconButton 
                            size="small" 
                            className={styles.actionButton}
                            onClick={() => onCanvasDelete(canvas)}
                            title="Delete Canvas"
                        >
                            <DeleteIcon />
                        </IconButton>
                    )}
                </div>
            </TableCell>
        </TableRow>
    );
};

const Home = () => {
    const navigate = useNavigate();
    const { user, token, isAuthenticated, logout, checkAuthStatus } = useAppContext();
    const [anchorEl, setAnchorEl] = React.useState(null);
    const [canvases, setCanvases] = React.useState([]);

    useEffect(() => {
        const fetchCanvases = async () => {
            if (isAuthenticated) {
                const res = await canvasService.getAllCanvas(token);
                if (res.success) {
                    setCanvases(res.data.canvases);
                }
            }
        };

        if (isAuthenticated) {
            fetchCanvases();
        } else {
            checkAuthStatus();
        }
    }, [checkAuthStatus, isAuthenticated, token]);

    const handleCreateNewCanvas = async () => {
        const res = await canvasService.createCanvas(token, {});
        if (res.success) {
            navigate(`/canvas/${res.data.canvas._id}`);
        } else {
            console.error("Failed to create canvas:", res);
        }
    };

    const handleMenuOpen = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
    };

    const handleLogout = () => {
        logout();
        handleMenuClose();
        navigate("/");
    };

    const handleLogin = () => {
        navigate("/login");
    };

    const handleRegister = () => {
        navigate("/register");
    };

    const handleTryCanvas = () => {
        // Clear any existing auto-saved data to start fresh
        localStorage.removeItem('canvas_autosave');
        handleCreateNewCanvas();
    };

    const handleCanvasOpen = (canvas) => {
        
        navigate(`/canvas/${canvas._id}`);
    };

    const handleCanvasDelete = async (canvas) => {
        // TODO: Implement delete functionality
        const res = await canvasService.deleteCanvas(token, canvas._id);
        if (res.success) {
            setCanvases(canvases.filter(c => c._id !== canvas._id));
        } else {
            console.error("Failed to delete canvas:", res);
        }
    };

    return (
        <div className={styles.container}>
            {/* Header */}
            <header className={styles.header}>
                <Typography variant="h5" className={styles.logo}>
                    <img src="/icon.png" alt="CoSketch" className={styles.logoImage} />
                </Typography>

                <div className={styles.headerActions}>
                    {isAuthenticated ? (
                        <>
                            <Typography variant="body2" className={styles.welcomeText}>
                                Hi, <strong>{user?.name || "User"}</strong>
                            </Typography>
                            <IconButton
                                onClick={handleMenuOpen}
                                size="small"
                                className={styles.userMenuButton}
                            >
                                <AccountIcon />
                            </IconButton>
                            <Menu
                                anchorEl={anchorEl}
                                open={Boolean(anchorEl)}
                                onClose={handleMenuClose}
                                slotProps={{
                                    paper: {
                                        className: "mt-2 min-w-[120px] shadow-lg",
                                    },
                                }}
                            >
                                <MenuItem onClick={handleLogout}>
                                    <LogoutIcon className="mr-2 text-lg" />
                                    Logout
                                </MenuItem>
                            </Menu>
                        </>
                    ) : (
                        <div className={styles.authButtons}>
                            <Button
                                variant="text"
                                size="small"
                                className={styles.signInButton}
                                onClick={handleLogin}
                            >
                                Sign in
                            </Button>
                            <Button
                                variant="contained"
                                size="small"
                                className={styles.getStartedButton}
                                onClick={handleRegister}
                            >
                                Get started
                            </Button>
                        </div>
                    )}
                </div>
            </header>

            {/* Main Content */}
            <main className={styles.main}>
                <div className={styles.mainContent}>
                    <div className={`${styles.contentGrid} ${isAuthenticated ? styles.authenticated : ''}`}>
                        {/* Left Side - Hero Content */}
                        <div className={styles.heroSection}>
                            <Typography
                                variant="h3"
                                className={styles.heroTitle}
                            >
                                Create. Collaborate.
                                <br />
                                <span className={styles.heroTitleBold}>Innovate.</span>
                            </Typography>

                            <Typography
                                variant="body1"
                                className={styles.heroDescription}
                            >
                                Transform your ideas into reality with our interactive whiteboard.
                                Draw, write, and collaborate in real-time with your team.
                            </Typography>

                            <div className={styles.heroButtons}>
                                <Button
                                    variant="contained"
                                    size="medium"
                                    className={styles.primaryButton}
                                    onClick={handleTryCanvas}
                                >
                                    {isAuthenticated ? "Create New" : "Start drawing"}
                                </Button>

                                {!isAuthenticated && (
                                    <Button
                                        variant="outlined"
                                        size="medium"
                                        className={styles.secondaryButton}
                                        onClick={handleRegister}
                                    >
                                        Learn more
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Right Side - Canvas Table or Feature Cards */}
                        <div className={styles.rightSection}>
                            {isAuthenticated && canvases.length > 0 ? (
                                <div className={styles.canvasTableContainer}>
                                    <Typography variant="h6" className={styles.canvasTableTitle}>
                                        Recent Canvases
                                    </Typography>
                                    <TableContainer component={Paper} className={styles.canvasTable}>
                                        <Table>
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell className={styles.tableHeader}>Name</TableCell>
                                                    <TableCell className={styles.tableHeader}>Owned by</TableCell>
                                                    <TableCell className={styles.tableHeader}>Last modified</TableCell>
                                                    <TableCell className={styles.tableHeader}>Actions</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {canvases.map((canvas) => (
                                                    <CanvasTableRow 
                                                        key={canvas._id}
                                                        canvas={canvas} 
                                                        user={user}
                                                        onCanvasOpen={handleCanvasOpen}
                                                        onCanvasDelete={handleCanvasDelete}
                                                    />
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                </div>
                            ) : (
                                <div className={styles.featureCards}>
                                    <FeatureCard
                                        title="Draw Freely"
                                        description="Express your ideas with natural drawing tools"
                                        icon={<EditIcon />}
                                        avatarClassName={styles.cardIcon}
                                    />

                                    <FeatureCard
                                        title="Collaborate"
                                        description="Work together in real-time with your team"
                                        icon={<GroupIcon />}
                                        avatarClassName={`${styles.cardIcon} ${styles.cardIconGreen}`}
                                    />

                                    <FeatureCard
                                        title="Share Ideas"
                                        description="Export and share your creations easily"
                                        icon={<ShareIcon />}
                                        avatarClassName={`${styles.cardIcon} ${styles.cardIconOrange}`}
                                    />

                                    <FeatureCard
                                        title="Smart Tools"
                                        description="Advanced drawing and editing capabilities"
                                        icon={<EditIcon />}
                                        avatarClassName={`${styles.cardIcon} ${styles.cardIconPurple}`}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className={styles.footer}>
                <Typography variant="body2" className={styles.footerText}>
                    © 2024 Whiteboard. All rights reserved.
                </Typography>
            </footer>
        </div>
    );
};

export default Home; 