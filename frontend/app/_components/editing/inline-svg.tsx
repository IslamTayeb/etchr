import React from "react";
import axios from "axios";

interface InlineSvgProps {
    src: string;
    repoUrl: string;
    alt?: string;
}

export function InlineSvg({ src, repoUrl, alt }: InlineSvgProps) {
    const [svgContent, setSvgContent] = React.useState<string | null>(null);
    const prevSrcRef = React.useRef<string | null>(null);
    const prevRepoUrlRef = React.useRef<string | null>(null);

    React.useEffect(() => {
        if (prevSrcRef.current === src && prevRepoUrlRef.current === repoUrl) {
            return;
        }

        prevSrcRef.current = src;
        prevRepoUrlRef.current = repoUrl;

        const cacheKey = `${repoUrl}-${src}`;
        const cachedSvg = sessionStorage.getItem(cacheKey);

        if (cachedSvg) {
            setSvgContent(cachedSvg);
            return;
        }

        let cancelled = false;
        async function fetchSvg() {
            try {
                const token = localStorage.getItem("githubToken") || "";
                const [owner, repo] = repoUrl.replace("https://github.com/", "").split("/");
                const pathMatch = src.match(/\/blob\/main\/(.+?)\?raw=true$/);
                if (!pathMatch) return;

                const response = await axios.get(
                    `https://api.github.com/repos/${owner}/${repo}/contents/${pathMatch[1]}`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                            Accept: "application/vnd.github.v3.raw",
                        },
                    }
                );
                if (!cancelled) {
                    const svgData = typeof response.data === "string" ? response.data : "";
                    setSvgContent(svgData);
                    sessionStorage.setItem(cacheKey, svgData);
                }
            } catch (error) {
                console.error("Error fetching inline SVG:", error);
            }
        }

        fetchSvg();

        return () => {
            cancelled = true;
        };
    }, [src, repoUrl]);

    if (!svgContent) return null;

    return (
        <div
            aria-label={alt || "SVG"}
            dangerouslySetInnerHTML={{ __html: svgContent }}
            style={{ maxWidth: "100%" }}
        />
    );
}
