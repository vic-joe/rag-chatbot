const cards = [
    { key: "documents", label: "Documents", helper: "Uploaded source files" },
    { key: "chunks", label: "Vector chunks", helper: "Searchable embeddings" },
    { key: "sources", label: "Unique sources", helper: "Distinct indexed files" },
];

export default function Dashboard({ stats }) {
    return (
        <section className="dashboard-overview">
            <div className="dashboard-card-grid">
                {cards.map((card) => (
                    <article className="dashboard-stat-card" key={card.key}>
                        <p>{card.label}</p>
                        <strong>{stats.isLoading ? "..." : stats[card.key]}</strong>
                        <span>{card.helper}</span>
                    </article>
                ))}
            </div>

            <div className="dashboard-panel-grid">
                <article className="admin-panel">
                    <div>
                        <p className="eyebrow">Knowledge workflow</p>
                        <h3>Document operations</h3>
                    </div>
                    <div className="workflow-list">
                        <span>Upload PDF, DOCX, or TXT files</span>
                        <span>Chunk and embed content</span>
                        <span>Review indexed document groups</span>
                        <span>Serve answers through the public chatbot</span>
                    </div>
                </article>

                <article className="admin-panel">
                    <div>
                        <p className="eyebrow">Vector database</p>
                        <h3>{stats.error ? "Connection issue" : "Index operational"}</h3>
                    </div>
                    <p className="panel-copy">
                        {stats.error
                            ? stats.error
                            : "The document index is reachable and ready for semantic retrieval."}
                    </p>
                </article>
            </div>
        </section>
    );
}
