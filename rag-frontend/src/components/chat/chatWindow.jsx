import { useCallback, useEffect, useRef, useState } from "react";
import MessageBubble, { TypingBubble } from "./MessageBubble";
import ChatInput from "./ChatInput";
import { useWebSocket } from "../../hooks/useWebSocket";
import {
    createChatSession, deleteChatSession, getChatSession, getChatSessions,
    loginUser, registerUser,
} from "../../api/chatApi";

// ─── Icons ────────────────────────────────────────────────────────────────────
const PlusIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
);
const MenuIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" />
    </svg>
);
const XIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
);
const TrashIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
);
const UserIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
);
const LogOutIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
    </svg>
);
const BotIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="10" rx="2" /><circle cx="12" cy="5" r="2" />
        <path d="M12 7v4" />
        <line x1="8" y1="16" x2="8" y2="16" strokeWidth="3" />
        <line x1="16" y1="16" x2="16" y2="16" strokeWidth="3" />
    </svg>
);
const BookIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
);
const SearchIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
);
const ClockIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
);

const examplePrompts = [
    { icon: <BookIcon />, text: "Summarize this topic for me" },
    { icon: <SearchIcon />, text: "What are the key points I should know?" },
    { icon: <ClockIcon />, text: "Help me understand requirements or deadlines" },
];

function useMediaQuery(query) {
    const [matches, setMatches] = useState(() => (
        typeof window !== "undefined" ? window.matchMedia(query).matches : false
    ));

    useEffect(() => {
        const mediaQuery = window.matchMedia(query);
        const handleChange = () => setMatches(mediaQuery.matches);

        handleChange();
        mediaQuery.addEventListener("change", handleChange);

        return () => mediaQuery.removeEventListener("change", handleChange);
    }, [query]);

    return matches;
}

