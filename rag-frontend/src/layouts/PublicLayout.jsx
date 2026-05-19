export default function PublicLayout({ children }) {
    return (
        <div className="public-shell">
            {/* <header className="public-header">
                <NavigationLink to="/" className="brand-link">
                    <span className="brand-mark">R</span>
                    <span>
                        <strong>UDOM Chatbot</strong>
                        <small>Document intelligence</small>
                    </span>
                </NavigationLink>

                <nav className="public-nav" aria-label="Public navigation">
                    <NavigationLink to="/">Chat</NavigationLink>
                    <NavigationLink to="/about">About</NavigationLink>
                </nav>
            </header> */}

            <main>{children}</main>
        </div>
    );
}
