/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
  async redirects() {
    return [
      // Redirect old /recruiter/scenarios URLs to /recruiter/simulations
      {
        source: "/recruiter/scenarios",
        destination: "/recruiter/simulations",
        permanent: true,
      },
      {
        source: "/recruiter/scenarios/new",
        destination: "/recruiter/simulations/new",
        permanent: true,
      },
      {
        source: "/recruiter/scenarios/:id",
        destination: "/recruiter/simulations/:id",
        permanent: true,
      },
      // Redirect old API routes
      {
        source: "/api/recruiter/scenarios",
        destination: "/api/recruiter/simulations",
        permanent: true,
      },
      {
        source: "/api/recruiter/scenarios/builder",
        destination: "/api/recruiter/simulations/builder",
        permanent: true,
      },
      {
        source: "/api/recruiter/scenarios/:id/coworkers",
        destination: "/api/recruiter/simulations/:id/coworkers",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
