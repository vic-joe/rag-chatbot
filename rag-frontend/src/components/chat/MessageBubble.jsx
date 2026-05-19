import udomLogo from "../../assets/udom-logo.svg";

const BotLogo = () => (
    <img src={udomLogo} alt="The University of Dodoma" style={styles.logoImage} />
);

const UserIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
    </svg>
);

export default function MessageBubble({ role, content }) {
    const isUser = role === "user";

    return (
        <article style={{ ...styles.row, ...(isUser ? styles.rowUser : styles.rowAssistant) }}>
            {!isUser && (
                <div style={styles.avatar}>
                    <BotLogo />
                </div>
            )}

            <div style={{ ...styles.content, ...(isUser ? styles.contentUser : styles.contentAssistant) }}>
                {!isUser && <span style={styles.author}>Assistant</span>}
                <div style={{ ...styles.bubble, ...(isUser ? styles.bubbleUser : styles.bubbleAssistant) }}>
                    {content}
                </div>
            </div>

            {isUser && (
                <div style={styles.avatarUser}>
                    <UserIcon />
                </div>
            )}
        </article>
    );
}

export function TypingBubble() {
    return (
        <article style={styles.row}>
            <div style={styles.avatar}>
                <BotLogo />
            </div>
            <div style={styles.content}>
                <span style={styles.author}>Assistant</span>
                <div style={{ ...styles.bubble, ...styles.bubbleAssistant, ...styles.typingBubble }} aria-label="Assistant is thinking">
                    <span style={{ ...styles.dot, animationDelay: "0ms" }} />
                    <span style={{ ...styles.dot, animationDelay: "180ms" }} />
                    <span style={{ ...styles.dot, animationDelay: "360ms" }} />
                </div>
            </div>
        </article>
    );
}

const styles = {
    row: {
        display: "flex",
        alignItems: "flex-end",
        gap: "10px",
        padding: "6px 0",
    },
    rowUser: {
        flexDirection: "row-reverse",
    },
    rowAssistant: {
        flexDirection: "row",
    },
    avatar: {
        width: "32px",
        height: "32px",
        borderRadius: "10px",
        background: "linear-gradient(135deg, rgba(99,179,164,0.15), rgba(99,179,164,0.05))",
        border: "1px solid rgba(99,179,164,0.2)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#63b3a4",
        flexShrink: 0,
    },
    logoImage: {
        width: "100%",
        height: "100%",
        objectFit: "cover",
        borderRadius: "50%",
        display: "block",
    },
    avatarUser: {
        width: "32px",
        height: "32px",
        borderRadius: "10px",
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.09)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#718096",
        flexShrink: 0,
    },
    content: {
        display: "flex",
        flexDirection: "column",
        gap: "4px",
        maxWidth: "72%",
    },
    contentUser: {
        alignItems: "flex-end",
    },
    contentAssistant: {
        alignItems: "flex-start",
    },
    author: {
        fontSize: "11px",
        fontWeight: "600",
        color: "#63b3a4",
        letterSpacing: "0.5px",
        textTransform: "uppercase",
        paddingLeft: "2px",
    },
    bubble: {
        padding: "11px 15px",
        borderRadius: "14px",
        fontSize: "14px",
        lineHeight: "1.6",
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
    },
    bubbleUser: {
        background: "linear-gradient(135deg, #63b3a4, #4a9080)",
        color: "#0d1520",
        fontWeight: "500",
        borderBottomRightRadius: "4px",
    },
    bubbleAssistant: {
        background: "#1e2d40",
        border: "1px solid rgba(255,255,255,0.07)",
        color: "#e2e8f0",
        borderBottomLeftRadius: "4px",
    },
    typingBubble: {
        display: "flex",
        alignItems: "center",
        gap: "5px",
        padding: "14px 18px",
    },
    dot: {
        width: "7px",
        height: "7px",
        borderRadius: "50%",
        background: "#4a9080",
        display: "inline-block",
        animation: "typingBounce 1.2s ease-in-out infinite",
    },
};

Object.assign(styles, {
    row: {
        width: "min(780px, 100%)",
        display: "flex",
        alignItems: "flex-start",
        gap: "12px",
        padding: "14px 0",
        margin: "0 auto",
    },
    rowUser: {
        flexDirection: "row-reverse",
        justifyContent: "flex-start",
    },
    rowAssistant: {
        flexDirection: "row",
    },
    avatar: {
        width: "32px",
        height: "32px",
        borderRadius: "50%",
        background: "#050505",
        border: "1px solid #d8d1c3",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        marginTop: "2px",
        overflow: "hidden",
    },
    avatarUser: {
        width: "32px",
        height: "32px",
        borderRadius: "10px",
        background: "#eee9de",
        border: "1px solid #d8d1c3",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#6f6a61",
        flexShrink: 0,
        marginTop: "2px",
    },
    content: {
        display: "flex",
        flexDirection: "column",
        gap: "6px",
        maxWidth: "min(680px, 84%)",
    },
    contentUser: {
        alignItems: "flex-end",
    },
    contentAssistant: {
        alignItems: "flex-start",
    },
    author: {
        fontSize: "12px",
        fontWeight: "700",
        color: "#6f6a61",
        letterSpacing: 0,
        textTransform: "none",
        paddingLeft: "2px",
    },
    bubble: {
        padding: "0",
        borderRadius: "16px",
        fontSize: "15px",
        lineHeight: "1.7",
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
    },
    bubbleUser: {
        padding: "10px 15px",
        background: "#efeae0",
        color: "#2b2925",
        fontWeight: "500",
        borderBottomRightRadius: "6px",
    },
    bubbleAssistant: {
        background: "transparent",
        border: "none",
        color: "#2b2925",
        borderBottomLeftRadius: "16px",
    },
    typingBubble: {
        display: "flex",
        alignItems: "center",
        gap: "5px",
        padding: "10px 0",
    },
    dot: {
        width: "7px",
        height: "7px",
        borderRadius: "50%",
        background: "#b66a4e",
        display: "inline-block",
        animation: "typingPulse 1.2s ease-in-out infinite",
    },
});
