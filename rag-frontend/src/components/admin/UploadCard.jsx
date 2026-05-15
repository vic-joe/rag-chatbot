import { useState } from "react";
import { uploadDocument } from "../../api/documentApi";

export default function UploadCard({ onUploaded }) {
    const [file, setFile] = useState(null);
    const [msg, setMsg] = useState("");
    const [isUploading, setIsUploading] = useState(false);
    const [statusType, setStatusType] = useState("");

    const handleUpload = async () => {
        if (!file) {
            setMsg("Choose a PDF or DOCX first.");
            setStatusType("error");
            return;
        }

        setIsUploading(true);
        setMsg("Uploading...");
        setStatusType("info");

        try {
            const res = await uploadDocument(file);
            setMsg(`Uploaded ${res.filename}. Added to documents.`);
            setStatusType("success");
            onUploaded?.();
        } catch (error) {
            setMsg(error.message);
            setStatusType("error");
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="upload-card">
            <div className="upload-card-header">
                <div>
                    <p className="eyebrow">Document library</p>
                    <h2>Upload knowledge files</h2>
                </div>
                <span className="file-count">{file ? "1 selected" : "Ready"}</span>
            </div>

            <label className="file-dropzone">
                <input
                    type="file"
                    accept=".pdf,.docx"
                    onChange={(e) => {
                        setFile(e.target.files[0]);
                        setMsg("");
                        setStatusType("");
                    }}
                />
                <span className="file-dropzone-icon">+</span>
                <span className="file-dropzone-title">
                    {file ? file.name : "Choose a PDF or DOCX"}
                </span>
                <span className="file-dropzone-meta">
                    {file ? `${Math.max(file.size / 1024 / 1024, 0.01).toFixed(2)} MB` : "Documents become searchable after upload"}
                </span>
            </label>

            <button type="button" onClick={handleUpload} disabled={isUploading}>
                {isUploading ? "Uploading..." : "Upload"}
            </button>

            {msg && <p className={`upload-status ${statusType}`}>{msg}</p>}
        </div>
    );
}
