export default function NavigationLink({ to, children, className = "", onNavigate }) {
    const handleClick = (event) => {
        if (
            event.metaKey ||
            event.ctrlKey ||
            event.shiftKey ||
            event.altKey ||
            event.button !== 0
        ) {
            return;
        }

        event.preventDefault();
        window.history.pushState({}, "", to);
        window.dispatchEvent(new PopStateEvent("popstate"));
        onNavigate?.();
    };

    return (
        <a href={to} className={className} onClick={handleClick}>
            {children}
        </a>
    );
}
