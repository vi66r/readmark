import { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";

// Initialize mermaid with dark theme
mermaid.initialize({
  startOnLoad: false,
  theme: "dark",
  themeVariables: {
    primaryColor: "#f59e0b",
    primaryTextColor: "#e8e8e8",
    primaryBorderColor: "#3d3d3d",
    lineColor: "#888888",
    secondaryColor: "#2d2d2d",
    tertiaryColor: "#242424",
    background: "#1a1a1a",
    mainBkg: "#242424",
    nodeBorder: "#3d3d3d",
    clusterBkg: "#2d2d2d",
    titleColor: "#e8e8e8",
    edgeLabelBackground: "#242424",
  },
  fontFamily: "var(--font-sans)",
});

interface MermaidRendererProps {
  chart: string;
}

export function MermaidRenderer({ chart }: MermaidRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [svg, setSvg] = useState<string | null>(null);

  useEffect(() => {
    const renderChart = async () => {
      if (!chart.trim()) {
        setSvg(null);
        setError(null);
        return;
      }

      try {
        const id = `mermaid-${Math.random().toString(36).slice(2, 11)}`;
        const { svg: renderedSvg } = await mermaid.render(id, chart);
        setSvg(renderedSvg);
        setError(null);
      } catch (err) {
        console.error("Mermaid render error:", err);
        setError(err instanceof Error ? err.message : "Failed to render diagram");
        setSvg(null);
      }
    };

    renderChart();
  }, [chart]);

  if (error) {
    return (
      <div className="mermaid-container border-[var(--color-error)] border-opacity-50">
        <div className="text-[var(--color-error)] text-sm mb-2">
          Failed to render diagram
        </div>
        <pre className="text-xs text-[var(--color-text-muted)] overflow-x-auto">
          {error}
        </pre>
        <details className="mt-2">
          <summary className="text-xs text-[var(--color-text-muted)] cursor-pointer">
            Show source
          </summary>
          <pre className="mt-2 text-xs text-[var(--color-text-muted)] overflow-x-auto">
            {chart}
          </pre>
        </details>
      </div>
    );
  }

  if (!svg) {
    return (
      <div className="mermaid-container">
        <div className="text-[var(--color-text-muted)] text-sm">
          Loading diagram...
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="mermaid-container"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
