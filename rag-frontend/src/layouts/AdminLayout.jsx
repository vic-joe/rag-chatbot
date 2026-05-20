import { useEffect, useState } from "react";
import NavigationLink from "../components/NavigationLink.jsx";
import { clearAdminSession, getAdminSession } from "../utils/adminAuth.js";
import udomLogo from "../assets/udom-logo.svg";

const DashboardIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
    </svg>
);

const UploadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
    </svg>
);

const DocumentIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
        <path d="M14 2v4a2 2 0 0 0 2 2h4" /><path d="M10 9H8" /><path d="M16 13H8" /><path d="M16 17H8" />
    </svg>
);

const VectorIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
);

const UserIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
);

const LogoutIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
    </svg>
);

const adminSections = [
    { id: "overview", label: "Dashboard", detail: "KPIs and system health", icon: <DashboardIcon /> },
    { id: "upload", label: "Upload", detail: "Add knowledge files", icon: <UploadIcon /> },
    { id: "documents", label: "Documents", detail: "Manage indexed content", icon: <DocumentIcon /> },
    { id: "vector", label: "Vector DB", detail: "Index status", icon: <VectorIcon /> },
];

export default function AdminLayout({ children }) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [currentSection, setCurrentSection] = useState(() => window.location.hash.replace("#", "") || "overview");
    const session = getAdminSession();

    useEffect(() => {
        const handleHashChange = () => {
            setCurrentSection(window.location.hash.replace("#", "") || "overview");
        };

        window.addEventListener("hashchange", handleHashChange);
        return () => window.removeEventListener("hashchange", handleHashChange);
    }, []);

    const handleLogout = () => {
        clearAdminSession();
        window.history.replaceState({}, "", "/login");
        window.dispatchEvent(new PopStateEvent("popstate"));
    };

    return (
        <div className={`admin-shell ${isSidebarOpen ? "sidebar-open" : "sidebar-closed"}`}>
            <aside className="admin-sidebar">
                <button
                    type="button"
                    className="sidebar-toggle admin-sidebar-toggle"
                    onClick={() => setIsSidebarOpen((value) => !value)}
                    aria-label={isSidebarOpen ? "Close admin sidebar" : "Open admin sidebar"}
                    title={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
                >
                    <span className="sidebar-toggle-icon" aria-hidden="true">
                        <span />
                        <span />
                    </span>
                </button>

                {isSidebarOpen && (
                    <div className="admin-sidebar-content">
                        <div className="admin-brand">
                            <span className="brand-mark">
                                <img src={udomLogo} alt="The University of Dodoma" />
                            </span>
                            <div>
                                <p className="admin-brand-eyebrow">Admin</p>
                                <h1>UDOM Control</h1>
                            </div>
                        </div>

                        <nav className="admin-side-nav" aria-label="Admin navigation">
                            {adminSections.map((section) => (
                                <a
                                    key={section.id}
                                    href={`/admin/dashboard#${section.id}`}
                                    className={currentSection === section.id ? "active" : ""}
                                >
                                    <span className="admin-nav-icon">{section.icon}</span>
                                    <span className="admin-nav-copy">
                                        <strong>{section.label}</strong>
                                        <small>{section.detail}</small>
                                    </span>
                                </a>
                            ))}
                        </nav>

                        <div className="admin-user-card">
                            <div className="admin-user-info">
                                <span className="admin-user-avatar"><UserIcon /></span>
                                <span>{session?.username || "Admin"}</span>
                            </div>
                            <button type="button" onClick={handleLogout} aria-label="Logout">
                                <LogoutIcon />
                            </button>
                        </div>

                        <NavigationLink to="/" className="admin-public-link" onNavigate={clearAdminSession}>
                            Public site
                        </NavigationLink>
                    </div>
                )}
            </aside>

            <main className="admin-content">{children}</main>
        </div>
    );
}
