import { useEffect, useState } from "react";
import NavigationLink from "../components/NavigationLink.jsx";
import { clearAdminSession, getAdminSession } from "../utils/adminAuth.js";

const adminSections = [
    { id: "overview", label: "Dashboard", detail: "KPIs and system health" },
    { id: "upload", label: "Upload", detail: "Add knowledge files" },
    { id: "documents", label: "Documents", detail: "Manage indexed content" },
    { id: "vector", label: "Vector DB", detail: "Index status" },
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
        window.history.replaceState({}, "", "/admin/login");
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
                            <span className="brand-mark">A</span>
                            <div>
                                <p className="eyebrow">Admin</p>
                                <h1>Control room</h1>
                            </div>
                        </div>

                        <nav className="admin-side-nav" aria-label="Admin navigation">
                            {adminSections.map((section) => (
                                <a
                                    key={section.id}
                                    href={`/admin/dashboard#${section.id}`}
                                    className={currentSection === section.id ? "active" : ""}
                                >
                                    <span>{section.label}</span>
                                    <small>{section.detail}</small>
                                </a>
                            ))}
                        </nav>

                        <div className="admin-user-card">
                            <span>{session?.username || "Admin"}</span>
                            <button type="button" onClick={handleLogout}>Logout</button>
                        </div>

                        <NavigationLink to="/" className="admin-public-link">
                            Public site
                        </NavigationLink>
                    </div>
                )}
            </aside>

            <main className="admin-content">{children}</main>
        </div>
    );
}