export default function ChatWindow() {
    const isNarrow = useMediaQuery("(max-width: 760px)");
    const [user, setUser] = useState(() => {
        try {
            const saved = window.localStorage.getItem("ragUser");
            return saved ? JSON.parse(saved) : null;
        } catch {
            window.localStorage.removeItem("ragUser");
            return null;
        }
    });
    const [authMode, setAuthMode] = useState("login");
    const [authForm, setAuthForm] = useState({ username: "", password: "" });
    const [authError, setAuthError] = useState("");
    const [isAuthOpen, setIsAuthOpen] = useState(false);
    const [sessions, setSessions] = useState([]);
    const [activeSessionId, setActiveSessionId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [isWaiting, setIsWaiting] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [historyError, setHistoryError] = useState("");
    const [authFocused, setAuthFocused] = useState(null);
    const messageListRef = useRef(null);

    const loadSessions = useCallback(async () => {
        if (!user) return;
        try {
            const data = await getChatSessions(user.id);
            setSessions(data);
            setHistoryError("");
        } catch (error) {
            setHistoryError(error.message);
        }
    }, [user]);

    const handleSocketMessage = useCallback((data) => {
        if (data.type === "stream") {
            setIsWaiting(false);
            setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                    return [...prev.slice(0, -1), { ...last, content: last.content + data.token }];
                }
                return [...prev, { role: "assistant", content: data.token }];
            });
        }
        if (data.type === "done") loadSessions();
        if (data.type === "error") { setIsWaiting(false); setHistoryError(data.message); }
    }, [loadSessions]);

    const { sendMessage } = useWebSocket(user?.id ?? "guest", handleSocketMessage);

    useEffect(() => {
        const timer = window.setTimeout(() => loadSessions(), 0);
        return () => window.clearTimeout(timer);
    }, [loadSessions]);

    const handleAuthSubmit = async (e) => {
        e.preventDefault();
        setAuthError("");
        try {
            const action = authMode === "login" ? loginUser : registerUser;
            const nextUser = await action(authForm.username, authForm.password);
            window.localStorage.setItem("ragUser", JSON.stringify(nextUser));
            setUser(nextUser);
            setAuthForm({ username: "", password: "" });
            setIsAuthOpen(false);
            setMessages([]);
            setActiveSessionId(null);
        } catch (error) {
            setAuthError(error.message);
        }
    };

    const handleLogout = () => {
        window.localStorage.removeItem("ragUser");
        setUser(null);
        setSessions([]);
        setActiveSessionId(null);
        setMessages([]);
    };

    const handleNewChat = async () => {
        if (!user) { setActiveSessionId(null); setMessages([]); setHistoryError(""); return; }
        try {
            const session = await createChatSession(user.id);
            setActiveSessionId(session.id);
            setMessages([]);
            await loadSessions();
        } catch (error) {
            setHistoryError(error.message);
        }
    };

    const handleSelectSession = async (sessionId) => {
        if (!user) return;
        try {
            const session = await getChatSession(user.id, sessionId);
            setActiveSessionId(session.id);
            setMessages(session.messages.map((m) => ({ role: m.role, content: m.content })));
            setHistoryError("");
        } catch (error) {
            setHistoryError(error.message);
        }
    };

    const handleDeleteSession = async (e, sessionId) => {
        e.stopPropagation();
        if (!user) return;
        try {
            await deleteChatSession(user.id, sessionId);
            if (activeSessionId === sessionId) { setActiveSessionId(null); setMessages([]); }
            await loadSessions();
        } catch (error) {
            setHistoryError(error.message);
        }
    };

    const handleSend = async (text) => {
        let sessionId = activeSessionId;
        const recentHistory = messages
            .filter((message) => ["user", "assistant"].includes(message.role) && message.content?.trim())
            .slice(-12);

        setMessages((prev) => [...prev, { role: "user", content: text }]);
        setIsWaiting(true);
        if (user && !sessionId) {
            try {
                const session = await createChatSession(user.id, text.slice(0, 80));
                sessionId = session.id;
                setActiveSessionId(sessionId);
            } catch (error) {
                setHistoryError(error.message);
                setIsWaiting(false);
                return;
            }
        }
        sendMessage(text, sessionId, recentHistory);
    };

    useEffect(() => {
        messageListRef.current?.scrollTo({ top: messageListRef.current.scrollHeight, behavior: "smooth" });
    }, [messages, isWaiting]);

    return (
        <div style={{ ...styles.chatWindow, ...(isNarrow ? styles.chatWindowNarrow : {}) }}>
            {/* Sidebar */}
            <aside style={{
                ...styles.sidebar,
                ...(isSidebarOpen ? styles.sidebarOpen : styles.sidebarClosed),
                ...(isNarrow ? (isSidebarOpen ? styles.sidebarOpenNarrow : styles.sidebarClosedNarrow) : {}),
            }}>
                <div style={{ ...styles.sidebarInner, ...(isNarrow ? styles.sidebarInnerNarrow : {}) }}>
                    {/* Toggle button */}
                    <button
                        type="button"
                        style={styles.toggleBtn}
                        onClick={() => setIsSidebarOpen((v) => !v)}
                        aria-label={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
                    >
                        {isSidebarOpen ? <XIcon /> : <MenuIcon />}
                    </button>

                    {isSidebarOpen && (
                        <div style={styles.sidebarContent}>
                            {/* Sidebar Header */}
                            <div style={styles.sidebarHeader}>
                                <div style={styles.brandMark}>
                                    <BotIcon />
                                </div>
                                <div>
                                    <p style={styles.brandEyebrow}>RAG Chatbot</p>
                                    <h2 style={styles.brandTitle}>Chats</h2>
                                </div>
                            </div>

                            {/* New Chat Button */}
                            <button type="button" style={styles.newChatBtn} onClick={handleNewChat}>
                                <PlusIcon />
                                New chat
                            </button>

                            {/* Auth / Sessions */}
                            {!user ? (
                                <div style={styles.guestSection}>
                                    <div style={styles.guestBadge}>
                                        <UserIcon />
                                        <span>Guest mode</span>
                                    </div>

                                    {!isAuthOpen ? (
                                        <button
                                            type="button"
                                            style={styles.openAuthBtn}
                                            onClick={() => setIsAuthOpen(true)}
                                        >
                                            Log in / Create account
                                        </button>
                                    ) : (
                                        <form style={styles.authCard} onSubmit={handleAuthSubmit}>
                                            <div style={styles.authCardHeader}>
                                                <h3 style={styles.authCardTitle}>
                                                    {authMode === "login" ? "Log in" : "Create account"}
                                                </h3>
                                                <button
                                                    type="button"
                                                    style={styles.closeAuthBtn}
                                                    onClick={() => { setIsAuthOpen(false); setAuthError(""); }}
                                                    aria-label="Close login form"
                                                >
                                                    <XIcon />
                                                </button>
                                            </div>

                                            <div style={styles.authField}>
                                                <label style={styles.authLabel}>Username</label>
                                                <input
                                                    style={{
                                                        ...styles.authInput,
                                                        ...(authFocused === "u" ? styles.authInputFocused : {}),
                                                    }}
                                                    value={authForm.username}
                                                    onChange={(e) => setAuthForm((c) => ({ ...c, username: e.target.value }))}
                                                    onFocus={() => setAuthFocused("u")}
                                                    onBlur={() => setAuthFocused(null)}
                                                    autoComplete="username"
                                                />
                                            </div>
                                            <div style={styles.authField}>
                                                <label style={styles.authLabel}>Password</label>
                                                <input
                                                    type="password"
                                                    style={{
                                                        ...styles.authInput,
                                                        ...(authFocused === "p" ? styles.authInputFocused : {}),
                                                    }}
                                                    value={authForm.password}
                                                    onChange={(e) => setAuthForm((c) => ({ ...c, password: e.target.value }))}
                                                    onFocus={() => setAuthFocused("p")}
                                                    onBlur={() => setAuthFocused(null)}
                                                    autoComplete={authMode === "login" ? "current-password" : "new-password"}
                                                />
                                            </div>

                                            {authError && <p style={styles.authError}>{authError}</p>}

                                            <button type="submit" style={styles.authSubmitBtn}>
                                                {authMode === "login" ? "Log in" : "Create account"}
                                            </button>
                                            <button
                                                type="button"
                                                style={styles.authToggleBtn}
                                                onClick={() => { setAuthMode((m) => (m === "login" ? "register" : "login")); setAuthError(""); }}
                                            >
                                                {authMode === "login" ? "Need an account?" : "Already have an account?"}
                                            </button>
                                        </form>
                                    )}
                                </div>
                            ) : (
                                <div style={styles.sessionSection}>
                                    {historyError && <p style={styles.historyError}>{historyError}</p>}

                                    <div style={styles.historyList}>
                                        {sessions.length === 0 ? (
                                            <p style={styles.emptyHistory}>No saved chats yet.</p>
                                        ) : (
                                            sessions.map((session) => (
                                                <div
                                                    key={session.id}
                                                    style={{
                                                        ...styles.historyItem,
                                                        ...(activeSessionId === session.id ? styles.historyItemActive : {}),
                                                    }}
                                                >
                                                    <button
                                                        type="button"
                                                        style={styles.historyItemMain}
                                                        onClick={() => handleSelectSession(session.id)}
                                                    >
                                                        <span style={styles.historyItemTitle}>{session.title}</span>
                                                        <small style={styles.historyItemDate}>
                                                            {new Date(session.updated_at).toLocaleDateString()}
                                                        </small>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        style={styles.historyItemDelete}
                                                        onClick={(e) => handleDeleteSession(e, session.id)}
                                                        aria-label="Delete chat"
                                                    >
                                                        <TrashIcon />
                                                    </button>
                                                </div>
                                            ))
                                        )}
                                    </div>

                                    {/* User card */}
                                    <div style={styles.userCard}>
                                        <div style={styles.userInfo}>
                                            <div style={styles.userAvatar}><UserIcon /></div>
                                            <span style={styles.userName}>{user.username}</span>
                                        </div>
                                        <button type="button" style={styles.logoutBtn} onClick={handleLogout}>
                                            <LogOutIcon />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </aside>

            {/* Main Chat Panel */}
            <div style={{ ...styles.panel, ...(isNarrow ? styles.panelNarrow : {}) }}>
                {/* Panel Header */}
                <div style={{ ...styles.panelHeader, ...(isNarrow ? styles.panelHeaderNarrow : {}) }}>
                    <div style={styles.panelHeaderLeft}>
                        <div style={styles.panelHeaderIcon}><BotIcon /></div>
                        <div>
                            <h2 style={styles.panelTitle}>University Assistant</h2>
                            <p style={styles.panelSubtitle}>
                                {user ? `Signed in as ${user.username}` : "Guest mode"}
                            </p>
                        </div>
                    </div>
                    <span style={{
                        ...styles.connectionPill,
                        ...(user ? styles.pillActive : styles.pillGuest),
                        ...(isNarrow ? styles.connectionPillNarrow : {}),
                    }}>
                        {user ? "History on" : "Temporary chat"}
                    </span>
                </div>

                {/* Messages */}
                <div style={{ ...styles.messageList, ...(isNarrow ? styles.messageListNarrow : {}) }} ref={messageListRef}>
                    {messages.length === 0 ? (
                        <section style={{ ...styles.emptyChat, ...(isNarrow ? styles.emptyChatNarrow : {}) }}>
                            <div style={styles.emptyChatIcon}><BotIcon /></div>
                            <h3 style={styles.emptyChatTitle}>How can I assist you?</h3>
                            <p style={styles.emptyChatSubtitle}>
                                {user
                                    ? "Ask questions and get clear, helpful answers. Your chat is saved."
                                    : "Ask questions and get clear, helpful answers. Log in only if you want saved history."}
                            </p>
                            <div style={{ ...styles.promptGrid, ...(isNarrow ? styles.promptGridNarrow : {}) }}>
                                {examplePrompts.map((p) => (
                                    <button
                                        key={p.text}
                                        type="button"
                                        style={styles.promptBtn}
                                        onClick={() => handleSend(p.text)}
                                    >
                                        <span style={styles.promptIcon}>{p.icon}</span>
                                        {p.text}
                                    </button>
                                ))}
                            </div>
                        </section>
                    ) : (
                        messages.map((m, i) => (
                            <MessageBubble key={`${m.role}-${i}`} {...m} />
                        ))
                    )}

                    {isWaiting && <TypingBubble />}
                </div>

                <ChatInput onSend={handleSend} disabled={isWaiting} />
            </div>
        </div>
    );
}

const styles = {
    chatWindow: {
        display: "flex",
        height: "100vh",
        background: "#0f1923",
        overflow: "hidden",
        fontFamily: "inherit",
    },
    chatWindowNarrow: {
        flexDirection: "column",
        height: "100dvh",
        minHeight: 0,
    },
    sidebar: {
        flexShrink: 0,
        transition: "width 0.25s ease",
        overflow: "hidden",
        background: "#131e2d",
        borderRight: "1px solid rgba(255,255,255,0.06)",
    },
    sidebarOpen: { width: "280px" },
    sidebarClosed: { width: "56px" },
    sidebarOpenNarrow: {
        width: "100%",
        maxHeight: "42dvh",
    },
    sidebarClosedNarrow: {
        width: "100%",
        height: "60px",
    },
    sidebarInner: {
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        position: "relative",
    },
    sidebarInnerNarrow: {
        minWidth: 0,
    },
    toggleBtn: {
        width: "36px",
        height: "36px",
        margin: "12px 10px",
        borderRadius: "10px",
        border: "1px solid rgba(255,255,255,0.08)",
        background: "transparent",
        color: "#718096",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        flexShrink: 0,
        transition: "all 0.15s",
    },
    sidebarContent: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        padding: "0 12px 16px",
        overflow: "hidden",
    },
    sidebarHeader: {
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "4px 0 8px",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        marginBottom: "4px",
    },
    brandMark: {
        width: "36px",
        height: "36px",
        borderRadius: "10px",
        background: "linear-gradient(135deg, rgba(99,179,164,0.15), rgba(99,179,164,0.05))",
        border: "1px solid rgba(99,179,164,0.2)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#63b3a4",
        flexShrink: 0,
    },
    brandEyebrow: {
        fontSize: "10px",
        fontWeight: "700",
        letterSpacing: "1.2px",
        textTransform: "uppercase",
        color: "#63b3a4",
        margin: 0,
    },
    brandTitle: {
        fontSize: "16px",
        fontWeight: "700",
        color: "#e2e8f0",
        margin: 0,
    },
    newChatBtn: {
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "9px 12px",
        borderRadius: "10px",
        border: "1px solid rgba(99,179,164,0.25)",
        background: "rgba(99,179,164,0.07)",
        color: "#63b3a4",
        fontSize: "13px",
        fontWeight: "600",
        cursor: "pointer",
        width: "100%",
        transition: "all 0.15s",
    },
    guestSection: {
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        flex: 1,
    },
    guestBadge: {
        display: "flex",
        alignItems: "center",
        gap: "7px",
        padding: "8px 12px",
        borderRadius: "8px",
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.06)",
        color: "#718096",
        fontSize: "12px",
        fontWeight: "600",
    },
    openAuthBtn: {
        padding: "9px 12px",
        borderRadius: "10px",
        border: "1px solid rgba(255,255,255,0.1)",
        background: "transparent",
        color: "#a0aec0",
        fontSize: "13px",
        fontWeight: "600",
        cursor: "pointer",
        width: "100%",
        textAlign: "left",
    },
    authCard: {
        background: "#1a2a3d",
        borderRadius: "14px",
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        border: "1px solid rgba(255,255,255,0.07)",
    },
    authCardHeader: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
    },
    authCardTitle: {
        fontSize: "14px",
        fontWeight: "700",
        color: "#e2e8f0",
        margin: 0,
    },
    closeAuthBtn: {
        width: "26px",
        height: "26px",
        borderRadius: "6px",
        border: "1px solid rgba(255,255,255,0.07)",
        background: "transparent",
        color: "#718096",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
    },
    authField: { display: "flex", flexDirection: "column", gap: "4px" },
    authLabel: { fontSize: "11px", fontWeight: "600", color: "#718096" },
    authInput: {
        padding: "8px 10px",
        borderRadius: "8px",
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.04)",
        color: "#e2e8f0",
        fontSize: "13px",
        outline: "none",
        transition: "border-color 0.2s",
        width: "100%",
        boxSizing: "border-box",
    },
    authInputFocused: {
        borderColor: "rgba(99,179,164,0.4)",
        boxShadow: "0 0 0 2px rgba(99,179,164,0.08)",
    },
    authError: {
        fontSize: "12px",
        color: "#fc814a",
        background: "rgba(252,129,74,0.08)",
        border: "1px solid rgba(252,129,74,0.2)",
        borderRadius: "8px",
        padding: "8px 10px",
        margin: 0,
    },
    authSubmitBtn: {
        padding: "9px",
        borderRadius: "8px",
        border: "none",
        background: "linear-gradient(135deg, #63b3a4, #4a9080)",
        color: "#0d1520",
        fontSize: "13px",
        fontWeight: "700",
        cursor: "pointer",
        width: "100%",
    },
    authToggleBtn: {
        background: "transparent",
        border: "none",
        color: "#63b3a4",
        fontSize: "12px",
        cursor: "pointer",
        padding: "0",
        textAlign: "center",
        width: "100%",
    },
    sessionSection: {
        display: "flex",
        flexDirection: "column",
        flex: 1,
        gap: "8px",
        overflow: "hidden",
    },
    historyError: {
        fontSize: "12px",
        color: "#fc814a",
        background: "rgba(252,129,74,0.08)",
        borderRadius: "8px",
        padding: "8px 10px",
        margin: 0,
    },
    historyList: {
        flex: 1,
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        gap: "4px",
    },
    emptyHistory: {
        fontSize: "12px",
        color: "#4a5568",
        textAlign: "center",
        padding: "24px 0",
        margin: 0,
    },
    historyItem: {
        display: "flex",
        alignItems: "center",
        borderRadius: "10px",
        overflow: "hidden",
        border: "1px solid transparent",
        transition: "all 0.15s",
    },
    historyItemActive: {
        background: "rgba(99,179,164,0.08)",
        border: "1px solid rgba(99,179,164,0.2)",
    },
    historyItemMain: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        gap: "2px",
        padding: "9px 10px",
        background: "transparent",
        border: "none",
        cursor: "pointer",
        textAlign: "left",
        overflow: "hidden",
    },
    historyItemTitle: {
        fontSize: "12px",
        fontWeight: "600",
        color: "#a0aec0",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        display: "block",
    },
    historyItemDate: {
        fontSize: "10px",
        color: "#4a5568",
    },
    historyItemDelete: {
        width: "32px",
        height: "32px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "transparent",
        border: "none",
        color: "#4a5568",
        cursor: "pointer",
        flexShrink: 0,
        borderRadius: "8px",
        margin: "2px",
        transition: "all 0.15s",
    },
    userCard: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 12px",
        borderRadius: "10px",
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.06)",
        marginTop: "auto",
    },
    userInfo: { display: "flex", alignItems: "center", gap: "8px" },
    userAvatar: {
        width: "28px",
        height: "28px",
        borderRadius: "8px",
        background: "rgba(99,179,164,0.1)",
        border: "1px solid rgba(99,179,164,0.2)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#63b3a4",
    },
    userName: { fontSize: "12px", fontWeight: "600", color: "#a0aec0" },
    logoutBtn: {
        width: "28px",
        height: "28px",
        borderRadius: "8px",
        border: "1px solid rgba(255,255,255,0.07)",
        background: "transparent",
        color: "#4a5568",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
    },
    panel: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        minWidth: 0,
        overflow: "hidden",
    },
    panelNarrow: {
        minHeight: 0,
    },
    panelHeader: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "14px 20px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        background: "#131e2d",
        gap: "12px",
    },
    panelHeaderNarrow: {
        alignItems: "flex-start",
        padding: "12px 14px",
    },
    panelHeaderLeft: { display: "flex", alignItems: "center", gap: "12px" },
    panelHeaderIcon: {
        width: "38px",
        height: "38px",
        borderRadius: "10px",
        background: "linear-gradient(135deg, rgba(99,179,164,0.15), rgba(99,179,164,0.05))",
        border: "1px solid rgba(99,179,164,0.2)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#63b3a4",
    },
    panelTitle: { fontSize: "16px", fontWeight: "700", color: "#e2e8f0", margin: 0 },
    panelSubtitle: { fontSize: "12px", color: "#4a5568", margin: 0 },
    connectionPill: {
        padding: "4px 12px",
        borderRadius: "20px",
        fontSize: "11px",
        fontWeight: "700",
        letterSpacing: "0.3px",
        whiteSpace: "nowrap",
    },
    connectionPillNarrow: {
        padding: "4px 8px",
        fontSize: "10px",
    },
    pillActive: {
        background: "rgba(99,179,164,0.1)",
        border: "1px solid rgba(99,179,164,0.25)",
        color: "#63b3a4",
    },
    pillGuest: {
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        color: "#4a5568",
    },
    messageList: {
        flex: 1,
        overflowY: "auto",
        padding: "20px 20px 8px",
        display: "flex",
        flexDirection: "column",
        gap: "4px",
        minHeight: 0,
    },
    messageListNarrow: {
        padding: "14px 12px 8px",
    },
    emptyChat: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        flex: 1,
        textAlign: "center",
        gap: "12px",
        padding: "40px 24px",
        margin: "auto 0",
    },
    emptyChatNarrow: {
        justifyContent: "flex-start",
        padding: "20px 4px",
        margin: 0,
    },
    emptyChatIcon: {
        width: "60px",
        height: "60px",
        borderRadius: "18px",
        background: "linear-gradient(135deg, rgba(99,179,164,0.15), rgba(99,179,164,0.04))",
        border: "1px solid rgba(99,179,164,0.2)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#63b3a4",
        marginBottom: "4px",
    },
    emptyChatTitle: { fontSize: "20px", fontWeight: "700", color: "#e2e8f0", margin: 0 },
    emptyChatSubtitle: { fontSize: "14px", color: "#718096", margin: 0, maxWidth: "400px", lineHeight: 1.5 },
    promptGrid: {
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        width: "100%",
        maxWidth: "420px",
        marginTop: "8px",
    },
    promptGridNarrow: {
        maxWidth: "100%",
    },
    promptBtn: {
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "12px 16px",
        borderRadius: "12px",
        border: "1px solid rgba(255,255,255,0.07)",
        background: "rgba(255,255,255,0.025)",
        color: "#a0aec0",
        fontSize: "13px",
        cursor: "pointer",
        textAlign: "left",
        transition: "all 0.15s",
    },
    promptIcon: {
        color: "#63b3a4",
        flexShrink: 0,
        display: "flex",
    },
};
