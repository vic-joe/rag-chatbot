export default function AboutPage() {
    return (
        <section className="about-page">
            <div>
                <p className="eyebrow">About</p>
                <h1>A RAG assistant for grounded document conversations.</h1>
            </div>
            <p>
                The public frontend gives users a clean chatbot experience for searching approved knowledge sources.
                The admin frontend is separated into a protected dashboard for uploads, document management, and vector database visibility.
            </p>
        </section>
    );
}
