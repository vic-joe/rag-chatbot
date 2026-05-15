import { useState } from "react";
import LoginForm from "../components/admin/loginForm";
import Dashboard from "../components/admin/Dashboard";

export default function AdminLoginPage() {
    const [loggedIn, setLoggedIn] = useState(false);

    const handleLogin = (u, p) => {
        if (u === "admin" && p === "admin") {
            setLoggedIn(true);
            return true;
        }

        return false;
    };

    return loggedIn ? <Dashboard /> : <LoginForm onLogin={handleLogin} />;
}
