export const appBase = import.meta.env.BASE_URL.replace(/\/+$/, '');
export const appUrl = (path: string) => `${appBase}/${path.replace(/^\/+/, '')}`;
