export default function VectorStatus({ stats, documents }) {
    return (
        <section className="vector-status-page">
            <div className="dashboard-card-grid">
                <article className="dashboard-stat-card">
                    <p>Status</p>
                    <strong>{stats.error ? "Alert" : "Healthy"}</strong>
                    <span>{stats.error || "Vector store is responding"}</span>
                </article>
                <article className="dashboard-stat-card">
                    <p>Embeddings</p>
                    <strong>{stats.isLoading ? "..." : stats.chunks}</strong>
                    <span>Total searchable chunks</span>
                </article>
                <article className="dashboard-stat-card">
                    <p>Coverage</p>
                    <strong>{stats.isLoading ? "..." : stats.documents}</strong>
                    <span>Document groups in the index</span>
                </article>
            </div>

            <article className="admin-panel">
                <div>
                    <p className="eyebrow">Indexed sources</p>
                    <h3>Vector database contents</h3>
                </div>

                <div className="source-table">
                    {documents.length === 0 && !stats.isLoading ? (
                        <p className="empty-documents">No indexed sources yet.</p>
                    ) : (
                        documents.map((document) => (
                            <div className="source-row" key={document.id}>
                                <span>{document.source || "Manual entry"}</span>
                                <strong>{document.chunk_count ?? 1} chunks</strong>
                            </div>
                        ))
                    )}
                </div>
            </article>
        </section>
    );
}
