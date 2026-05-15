import { useState } from "react";

export default function LoginForm({ onLogin }) {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    const handleSubmit = (event) => {
        event.preventDefault();

        if (!username.trim() || !password.trim()) {
            setError("Enter username and password.");
            return;
        }

        const success = onLogin(username, password);

        if (!success) {
            setError("Invalid credentials.");
        }
    };

    return (
        <section className="admin-login-page" aria-labelledby="admin-login-title">
            <form className="admin-login-card" onSubmit={handleSubmit}>
                <div className="admin-login-header">
                    <p className="eyebrow">Admin access</p>
                    <h2 id="admin-login-title">Sign in to dashboard</h2>
                    <p>Manage documents, uploads, and chatbot knowledge sources.</p>
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
                            placeholder="Enter username"
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

                <button type="submit">Sign in</button>
            </form>
        </section>
    );
}
