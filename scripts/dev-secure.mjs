process.env.LOCAL_HTTPS = 'true';
const { createServer } = await import('vite');
const server = await createServer();
await server.listen();
server.printUrls();
console.log('Public site: https://app.patente.localhost:8443/');
console.log('React backoffice: https://app.patente.localhost:8443/login');
