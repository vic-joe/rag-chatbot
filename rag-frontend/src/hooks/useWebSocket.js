import { useEffect, useRef } from "react";
import { WS_BASE } from "../api/chatApi";

export function useWebSocket(userId, onMessage) {
    const ws = useRef(null);

    useEffect(() => {
        ws.current = new WebSocket(`${WS_BASE}/${userId}`);

        ws.current.onmessage = (event) => {
            onMessage(JSON.parse(event.data));
        };

        return () => {
            ws.current?.close();
        };
    }, [userId, onMessage]);

    const sendMessage = (msg, sessionId, history = []) => {
        if (ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({ message: msg, session_id: sessionId, history }));
        }
    };

    return { sendMessage };
}
