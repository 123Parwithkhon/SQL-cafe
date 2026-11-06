// Аватар: фото из Google или инициалы на цветном круге (цвет стабилен для имени)
const COLORS = ['#c8552c', '#2a7f62', '#b07d22', '#3d6a9e', '#8a4f7d', '#5b7a3a'];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?';
}

function colorFor(name: string): string {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return COLORS[hash % COLORS.length];
}

export function Avatar({ name, image, size = 32 }: { name: string; image?: string | null; size?: number }) {
  if (image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={image}
        alt=""
        width={size}
        height={size}
        referrerPolicy="no-referrer"
        className="shrink-0 rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      aria-hidden
      className="inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
      style={{ width: size, height: size, background: colorFor(name), fontSize: size * 0.4 }}
    >
      {initials(name)}
    </span>
  );
}
