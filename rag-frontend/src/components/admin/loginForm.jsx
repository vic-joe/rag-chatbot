import { useState } from "react";

const LockIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
);
const UserIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
    </svg>
);
const KeyIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="7.5" cy="15.5" r="5.5" />
        <path d="m21 2-9.6 9.6" />
        <path d="m15.5 7.5 3 3L22 7l-3-3" />
    </svg>
);
const AlertIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
);
const ArrowRight = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="5" y1="12" x2="19" y2="12" />
        <polyline points="12 5 19 12 12 19" />
    </svg>
);

export default function LoginForm({ onLogin }) {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [focused, setFocused] = useState(null);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError("");

        if (!username.trim() || !password.trim()) {
            setError("Please enter both username and password.");
            return;
        }

        setIsLoading(true);
        try {
            await onLogin(username, password);
        } catch (loginError) {
            setError(loginError.message || "Invalid credentials. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div style={styles.wrapper}>
            <div style={styles.card}>
                {/* Header */}
                <div style={styles.header}>
                    <div style={styles.iconBadge}>
                        <LockIcon />
                    </div>
                    <span style={styles.eyebrow}>Admin Access</span>
                    <h2 style={styles.title}>Welcome back</h2>
                    <p style={styles.subtitle}>Sign in with your administrator credentials to continue.</p>
                </div>

                {/* Form */}
                <form style={styles.form} onSubmit={handleSubmit}>
                    <div style={styles.fields}>
                        {/* Username */}
                        <div style={styles.fieldGroup}>
                            <label style={styles.label} htmlFor="username">Username</label>
                            <div style={{
                                ...styles.inputWrapper,
                                ...(focused === "username" ? styles.inputWrapperFocused : {}),
                            }}>
                                <span style={styles.inputIcon}><UserIcon /></span>
                                <input
                                    id="username"
                                    style={styles.input}
                                    value={username}
                                    onChange={(e) => { setUsername(e.target.value); setError(""); }}
                                    onFocus={() => setFocused("username")}
                                    onBlur={() => setFocused(null)}
                                    autoComplete="username"
                                    placeholder="admin"
                                    required
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div style={styles.fieldGroup}>
                            <label style={styles.label} htmlFor="password">Password</label>
                            <div style={{
                                ...styles.inputWrapper,
                                ...(focused === "password" ? styles.inputWrapperFocused : {}),
                            }}>
                                <span style={styles.inputIcon}><KeyIcon /></span>
                                <input
                                    id="password"
                                    style={styles.input}
                                    type="password"
                                    value={password}
                                    onChange={(e) => { setPassword(e.target.value); setError(""); }}
                                    onFocus={() => setFocused("password")}
                                    onBlur={() => setFocused(null)}
                                    autoComplete="current-password"
                                    placeholder="Enter password"
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div style={styles.errorBox} role="alert">
                            <AlertIcon />
                            <span>{error}</span>
                        </div>
                    )}

                    <button
                        type="submit"
                        style={{ ...styles.button, ...(isLoading ? styles.buttonDisabled : {}) }}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <span style={styles.buttonInner}>
                                <span style={styles.spinner} />
                                Signing in...
                            </span>
                        ) : (
                            <span style={styles.buttonInner}>
                                Sign in to dashboard
                                <ArrowRight />
                            </span>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}

const styles = {
    wrapper: {
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #0d1520 0%, #111827 50%, #0d1a2e 100%)",
        padding: "24px",
    },
    card: {
        width: "100%",
        maxWidth: "420px",
        background: "#1a2332",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "24px",
        padding: "40px",
        boxShadow: "0 25px 50px rgba(0,0,0,0.5), 0 0 0 1px rgba(99,179,164,0.05)",
    },
    header: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        gap: "8px",
        marginBottom: "32px",
    },
    iconBadge: {
        width: "56px",
        height: "56px",
        borderRadius: "16px",
        background: "linear-gradient(135deg, rgba(99,179,164,0.15), rgba(99,179,164,0.05))",
        border: "1px solid rgba(99,179,164,0.2)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#63b3a4",
        marginBottom: "8px",
    },
    eyebrow: {
        fontSize: "11px",
        fontWeight: "700",
        letterSpacing: "1.5px",
        textTransform: "uppercase",
        color: "#63b3a4",
    },
    title: {
        fontSize: "24px",
        fontWeight: "700",
        color: "#f0f4f8",
        margin: 0,
        letterSpacing: "-0.3px",
    },
    subtitle: {
        fontSize: "14px",
        color: "#718096",
        margin: 0,
        lineHeight: 1.5,
    },
    form: {
        display: "flex",
        flexDirection: "column",
        gap: "20px",
    },
    fields: {
        display: "flex",
        flexDirection: "column",
        gap: "16px",
    },
    fieldGroup: {
        display: "flex",
        flexDirection: "column",
        gap: "6px",
    },
    label: {
        fontSize: "13px",
        fontWeight: "600",
        color: "#a0aec0",
        letterSpacing: "0.2px",
    },
    inputWrapper: {
        display: "flex",
        alignItems: "center",
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "12px",
        transition: "border-color 0.2s, box-shadow 0.2s",
        overflow: "hidden",
    },
    inputWrapperFocused: {
        borderColor: "rgba(99,179,164,0.5)",
        boxShadow: "0 0 0 3px rgba(99,179,164,0.1)",
    },
    inputIcon: {
        display: "flex",
        alignItems: "center",
        paddingLeft: "14px",
        color: "#4a5568",
        flexShrink: 0,
    },
    input: {
        flex: 1,
        background: "transparent",
        border: "none",
        outline: "none",
        padding: "13px 14px",
        fontSize: "14px",
        color: "#e2e8f0",
        width: "100%",
    },
    errorBox: {
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "12px 14px",
        borderRadius: "10px",
        background: "rgba(252,129,74,0.08)",
        border: "1px solid rgba(252,129,74,0.2)",
        color: "#fc814a",
        fontSize: "13px",
    },
    button: {
        width: "100%",
        padding: "14px",
        borderRadius: "12px",
        border: "none",
        background: "linear-gradient(135deg, #63b3a4, #4a9080)",
        color: "#0d1520",
        fontSize: "14px",
        fontWeight: "700",
        cursor: "pointer",
        transition: "opacity 0.2s, transform 0.1s",
        letterSpacing: "0.2px",
    },
    buttonDisabled: {
        opacity: 0.7,
        cursor: "not-allowed",
    },
    buttonInner: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
    },
    spinner: {
        width: "16px",
        height: "16px",
        border: "2px solid rgba(13,21,32,0.3)",
        borderTop: "2px solid #0d1520",
        borderRadius: "50%",
        animation: "spin 0.8s linear infinite",
        display: "inline-block",
    },
};
