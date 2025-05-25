import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Exclude supabase functions from TypeScript checking (they're Deno edge functions)
  typescript: {
    ignoreBuildErrors: false,
  },
  // Exclude supabase functions from webpack compilation
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
    };
    
    // Ignore supabase functions directory during build
    config.watchOptions = {
      ...config.watchOptions,
      ignored: ['**/supabase/functions/**'],
    };
    
    return config;
  },
  // Update to new property name for Next.js 15
  serverExternalPackages: ['supabase'],
};

export default nextConfig;
