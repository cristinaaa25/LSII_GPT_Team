export const getEnv = () => {
  const { VITE_API_DOMAIN, VITE_MEDIA_DOMAIN, ...otherViteConfig } = import.meta.env;

  return {
    // Origin of the backend; empty when the SPA is served by the backend itself (Docker / jar)
    API_DOMAIN: VITE_API_DOMAIN,
    API_BASE_URL: `${VITE_API_DOMAIN}/api`,
    MEDIA_BASE_URL: `${VITE_MEDIA_DOMAIN}/media`,
    __vite__: otherViteConfig,
  };
};
