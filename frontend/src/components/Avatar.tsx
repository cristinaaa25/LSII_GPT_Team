import React, { useState } from 'react';

interface Props {
  /** Already resolved image URL (see resolveAvatarUrl); empty means "use the initial". */
  src?: string | null;
  /** Name used for the initial and, by default, for the accessible name. */
  name: string;
  size?: number;
  /** Accessible name; pass '' when the name is already written next to the avatar. */
  alt?: string;
  className?: string;
}

/** User picture, or a coloured circle with the first letter of the name when there is none (or it fails). */
const Avatar: React.FC<Props> = ({ src, name, size = 32, alt = name, className = '' }) => {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const style = { width: size, height: size, fontSize: Math.round(size * 0.45) };
  const decorative = alt === '';

  if (src && failedSrc !== src) {
    return (
      <img
        src={src}
        alt={alt}
        width={size}
        height={size}
        className={`pt-avatar ${className}`}
        style={style}
        onError={() => setFailedSrc(src)}
      />
    );
  }

  const initial = name.trim().charAt(0).toUpperCase() || '?';
  return (
    <span
      className={`pt-avatar ${className}`}
      style={style}
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : alt}
      aria-hidden={decorative ? true : undefined}
    >
      {initial}
    </span>
  );
};

export default Avatar;
