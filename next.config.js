/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configurações para melhor performance
  reactStrictMode: true,
  swcMinify: true,
  
  // Permite requisições para APIs externas
  async rewrites() {
    return [];
  },
  
  // Headers para CORS e segurança
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
