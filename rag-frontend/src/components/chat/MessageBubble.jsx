export default function MessageBubble({ role, content }) {
    const label = role === "user" ? "You" : "Assistant";

    return (
        <article className={`message-row ${role === "user" ? "user" : "assistant"}`}>
            <div className="message-content">
                {role !== "user" && <span className="message-author">{label}</span>}
                <div className="message-bubble">
                    {content}
                </div>
            </div>
        </article>
    );
}

export function TypingBubble() {
    return (
        <article className="message-row assistant">
            <div className="message-content">
                <span className="message-author">Assistant</span>
                <div className="message-bubble typing-bubble" aria-label="Assistant is thinking">
                    <span />
                    <span />
                    <span />
                </div>
            </div>
        </article>
    );
}
