import { useState } from "react";
import DocumentManager from "./DocumentManager";
import UploadCard from "./UploadCard";

export default function Dashboard() {
    const [refreshKey, setRefreshKey] = useState(0);
    const [activeSection, setActiveSection] = useState("documents");
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    return (
        <div className={`admin-page ${isSidebarOpen ? "sidebar-open" : "sidebar-closed"}`}>
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
                        <div>
                            <p className="eyebrow">Admin</p>
                            <h1>Control room</h1>
                        </div>

                        <nav className="admin-side-nav" aria-label="Admin sections">
                            <button
                                type="button"
                                className={activeSection === "documents" ? "active" : ""}
                                onClick={() => setActiveSection("documents")}
                            >
                                <span>Documents</span>
                                <small>Review, edit, delete</small>
                            </button>
                            <button
                                type="button"
                                className={activeSection === "upload" ? "active" : ""}
                                onClick={() => setActiveSection("upload")}
                            >
                                <span>Upload</span>
                                <small>Add PDF or DOCX</small>
                            </button>
                        </nav>
                    </div>
                )}
            </aside>

            <div className="admin-content">
                {activeSection === "documents" ? (
                    <DocumentManager refreshKey={refreshKey} />
                ) : (
                    <UploadCard onUploaded={() => setRefreshKey((value) => value + 1)} />
                )}
            </div>
        </div>
    );
}
