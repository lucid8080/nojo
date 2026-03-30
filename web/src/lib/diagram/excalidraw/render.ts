import type { ExcalidrawDiagram, ExcalidrawElement } from "./types";

function renderElement(el: ExcalidrawElement): string {
  switch (el.type) {
    case "rectangle":
      return (
        `<rect x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}" ` +
        `fill="${el.backgroundColor}" stroke="${el.strokeColor}" stroke-width="${el.strokeWidth}" rx="4" />`
      );
    case "ellipse":
      return (
        `<ellipse cx="${el.x + el.width / 2}" cy="${el.y + el.height / 2}" rx="${el.width / 2}" ry="${el.height / 2}" ` +
        `fill="${el.backgroundColor}" stroke="${el.strokeColor}" stroke-width="${el.strokeWidth}" />`
      );
    case "text":
      // Very basic text rendering
      const fontSize = el.fontSize || 20;
      // Excalidraw's y might be top, SVG text y is baseline, so approximate adjustment:
      return (
        `<text x="${el.x + (el.textAlign === "center" ? el.width / 2 : 0)}" y="${el.y + fontSize}" ` +
        `fill="${el.strokeColor}" font-size="${fontSize}" font-family="sans-serif" ` +
        `${el.textAlign === "center" ? 'text-anchor="middle" ' : ''}>` +
        `${el.text?.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")} ` +
        `</text>`
      );
    case "arrow":
    case "line":
      if (!el.points || el.points.length < 2) return "";
      const pathData = el.points
        .map((p, i) => `${i === 0 ? "M" : "L"} ${el.x + p[0]} ${el.y + p[1]}`)
        .join(" ");
      return `<path d="${pathData}" fill="none" stroke="${el.strokeColor}" stroke-width="${el.strokeWidth}" />`;
    default:
      return "";
  }
}

/**
 * Render Excalidraw elements to an SVG string.
 * This is a minimal fallback V1 renderer.
 */
export function renderExcalidrawToSvg(diagram: ExcalidrawDiagram): string {
  // Compute bounds
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;

  if (diagram.elements.length === 0) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"></svg>`;
  }

  diagram.elements.forEach((el) => {
    if (el.x < minX) minX = el.x;
    if (el.y < minY) minY = el.y;
    // For lines, consider points
    if ((el.type === "line" || el.type === "arrow") && el.points) {
      el.points.forEach((p) => {
        if (el.x + p[0] < minX) minX = el.x + p[0];
        if (el.x + p[0] > maxX) maxX = el.x + p[0];
        if (el.y + p[1] < minY) minY = el.y + p[1];
        if (el.y + p[1] > maxY) maxY = el.y + p[1];
      });
    } else {
      if (el.x + el.width > maxX) maxX = el.x + el.width;
      if (el.y + el.height > maxY) maxY = el.y + el.height;
    }
  });

  // Adding padding
  const padding = 20;
  minX -= padding;
  minY -= padding;
  maxX += padding;
  maxY += padding;

  const width = Math.max(10, maxX - minX);
  const height = Math.max(10, maxY - minY);

  const renderedElements = diagram.elements.map(renderElement).join("\\n    ");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${minX} ${minY} ${width} ${height}">
    <rect x="${minX}" y="${minY}" width="${width}" height="${height}" fill="${diagram.appState.viewBackgroundColor || "#ffffff"}" />
    ${renderedElements}
  </svg>`;
}
