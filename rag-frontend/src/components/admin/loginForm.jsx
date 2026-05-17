import { useState } from "react";

export default function LoginForm({ onLogin }) {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    const handleSubmit = (event) => {
        event.preventDefault();
        setError("");

        if (!username.trim() || !password.trim()) {
            setError("Enter username and password.");
            return;
        }

        try {
            onLogin(username, password);
        } catch (loginError) {
            setError(loginError.message || "Invalid credentials.");
        }
    };

    return (
        <form className="admin-login-card" onSubmit={handleSubmit}>
            <div className="admin-login-header">
                <p className="eyebrow">Admin access</p>
                <h2 id="admin-login-title">Sign in</h2>
                <p>Use your administrator credentials to continue.</p>
            </div>

            <div className="admin-login-fields">
                <label>
                    Username
                    <input
                        value={username}
                        onChange={(event) => {
                            setUsername(event.target.value);
                            setError("");
                        }}
                        autoComplete="username"
                        placeholder="admin"
                        required
                    />
                </label>

                <label>
                    Password
                    <input
                        type="password"
                        value={password}
                        onChange={(event) => {
                            setPassword(event.target.value);
                            setError("");
                        }}
                        autoComplete="current-password"
                        placeholder="Enter password"
                        required
                    />
                </label>
            </div>

            {error && <p className="form-error" role="alert">{error}</p>}

            <button type="submit">Sign in to dashboard</button>
        </form>
    );
}
