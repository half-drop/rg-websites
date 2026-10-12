// Vite supplies the deployment base for both client code and static export.
export function siteAssetUrl(value) {
  return (import.meta.env?.BASE_URL || '/') + value.replace(/^\/+/, '');
}
