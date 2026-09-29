/** @type {import('next').NextConfig} */
const nextConfig = {
  // Commit del deploy, fijado al compilar (Vercel lo expone en el build).
  env: { COMMIT_SHA: process.env.VERCEL_GIT_COMMIT_SHA ?? "" },
};

export default nextConfig;
