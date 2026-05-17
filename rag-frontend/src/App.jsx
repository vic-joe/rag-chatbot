import { useEffect, useState } from "react";
import "./App.css";
import PublicLayout from "./layouts/PublicLayout.jsx";
import AdminLayout from "./layouts/AdminLayout.jsx";
import ChatPage from "./pages/ChatPage.jsx";
import AboutPage from "./pages/AboutPage.jsx";
import AdminLoginPage from "./pages/AdminLoginPage.jsx";
import AdminDashboardPage from "./pages/AdminDashboardPage.jsx";
import { isAdminAuthenticated } from "./utils/adminAuth.js";

function normalizePath(pathname) {
    if (pathname.length > 1 && pathname.endsWith("/")) {
        return pathname.slice(0, -1);
    }

    return pathname || "/";
}

function Redirect({ to, replace = true }) {
    useEffect(() => {
        window.history[replace ? "replaceState" : "pushState"]({}, "", to);
        window.dispatchEvent(new PopStateEvent("popstate"));
    }, [replace, to]);

    return null;
}

function ProtectedAdminRoute({ children }) {
    if (!isAdminAuthenticated()) {
        return <Redirect to="/admin/login" />;
    }

    return children;
}

export default function App() {
    const [path, setPath] = useState(() => normalizePath(window.location.pathname));

    useEffect(() => {
        const handlePopState = () => setPath(normalizePath(window.location.pathname));
        window.addEventListener("popstate", handlePopState);

        return () => window.removeEventListener("popstate", handlePopState);
    }, []);

    if (path === "/admin/login") {
        return <AdminLoginPage />;
    }

    if (path === "/admin/dashboard") {
        return (
            <ProtectedAdminRoute>
                <AdminLayout>
                    <AdminDashboardPage />
                </AdminLayout>
            </ProtectedAdminRoute>
        );
    }

    const publicRoutes = {
        "/": <ChatPage />,
        "/chat": <ChatPage />,
        "/about": <AboutPage />,
    };

    return (
        <PublicLayout>
            {publicRoutes[path] ?? <Redirect to="/" />}
        </PublicLayout>
    );
}
