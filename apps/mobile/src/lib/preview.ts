// Demo data only on explicit opt-in: a production build missing its backend URL must show the
// configuration error, never sample products as if they were real.
export const isPreview=process.env.EXPO_PUBLIC_PREVIEW==='1';
