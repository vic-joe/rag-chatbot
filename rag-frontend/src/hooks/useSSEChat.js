/**
 * useSSEChat.js
 * -------------
 * Replaces useWebSocket.js with a fetch-based SSE streaming hook.
 *
 * Why fetch instead of native EventSource?
 *   EventSource only supports GET requests with no body.
 *   Our stream endpoint needs POST + JSON body (message, history, session_id).
 *   fetch() + ReadableStream is the standard solution.
 *
 * SSE event format (sent by POST /api/chat/stream):
 *   data: {"type":"stream","token":"hello"}\n\n
 *   data: {"type":"done"}\n\n
 *   data: {"type":"error","message":"..."}\n\n
 *
 * Usage:
 *   const { sendMessage, abort } = useSSEChat(onEvent);
 *
 *   onEvent({ type: "stream", token })  → called for each token
 *   onEvent({ type: "done" })           → stream finished
 *   onEvent({ type: "error", message }) → something went wrong
 */

import { useRef, useCallback } from "react";
import { API_BASE } from "../api/chatApi";

const STREAM_URL = `${API_BASE}/api/chat/stream`;

export function useSSEChat(onEvent) {
    // Keep a reference to the AbortController so we can cancel mid-stream
    const abortRef = useRef(null);

    /** Cancel any in-flight stream */
    const abort = useCallback(() => {
        abortRef.current?.abort();
        abortRef.current = null;
    }, []);

    /**
     * sendMessage
     * -----------
     * @param {string}  message    User message text
     * @param {number|null} sessionId  DB session id (null for guest)
     * @param {number|null} userId     DB user id    (null for guest)
     * @param {Array}   history    Recent chat history for context
     */
    const sendMessage = useCallback(
        async (message, sessionId = null, userId = null, history = []) => {
            // Cancel any previous stream before starting a new one
            abort();
            const controller = new AbortController();
            abortRef.current = controller;

            let response;
            try {
                response = await fetch(STREAM_URL, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        message,
                        session_id: sessionId ?? undefined,
                        user_id: userId ?? undefined,
                        history,
                    }),
                    signal: controller.signal,
                });
            } catch (err) {
                if (err.name === "AbortError") return;
                onEvent({ type: "error", message: "Cannot reach the backend server." });
                return;
            }

            if (!response.ok) {
                let detail = `Server error ${response.status}`;
                try {
                    const body = await response.json();
                    if (body?.detail) detail = typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail);
                } catch (_) { /* ignore */ }
                onEvent({ type: "error", message: detail });
                return;
            }

            // Read the SSE stream line by line
            const reader = response.body.getReader();
            const decoder = new TextDecoder("utf-8");
            let buffer = "";

            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });

                    // SSE events are separated by \n\n
                    const parts = buffer.split("\n\n");
                    // The last part may be an incomplete event — keep it in the buffer
                    buffer = parts.pop() ?? "";

                    for (const part of parts) {
                        // Each part may have multiple "data: ..." lines (we only send one)
                        const dataLine = part
                            .split("\n")
                            .find((line) => line.startsWith("data: "));
                        if (!dataLine) continue;

                        const raw = dataLine.slice("data: ".length).trim();
                        try {
                            const event = JSON.parse(raw);
                            onEvent(event);
                        } catch (_) {
                            // Malformed JSON — skip
                        }
                    }
                }
            } catch (err) {
                if (err.name !== "AbortError") {
                    onEvent({ type: "error", message: "Stream interrupted unexpectedly." });
                }
            } finally {
                abortRef.current = null;
            }
        },
        [onEvent, abort]
    );

    return { sendMessage, abort };
}
