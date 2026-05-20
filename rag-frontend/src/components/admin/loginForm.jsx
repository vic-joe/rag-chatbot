import { useState } from "react";
import udomLogo from "../../assets/udom-logo.svg";

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

    const handleChatLinkClick = (event) => {
        if (
            event.metaKey ||
            event.ctrlKey ||
            event.shiftKey ||
            event.altKey ||
            event.button !== 0
        ) {
            return;
        }

        event.preventDefault();
        window.history.pushState({}, "", "/chat");
        window.dispatchEvent(new PopStateEvent("popstate"));
    };

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
                        <img src={udomLogo} alt="The University of Dodoma" style={styles.logo} />
                    </div>
                    <span style={styles.eyebrow}>UDOM Chatbot</span>
                    <h2 style={styles.title}>Sign in</h2>
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
                                    placeholder="Username"
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
                                Sign in
                                <ArrowRight />
                            </span>
                        )}
                    </button>
                </form>

                <div style={styles.chatLinkWrap}>
                    <a href="/chat" style={styles.chatLink} onClick={handleChatLinkClick}>
                        Continue to chat
                    </a>
                </div>
            </div>
        </div>
    );
}

const styles = {
    wrapper: {
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
    },
    card: {
        width: "100%",
        maxWidth: "420px",
        background: "rgba(255, 253, 248, 0.96)",
        border: "1px solid #ded6c8",
        borderRadius: "18px",
        padding: "34px",
        boxShadow: "0 24px 70px rgba(47, 43, 37, 0.16)",
    },
    header: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        gap: "10px",
        marginBottom: "28px",
    },
    iconBadge: {
        width: "78px",
        height: "78px",
        borderRadius: "50%",
        background: "#050505",
        border: "1px solid #d8d1c3",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: "2px",
        overflow: "hidden",
    },
    logo: {
        width: "100%",
        height: "100%",
        objectFit: "cover",
        display: "block",
    },
    eyebrow: {
        fontSize: "11px",
        fontWeight: "700",
        letterSpacing: "1.2px",
        textTransform: "uppercase",
        color: "#9a4f35",
    },
    title: {
        fontSize: "28px",
        fontWeight: "700",
        color: "#2b2925",
        margin: 0,
        letterSpacing: 0,
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
        color: "#5f594f",
        letterSpacing: "0.2px",
    },
    inputWrapper: {
        display: "flex",
        alignItems: "center",
        background: "#ffffff",
        border: "1px solid #d7d0c1",
        borderRadius: "12px",
        transition: "border-color 0.2s, box-shadow 0.2s",
        overflow: "hidden",
    },
    inputWrapperFocused: {
        borderColor: "#d96c47",
        boxShadow: "0 0 0 3px rgba(217,108,71,0.12)",
    },
    inputIcon: {
        display: "flex",
        alignItems: "center",
        paddingLeft: "14px",
        color: "#8a8478",
        flexShrink: 0,
    },
    input: {
        flex: 1,
        background: "transparent",
        border: "none",
        outline: "none",
        padding: "13px 14px",
        fontSize: "14px",
        color: "#2b2925",
        width: "100%",
    },
    errorBox: {
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "12px 14px",
        borderRadius: "10px",
        background: "#fff0e8",
        border: "1px solid #f1c4b2",
        color: "#a13f24",
        fontSize: "13px",
    },
    button: {
        width: "100%",
        padding: "14px",
        borderRadius: "12px",
        border: "none",
        background: "#2b2925",
        color: "#fffaf0",
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
        border: "2px solid rgba(255,250,240,0.35)",
        borderTop: "2px solid #fffaf0",
        borderRadius: "50%",
        animation: "spin 0.8s linear infinite",
        display: "inline-block",
    },
    chatLinkWrap: {
        marginTop: "18px",
        textAlign: "center",
    },
    chatLink: {
        color: "#9a4f35",
        fontSize: "13px",
        fontWeight: "700",
        textDecoration: "none",
    },
};
