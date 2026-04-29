/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "raw.githubusercontent.com",
        pathname: "/PokeAPI/sprites/**",
      },
      {
        protocol: "https",
        hostname: "play.pokemonshowdown.com",
        pathname: "/sprites/**",
      },
    ],
  },
};

export default nextConfig;
