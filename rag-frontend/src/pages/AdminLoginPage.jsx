import { useEffect } from "react";
import LoginForm from "../components/admin/loginForm.jsx";
import NavigationLink from "../components/NavigationLink.jsx";
import { isAdminAuthenticated, loginAdmin } from "../utils/adminAuth.js";

export default function AdminLoginPage() {
    useEffect(() => {
        if (isAdminAuthenticated()) {
            window.history.replaceState({}, "", "/admin/dashboard");
            window.dispatchEvent(new PopStateEvent("popstate"));
        }
    }, []);

    const handleLogin = async (username, password) => {
        await loginAdmin(username, password);
        window.history.replaceState({}, "", "/admin/dashboard");
        window.dispatchEvent(new PopStateEvent("popstate"));
    };

    return (
        <section className="admin-login-page" aria-labelledby="admin-login-title">
            <div className="admin-login-shell">
                <div className="admin-login-copy">
                    <p className="eyebrow">Secure admin workspace</p>
                    <h1>Manage the knowledge base behind the assistant.</h1>
                    <p>
                        Upload source files, monitor vector indexing, and keep chatbot answers grounded in current documents.
                    </p>
                    <NavigationLink to="/" className="back-link">Back to public site</NavigationLink>
                </div>

                <LoginForm onLogin={handleLogin} />
            </div>
        </section>
    );
}
