/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    serverActions: { bodySizeLimit: '10mb' },
    // Importa solo los iconos usados (lucide-react exporta cientos): menos JS que compilar y enviar.
    optimizePackageImports: ['lucide-react'],
  },
  // Permite que el CRM padre embeba esta app
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Access-Control-Allow-Origin', value: process.env.CRM_ORIGIN || '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
    ];
  },
};

export default nextConfig;
