import { useCallback, useEffect, useMemo, useState } from "react";
import {
    deleteDocument,
    getDocuments,
    updateDocument,
} from "../../api/documentApi";

const emptyForm = {
    content: "",
    source: "",
};

export default function DocumentManager({ refreshKey = 0 }) {
    const [documents, setDocuments] = useState([]);
    const [form, setForm] = useState(emptyForm);
    const [editingId, setEditingId] = useState(null);
    const [status, setStatus] = useState("");
    const [statusType, setStatusType] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const selectedDocument = useMemo(
        () => documents.find((document) => document.id === editingId),
        [documents, editingId]
    );

    const loadDocuments = useCallback(async ({ clearStatus = true } = {}) => {
        setIsLoading(true);
        try {
            const data = await getDocuments();
            setDocuments(data);
            if (clearStatus) {
                setStatus("");
                setStatusType("");
            }
        } catch (error) {
            setStatus(error.message);
            setStatusType("error");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            loadDocuments();
        }, 0);

        return () => window.clearTimeout(timer);
    }, [loadDocuments, refreshKey]);

    const handleChange = (event) => {
        const { name, value } = event.target;
        setForm((current) => ({ ...current, [name]: value }));
    };

    const resetForm = () => {
        setForm(emptyForm);
        setEditingId(null);
    };

    const toPayload = () => {
        const payload = { content: form.content.trim() };
        const source = form.source.trim();

        if (source) {
            payload.source = source;
        }

        return payload;
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (!form.content.trim()) {
            setStatus("Content is required.");
            setStatusType("error");
            return;
        }

        setIsSaving(true);
        try {
            await updateDocument(editingId, toPayload());
            setStatus("Document updated.");

            setStatusType("success");
            resetForm();
            await loadDocuments({ clearStatus: false });
        } catch (error) {
            setStatus(error.message);
            setStatusType("error");
        } finally {
            setIsSaving(false);
        }
    };

    const handleEdit = (document) => {
        setEditingId(document.id);
        setForm({
            content: document.content,
            source: document.source || "",
        });
        setStatus("");
        setStatusType("");
    };

    const handleDelete = async (document) => {
        const confirmed = window.confirm(
            `Delete ${document.source || "this document"}? This removes the whole document from search.`
        );

        if (!confirmed) {
            return;
        }

        try {
            await deleteDocument(document.id);
            if (editingId === document.id) {
                resetForm();
            }
            setStatus("Document deleted.");
            setStatusType("success");
            await loadDocuments({ clearStatus: false });
        } catch (error) {
            setStatus(error.message);
            setStatusType("error");
        }
    };

    return (
        <section className="document-manager">
            <div className="document-manager-header">
                <div>
                    <p className="eyebrow">Library controls</p>
                    <h2>Manage documents</h2>
                </div>
                <button type="button" className="ghost-button" onClick={loadDocuments} disabled={isLoading}>
                    {isLoading ? "Refreshing..." : "Refresh"}
                </button>
            </div>

            {editingId ? (
                <form className="document-form" onSubmit={handleSubmit}>
                    <label>
                        Content
                        <textarea
                            name="content"
                            value={form.content}
                            onChange={handleChange}
                            placeholder="Edit the searchable text for this document"
                            rows="8"
                        />
                    </label>

                    <label>
                        Source
                        <input
                            name="source"
                            value={form.source}
                            onChange={handleChange}
                            placeholder="policy.pdf"
                        />
                    </label>

                    <div className="document-form-actions">
                        <button type="submit" disabled={isSaving}>
                            {isSaving ? "Saving..." : "Update document"}
                        </button>
                        <button type="button" className="ghost-button" onClick={resetForm}>
                            Cancel edit
                        </button>
                    </div>

                    {selectedDocument && (
                        <p className="document-editing-note">
                            Editing {selectedDocument.source || "manual entry"} with {selectedDocument.chunk_count ?? 1} searchable parts.
                        </p>
                    )}
                </form>
            ) : (
                <div className="document-empty-editor">
                    <p className="eyebrow">Edit mode</p>
                    <h3>Select a document</h3>
                    <p>Choose Edit on any row below to update its text or source.</p>
                </div>
            )}

            {status && <p className={`upload-status ${statusType}`}>{status}</p>}

            <div className="document-list">
                {documents.length === 0 && !isLoading ? (
                    <p className="empty-documents">No documents found yet. Use Upload to add PDF or DOCX files.</p>
                ) : (
                    documents.map((document) => (
                        <article className="document-row" key={document.id}>
                            <div>
                                <div className="document-row-meta">
                                    <span>{document.source || "Manual entry"}</span>
                                    <span>{document.chunk_count ?? 1} searchable parts</span>
                                </div>
                                <p>{document.content}</p>
                            </div>
                            <div className="document-row-actions">
                                <button type="button" onClick={() => handleEdit(document)}>
                                    Edit
                                </button>
                                <button type="button" className="danger-button" onClick={() => handleDelete(document)}>
                                    Delete
                                </button>
                            </div>
                        </article>
                    ))
                )}
            </div>
        </section>
    );
}
