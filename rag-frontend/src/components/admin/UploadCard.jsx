import { useMemo, useState } from "react";
import { uploadDocument } from "../../api/documentApi";

const acceptedExtensions = [".pdf", ".docx", ".txt"];

function isAcceptedFile(file) {
    return acceptedExtensions.some((ext) => file.name.toLowerCase().endsWith(ext));
}

const UploadCloudIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="16 16 12 12 8 16" />
        <line x1="12" y1="12" x2="12" y2="21" />
        <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
    </svg>
);
const FileIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
        <path d="M14 2v4a2 2 0 0 0 2 2h4" />
    </svg>
);
const CheckIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
    </svg>
);
const AlertIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
);
const InfoIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
);
const SendIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="22" y1="2" x2="11" y2="13" />
        <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
);

export default function UploadCard({ onUploaded }) {
    const [file, setFile] = useState(null);
    const [msg, setMsg] = useState("");
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [statusType, setStatusType] = useState("");

    const fileMeta = useMemo(() => {
        if (!file) return "PDF, DOCX, or TXT · up to your backend limit";
        return `${Math.max(file.size / 1024 / 1024, 0.01).toFixed(2)} MB`;
    }, [file]);

    const selectFile = (nextFile) => {
        if (!nextFile) return;
        if (!isAcceptedFile(nextFile)) {
            setFile(null);
            setMsg("Please choose a PDF, DOCX, or TXT file.");
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
            setMsg("Please choose a file first.");
            setStatusType("error");
            return;
        }
        setIsUploading(true);
        setMsg("Uploading and indexing…");
        setStatusType("info");
        setProgress(8);
        try {
            const res = await uploadDocument(file, setProgress);
            setMsg(`✓ Uploaded ${res.filename} — ${res.chunks_stored ?? 0} searchable chunks added.`);
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

    const statusIcon = { success: <CheckIcon />, error: <AlertIcon />, info: <InfoIcon /> }[statusType];

    return (
        <section style={styles.card}>
            {/* Header */}
            <div style={styles.header}>
                <div>
                    <span style={styles.eyebrow}>Upload Documents</span>
                    <h2 style={styles.title}>Add Knowledge Files</h2>
                </div>
                <span style={{ ...styles.badge, ...(file ? styles.badgeActive : {}) }}>
                    {file ? "1 selected" : "Ready"}
                </span>
            </div>

            {/* Dropzone */}
            <label
                style={{
                    ...styles.dropzone,
                    ...(isDragging ? styles.dropzoneDragging : {}),
                    ...(file ? styles.dropzoneHasFile : {}),
                }}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => { e.preventDefault(); setIsDragging(false); selectFile(e.dataTransfer.files[0]); }}
            >
                <input
                    type="file"
                    accept=".pdf,.docx,.txt"
                    style={{ display: "none" }}
                    onChange={(e) => selectFile(e.target.files[0])}
                />
                <span style={{ ...styles.dropzoneIcon, ...(file ? styles.dropzoneIconActive : {}) }}>
                    {file ? <FileIcon /> : <UploadCloudIcon />}
                </span>
                <span style={styles.dropzoneTitle}>
                    {file ? file.name : "Drop a file here or browse"}
                </span>
                <span style={styles.dropzoneMeta}>{fileMeta}</span>
            </label>

            {/* Progress Bar */}
            {progress > 0 && (
                <div style={styles.progressTrack} aria-label="Upload progress">
                    <div
                        style={{
                            ...styles.progressFill,
                            width: `${progress}%`,
                            ...(progress === 100 ? styles.progressComplete : {}),
                        }}
                    />
                </div>
            )}

            {/* Upload Button */}
            <button
                type="button"
                onClick={handleUpload}
                disabled={isUploading || !file}
                style={{
                    ...styles.button,
                    ...(!file || isUploading ? styles.buttonDisabled : {}),
                }}
            >
                {isUploading ? (
                    <span style={styles.buttonInner}><span style={styles.spinner} />Uploading…</span>
                ) : (
                    <span style={styles.buttonInner}><SendIcon />Upload Document</span>
                )}
            </button>

            {/* Status Message */}
            {msg && (
                <div style={{
                    ...styles.statusBox,
                    ...(styles[`status_${statusType}`] || {}),
                }}>
                    {statusIcon}
                    <span>{msg}</span>
                </div>
            )}
        </section>
    );
}

const styles = {
    card: {
        background: "#1a2332",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: "20px",
        padding: "28px",
        display: "flex",
        flexDirection: "column",
        gap: "20px",
    },
    header: {
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
    },
    eyebrow: {
        display: "block",
        fontSize: "11px",
        fontWeight: "700",
        letterSpacing: "1.5px",
        textTransform: "uppercase",
        color: "#63b3a4",
        marginBottom: "4px",
    },
    title: {
        fontSize: "20px",
        fontWeight: "700",
        color: "#e2e8f0",
        margin: 0,
    },
    badge: {
        padding: "4px 12px",
        borderRadius: "20px",
        fontSize: "12px",
        fontWeight: "600",
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.08)",
        color: "#718096",
        whiteSpace: "nowrap",
    },
    badgeActive: {
        background: "rgba(99,179,164,0.1)",
        border: "1px solid rgba(99,179,164,0.3)",
        color: "#63b3a4",
    },
    dropzone: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        padding: "36px 24px",
        borderRadius: "14px",
        border: "2px dashed rgba(255,255,255,0.1)",
        background: "rgba(255,255,255,0.02)",
        cursor: "pointer",
        transition: "all 0.2s",
        textAlign: "center",
    },
    dropzoneDragging: {
        border: "2px dashed rgba(99,179,164,0.5)",
        background: "rgba(99,179,164,0.04)",
    },
    dropzoneHasFile: {
        border: "2px dashed rgba(99,179,164,0.3)",
        background: "rgba(99,179,164,0.03)",
    },
    dropzoneIcon: {
        width: "56px",
        height: "56px",
        borderRadius: "14px",
        background: "rgba(255,255,255,0.04)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#4a5568",
        marginBottom: "4px",
    },
    dropzoneIconActive: {
        background: "rgba(99,179,164,0.1)",
        color: "#63b3a4",
    },
    dropzoneTitle: {
        fontSize: "14px",
        fontWeight: "600",
        color: "#a0aec0",
        wordBreak: "break-all",
    },
    dropzoneMeta: {
        fontSize: "12px",
        color: "#4a5568",
    },
    progressTrack: {
        height: "4px",
        borderRadius: "4px",
        background: "rgba(255,255,255,0.06)",
        overflow: "hidden",
    },
    progressFill: {
        height: "100%",
        borderRadius: "4px",
        background: "linear-gradient(90deg, #63b3a4, #4a9080)",
        transition: "width 0.4s ease",
    },
    progressComplete: {
        background: "linear-gradient(90deg, #63b3a4, #68d391)",
    },
    button: {
        width: "100%",
        padding: "13px",
        borderRadius: "12px",
        border: "none",
        background: "linear-gradient(135deg, #63b3a4, #4a9080)",
        color: "#0d1520",
        fontSize: "14px",
        fontWeight: "700",
        cursor: "pointer",
        transition: "opacity 0.2s",
    },
    buttonDisabled: {
        opacity: 0.4,
        cursor: "not-allowed",
    },
    buttonInner: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
    },
    spinner: {
        width: "14px",
        height: "14px",
        border: "2px solid rgba(13,21,32,0.3)",
        borderTop: "2px solid #0d1520",
        borderRadius: "50%",
        animation: "spin 0.8s linear infinite",
        display: "inline-block",
    },
    statusBox: {
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "12px 14px",
        borderRadius: "10px",
        fontSize: "13px",
        lineHeight: 1.4,
    },
    status_success: {
        background: "rgba(99,179,164,0.08)",
        border: "1px solid rgba(99,179,164,0.2)",
        color: "#63b3a4",
    },
    status_error: {
        background: "rgba(252,129,74,0.08)",
        border: "1px solid rgba(252,129,74,0.2)",
        color: "#fc814a",
    },
    status_info: {
        background: "rgba(99,179,230,0.08)",
        border: "1px solid rgba(99,179,230,0.2)",
        color: "#63b3e6",
    },
};
