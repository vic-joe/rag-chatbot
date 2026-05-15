import { useState } from "react";

export default function ChatInput({ onSend, disabled = false }) {
    const [text, setText] = useState("");

    const handleSend = () => {
        const message = text.trim();
        if (!message || disabled) return;
        onSend(message);
        setText("");
    };

    const handleKeyDown = (event) => {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            handleSend();
        }
    };

    return (
        <form
            className="chat-input"
            onSubmit={(event) => {
                event.preventDefault();
                handleSend();
            }}
        >
            <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask a question about your documents..."
                rows="1"
                disabled={disabled}
            />
            <button type="submit" disabled={disabled || !text.trim()} aria-label="Send message">
                ↑
            </button>
        </form>
    );
}
