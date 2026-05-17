import { API_BASE } from "../api/chatApi";

const ADMIN_SESSION_KEY = "ragAdminSession";
const ADMIN_TOKEN_TTL_SECONDS = 60 * 60 * 8;

function base64UrlEncode(value) {
    return window
        .btoa(JSON.stringify(value))
        .replaceAll("+", "-")
        .replaceAll("/", "_")
        .replaceAll("=", "");
}

function base64UrlDecode(value) {
    const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
    return JSON.parse(window.atob(padded));
}

function createJwtLikeToken(user) {
    const now = Math.floor(Date.now() / 1000);
    const header = base64UrlEncode({ alg: "HS256", typ: "JWT" });
    const payload = base64UrlEncode({
        sub: String(user.id),
        username: user.username,
        role: "admin",
        iat: now,
        exp: now + ADMIN_TOKEN_TTL_SECONDS,
    });

    return `${header}.${payload}.frontend-session`;
}

export function getAdminSession() {
    try {
        const raw = window.localStorage.getItem(ADMIN_SESSION_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        window.localStorage.removeItem(ADMIN_SESSION_KEY);
        return null;
    }
}

export function getAdminToken() {
    return getAdminSession()?.token || "";
}

export function isAdminAuthenticated() {
    const session = getAdminSession();

    if (!session?.token) {
        return false;
    }

    try {
        const [, payload] = session.token.split(".");
        const claims = base64UrlDecode(payload);
        const isValid = claims.role === "admin" && claims.exp > Math.floor(Date.now() / 1000);

        if (!isValid) {
            clearAdminSession();
        }

        return isValid;
    } catch {
        clearAdminSession();
        return false;
    }
}

function formatAuthError(data) {
    if (typeof data?.detail === "string") {
        return data.detail;
    }

    return "Invalid admin credentials.";
}

export async function loginAdmin(username, password) {
    let res;

    try {
        res = await fetch(`${API_BASE}/api/auth/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ username, password }),
        });
    } catch {
        throw new Error("Cannot reach the backend server. Make sure FastAPI is running on http://localhost:8000.");
    }

    const data = await res.json();

    if (!res.ok) {
        throw new Error(formatAuthError(data));
    }

    const session = {
        id: data.id,
        username: data.username,
        token: createJwtLikeToken(data),
    };

    window.localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session));
    return session;
}

export function clearAdminSession() {
    window.localStorage.removeItem(ADMIN_SESSION_KEY);
}
