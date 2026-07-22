import { MoonIcon, SunIcon } from "@/assets/icons/ExportSvg"
import styles from "./Navbar.module.scss"

interface NavbarProps {
    theme: string;
    toggleTheme: () => void;
}

const Navbar = ({ theme, toggleTheme }: NavbarProps) => {
    return (
        <div className={styles["navbar-container"]}>
            <div className={styles.left}>
                <span className={styles["page-title"]}>Main Dashboard</span>
            </div>
            
            <div className={styles.right}>
                <button 
                    className={styles.themeToggle} 
                    onClick={toggleTheme}
                    title={theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
                >
                    {theme === "light" ? <MoonIcon /> : <SunIcon />}
                </button>
                <a className={styles["nav-link"]}>Documentation</a>
                <a className={styles["nav-link"]}>Feedback</a>
                <div className={styles.notification}>
                    {/* Placeholder for notification icon */}
                </div>
            </div>
        </div>
    )
}

export default Navbar