import { useEffect, useState } from "react";

const SendIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="22" y1="2" x2="11" y2="13" />
        <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
);

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

export default function ChatInput({ onSend, disabled = false }) {
    const isNarrow = useMediaQuery("(max-width: 760px)");
    const [text, setText] = useState("");
    const [isFocused, setIsFocused] = useState(false);

    const handleSend = () => {
        const message = text.trim();
        if (!message || disabled) return;
        onSend(message);
        setText("");
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const canSend = text.trim().length > 0 && !disabled;

    return (
        <div style={{ ...styles.wrapper, ...(isNarrow ? styles.wrapperNarrow : {}) }}>
            <div style={{
                ...styles.inputRow,
                ...(isFocused ? styles.inputRowFocused : {}),
                ...(isNarrow ? styles.inputRowNarrow : {}),
            }}>
                <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    placeholder="Ask anything..."
                    rows={1}
                    disabled={disabled}
                    style={{ ...styles.textarea, ...(isNarrow ? styles.textareaNarrow : {}) }}
                />
                <button
                    type="button"
                    onClick={handleSend}
                    disabled={!canSend}
                    aria-label="Send message"
                    style={{
                        ...styles.sendBtn,
                        ...(canSend ? styles.sendBtnActive : styles.sendBtnDisabled),
                    }}
                >
                    <SendIcon />
                </button>
            </div>
            <p style={{ ...styles.hint, ...(isNarrow ? styles.hintNarrow : {}) }}>Press Enter to send · Shift + Enter for new line</p>
        </div>
    );
}

const styles = {
    wrapper: {
        padding: "12px 16px 14px",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        background: "#131e2d",
        display: "flex",
        flexDirection: "column",
        gap: "6px",
    },
    wrapperNarrow: {
        padding: "10px 10px 12px",
    },
    inputRow: {
        display: "flex",
        alignItems: "flex-end",
        gap: "10px",
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.09)",
        borderRadius: "14px",
        padding: "10px 12px 10px 16px",
        transition: "border-color 0.2s, box-shadow 0.2s",
    },
    inputRowNarrow: {
        gap: "8px",
        padding: "9px 9px 9px 12px",
        borderRadius: "12px",
    },
    inputRowFocused: {
        borderColor: "rgba(99,179,164,0.4)",
        boxShadow: "0 0 0 3px rgba(99,179,164,0.08)",
    },
    textarea: {
        flex: 1,
        background: "transparent",
        border: "none",
        outline: "none",
        resize: "none",
        fontSize: "14px",
        lineHeight: "1.5",
        color: "#e2e8f0",
        maxHeight: "160px",
        overflowY: "auto",
        padding: "2px 0",
        fontFamily: "inherit",
    },
    textareaNarrow: {
        fontSize: "13px",
        maxHeight: "112px",
    },
    sendBtn: {
        width: "36px",
        height: "36px",
        borderRadius: "10px",
        border: "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        flexShrink: 0,
        transition: "all 0.15s",
    },
    sendBtnActive: {
        background: "linear-gradient(135deg, #63b3a4, #4a9080)",
        color: "#0d1520",
    },
    sendBtnDisabled: {
        background: "rgba(255,255,255,0.05)",
        color: "#2d3748",
        cursor: "not-allowed",
    },
    hint: {
        fontSize: "11px",
        color: "#2d3748",
        margin: 0,
        textAlign: "center",
    },
    hintNarrow: {
        display: "none",
    },
};
