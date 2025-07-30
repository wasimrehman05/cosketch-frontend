import React, { useEffect } from "react";
import {Button, Typography, Card, CardContent, Avatar, Menu, MenuItem, IconButton} from "@mui/material";
import {Edit as EditIcon, Share as ShareIcon, Group as GroupIcon, AccountCircle as AccountIcon, Logout as LogoutIcon} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
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

const Home = () => {
    const navigate = useNavigate();
    const { user, isAuthenticated, logout, checkAuthStatus } = useAppContext();
    const [anchorEl, setAnchorEl] = React.useState(null);

    useEffect(() => {
        if (!isAuthenticated) {
            checkAuthStatus();
        }
    }, [checkAuthStatus, isAuthenticated]);

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
        navigate("/canvas");
    };

    return (
        <div className={styles.container}>
            {/* Header */}
            <header className={styles.header}>
                <Typography variant="h5" className={styles.logo}>
                    Whiteboard
                </Typography>

                <div className={styles.headerActions}>
                    {isAuthenticated ? (
                        <>
                            <Typography variant="body2" className={styles.welcomeText}>
                                Welcome, {user?.name || "User"}
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
                    <div className={styles.contentGrid}>
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
                                    {isAuthenticated ? "Go to Canvas" : "Start drawing"}
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

                        {/* Right Side - Feature Cards */}
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