export default function cloudflareLoader({
  src,
  width,
  quality,
}: {
  src: string;
  width: number;
  quality?: number;
}) {
  if (src.startsWith('https://res.cloudinary.com/')) {
    return src;
  }
  return `https://my.kareerfit.com/_next/image?url=${src}&w=${width}&q=${quality || 75}`;
}
