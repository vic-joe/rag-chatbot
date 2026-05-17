import { useMemo, useState } from "react";
import { uploadDocument } from "../../api/documentApi";

const acceptedExtensions = [".pdf", ".docx", ".txt"];

function isAcceptedFile(file) {
    return acceptedExtensions.some((extension) => file.name.toLowerCase().endsWith(extension));
}

export default function UploadCard({ onUploaded }) {
    const [file, setFile] = useState(null);
    const [msg, setMsg] = useState("");
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [statusType, setStatusType] = useState("");

    const fileMeta = useMemo(() => {
        if (!file) {
            return "PDF, DOCX, or TXT up to your backend limit";
        }

        return `${Math.max(file.size / 1024 / 1024, 0.01).toFixed(2)} MB`;
    }, [file]);

    const selectFile = (nextFile) => {
        if (!nextFile) return;

        if (!isAcceptedFile(nextFile)) {
            setFile(null);
            setMsg("Choose a PDF, DOCX, or TXT file.");
            setStatusType("error");
            return;
        }

        setFile(nextFile);
        setMsg("");
        setProgress(0);
        setStatusType("");
    };

    const handleUpload = async () => {
        if (!file) {
            setMsg("Choose a PDF, DOCX, or TXT file first.");
            setStatusType("error");
            return;
        }

        setIsUploading(true);
        setMsg("Uploading and indexing...");
        setStatusType("info");
        setProgress(8);

        try {
            const res = await uploadDocument(file, setProgress);
            setMsg(`Uploaded ${res.filename}. Added ${res.chunks_stored ?? 0} searchable chunks.`);
            setStatusType("success");
            setProgress(100);
            setFile(null);
            onUploaded?.();
        } catch (error) {
            setMsg(error.message);
            setStatusType("error");
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <section className="upload-card">
            <div className="upload-card-header">
                <div>
                    <p className="eyebrow">Upload documents</p>
                    <h2>Add knowledge files</h2>
                </div>
                <span className="file-count">{file ? "1 selected" : "Ready"}</span>
            </div>

            <label
                className={`file-dropzone ${isDragging ? "dragging" : ""}`}
                onDragOver={(event) => {
                    event.preventDefault();
                    setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(event) => {
                    event.preventDefault();
                    setIsDragging(false);
                    selectFile(event.dataTransfer.files[0]);
                }}
            >
                <input
                    type="file"
                    accept=".pdf,.docx,.txt"
                    onChange={(event) => selectFile(event.target.files[0])}
                />
                <span className="file-dropzone-icon">+</span>
                <span className="file-dropzone-title">
                    {file ? file.name : "Drop a file here or browse"}
                </span>
                <span className="file-dropzone-meta">{fileMeta}</span>
            </label>

            <div className="upload-progress" aria-label="Upload progress">
                <span style={{ width: `${progress}%` }} />
            </div>

            <button type="button" onClick={handleUpload} disabled={isUploading}>
                {isUploading ? "Uploading..." : "Upload document"}
            </button>

            {msg && <p className={`upload-status ${statusType}`}>{msg}</p>}
        </section>
    );
}
