import { API_BASE } from "./chatApi";

export async function uploadDocument(file) {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`${API_BASE}/api/admin/documents/`, {
        method: "POST",
        body: formData,
    });

    const data = await res.json();

    if (!res.ok) {
        throw new Error(data.detail || "Document upload failed");
    }

    return data;
}

async function requestDocument(path, options = {}) {
    const res = await fetch(`${API_BASE}/api/admin${path}`, {
        headers: options.body instanceof FormData ? undefined : {
            "Content-Type": "application/json",
        },
        ...options,
    });

    const data = await res.json();

    if (!res.ok) {
        throw new Error(data.detail || "Document request failed");
    }

    return data;
}

export function getDocuments() {
    return requestDocument("/documents/");
}

export function updateDocument(id, payload) {
    return requestDocument(`/documents/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: JSON.stringify(payload),
    });
}

export function deleteDocument(id) {
    return requestDocument(`/documents/${encodeURIComponent(id)}`, {
        method: "DELETE",
    });
}
