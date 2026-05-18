import { useState } from "react";

export default function NavigationLink({ to, children, className = "", onNavigate }) {
    const [isHovered, setIsHovered] = useState(false);

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

    const isActive = typeof window !== "undefined" && window.location.pathname === to;

    return (
        <a
            href={to}
            className={className}
            onClick={handleClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 12px",
                borderRadius: "10px",
                fontSize: "13px",
                fontWeight: "600",
                textDecoration: "none",
                transition: "all 0.15s",
                letterSpacing: "0.1px",
                ...(isActive
                    ? {
                        background: "rgba(99,179,164,0.12)",
                        color: "#63b3a4",
                        border: "1px solid rgba(99,179,164,0.25)",
                    }
                    : isHovered
                    ? {
                        background: "rgba(255,255,255,0.05)",
                        color: "#cbd5e0",
                        border: "1px solid rgba(255,255,255,0.07)",
                    }
                    : {
                        background: "transparent",
                        color: "#718096",
                        border: "1px solid transparent",
                    }),
            }}
        >
            {children}
        </a>
    );
}
