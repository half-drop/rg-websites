// Vite supplies the Next basePath here; local and GitHub Pages use the same data.
export function assetUrl(value) {
  return (import.meta.env?.BASE_URL || '/') + value.replace(/^\/+/, '');
}
