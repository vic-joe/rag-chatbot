import { useCallback, useEffect, useRef, useState } from "react";
import MessageBubble, { TypingBubble } from "./MessageBubble";
import ChatInput from "./ChatInput";
import { useWebSocket } from "../../hooks/useWebSocket";
import {
    createChatSession,
    deleteChatSession,
    getChatSession,
    getChatSessions,
    loginUser,
    registerUser,
} from "../../api/chatApi";

export default function ChatWindow() {
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
                    return [
                        ...prev.slice(0, -1),
                        { ...last, content: last.content + data.token },
                    ];
                }

                return [...prev, { role: "assistant", content: data.token }];
            });
        }

        if (data.type === "done") {
            loadSessions();
        }

        if (data.type === "error") {
            setIsWaiting(false);
            setHistoryError(data.message);
        }
    }, [loadSessions]);

    const { sendMessage } = useWebSocket(user?.id ?? "guest", handleSocketMessage);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            loadSessions();
        }, 0);

        return () => window.clearTimeout(timer);
    }, [loadSessions]);

    const handleAuthSubmit = async (event) => {
        event.preventDefault();
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
        if (!user) {
            setActiveSessionId(null);
            setMessages([]);
            setHistoryError("");
            return;
        }

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
            setMessages(session.messages.map((message) => ({
                role: message.role,
                content: message.content,
            })));
            setHistoryError("");
        } catch (error) {
            setHistoryError(error.message);
        }
    };

    const handleDeleteSession = async (event, sessionId) => {
        event.stopPropagation();
        if (!user) return;

        try {
            await deleteChatSession(user.id, sessionId);
            if (activeSessionId === sessionId) {
                setActiveSessionId(null);
                setMessages([]);
            }
            await loadSessions();
        } catch (error) {
            setHistoryError(error.message);
        }
    };

    const handleSend = async (text) => {
        let sessionId = activeSessionId;

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

        sendMessage(text, sessionId);
    };

    useEffect(() => {
        messageListRef.current?.scrollTo({
            top: messageListRef.current.scrollHeight,
            behavior: "smooth",
        });
    }, [messages, isWaiting]);

    const examplePrompts = [
        "Summarize the uploaded documents",
        "What are the key points I should know?",
        "Find details about requirements or deadlines",
    ];

    return (
        <div className="chat-window">
            <aside className={`chat-sidebar ${isSidebarOpen ? "open" : "closed"}`}>
                <button
                    type="button"
                    className="sidebar-toggle"
                    onClick={() => setIsSidebarOpen((value) => !value)}
                    aria-label={isSidebarOpen ? "Close chat sidebar" : "Open chat sidebar"}
                    title={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
                >
                    <span className="sidebar-toggle-icon" aria-hidden="true">
                        <span />
                        <span />
                    </span>
                </button>

                {isSidebarOpen && (
                    <div className="chat-sidebar-content">
                        <div className="chat-sidebar-header">
                            <div>
                                <p className="eyebrow">Rag Chatbot</p>
                                <h2>Chats</h2>
                            </div>
                        </div>

                        <button type="button" className="new-chat-button" onClick={handleNewChat}>
                            <span>+</span>
                            New chat
                        </button>

                        {!user ? (
                            <>
                                <div className="guest-note">
                                    <h3>Guest</h3>
                                    {/* <p>You can chat without logging in. Create an account only if you want saved history.</p> */}
                                </div>

                                {!isAuthOpen ? (
                                    <button
                                        type="button"
                                        className="open-auth-button"
                                        onClick={() => setIsAuthOpen(true)}
                                    >
                                        Log in / Create account
                                    </button>
                                ) : (
                                    <form className="chat-auth-card" onSubmit={handleAuthSubmit}>
                                        <div className="chat-auth-card-header">
                                            <h3>{authMode === "login" ? "Log in " : "Create account"}</h3>
                                            <button
                                                type="button"
                                                className="close-auth-button"
                                                onClick={() => {
                                                    setIsAuthOpen(false);
                                                    setAuthError("");
                                                }}
                                                aria-label="Close login form"
                                            >
                                                x
                                            </button>
                                        </div>
                                        <label>
                                            Username
                                            <input
                                                value={authForm.username}
                                                onChange={(event) => setAuthForm((current) => ({
                                                    ...current,
                                                    username: event.target.value,
                                                }))}
                                                autoComplete="username"
                                            />
                                        </label>
                                        <label>
                                            Password
                                            <input
                                                type="password"
                                                value={authForm.password}
                                                onChange={(event) => setAuthForm((current) => ({
                                                    ...current,
                                                    password: event.target.value,
                                                }))}
                                                autoComplete={authMode === "login" ? "current-password" : "new-password"}
                                            />
                                        </label>
                                        {authError && <p className="form-error">{authError}</p>}
                                        <button type="submit">
                                            {authMode === "login" ? "Log in" : "Create account"}
                                        </button>
                                        <button
                                            type="button"
                                            className="text-button"
                                            onClick={() => {
                                                setAuthMode((mode) => (mode === "login" ? "register" : "login"));
                                                setAuthError("");
                                            }}
                                        >
                                            {authMode === "login" ? "Need an account?" : "Already have an account?"}
                                        </button>
                                    </form>
                                )}
                            </>
                        ) : (
                            <>
                                {historyError && <p className="form-error">{historyError}</p>}

                                <div className="chat-history-list">
                                    {sessions.length === 0 ? (
                                        <p className="empty-history">No saved chats yet.</p>
                                    ) : (
                                        sessions.map((session) => (
                                            <div
                                                className={`chat-history-item ${activeSessionId === session.id ? "active" : ""}`}
                                                key={session.id}
                                            >
                                                <button
                                                    type="button"
                                                    className="chat-history-item-main"
                                                    onClick={() => handleSelectSession(session.id)}
                                                >
                                                    <span>{session.title}</span>
                                                    <small>{new Date(session.updated_at).toLocaleString()}</small>
                                                </button>
                                                <button
                                                    type="button"
                                                    className="chat-history-item-delete"
                                                    onClick={(event) => handleDeleteSession(event, session.id)}
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>

                                <div className="chat-user-card">
                                    <span>{user.username}</span>
                                    <button type="button" onClick={handleLogout}>Log out</button>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </aside>

            <div className="chat-panel">
                <div className="chat-panel-header">
                    <div>
                        <h2>University Assistant</h2>
                        <p>{user ? `Signed in as ${user.username}` : "Guest mode."}</p>
                    </div>
                    <span className="connection-pill">{user ? "History on" : "Temporary chat"}</span>
                </div>

                <div className="message-list" ref={messageListRef}>
                    {messages.length === 0 ? (
                        <section className="empty-chat">
                            <h3>How can I assist you?</h3>
                            <p>
                                {user
                                    ? "Search uploaded PDFs and DOCX files using natural language. Your chat is saved."
                                    : "Search uploaded PDFs and DOCX files now. Log in only if you want saved history."}
                            </p>
                            <div className="prompt-grid">
                                {examplePrompts.map((prompt) => (
                                    <button
                                        type="button"
                                        key={prompt}
                                        onClick={() => handleSend(prompt)}
                                    >
                                        {prompt}
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
