import React from 'react';

interface Props {
  /** Text announced to screen readers while loading, e.g. "Loading videos...". */
  label: string;
  variant?: 'cards' | 'list' | 'comments' | 'detail' | 'block';
  /** Number of placeholder items. */
  count?: number;
}

const Line: React.FC<{ width: string; height?: string }> = ({ width, height }) => (
  <span className="pt-skeleton pt-skeleton-line" style={{ width, height }} />
);

/** Grey placeholders shaped like the content that is loading (instead of a "Loading..." text). */
const Skeleton: React.FC<Props> = ({ label, variant = 'block', count = 4 }) => {
  const items = Array.from({ length: count }, (_, index) => index);

  let body: React.ReactNode;
  if (variant === 'cards') {
    body = (
      <div className="row row-cols-1 row-cols-sm-2 row-cols-md-3 row-cols-xl-4 g-4">
        {items.map((i) => (
          <div className="col" key={i}>
            <div className="card h-100 pt-card shadow-sm">
              <span className="pt-skeleton ratio ratio-16x9 rounded-0" />
              <div className="card-body">
                <Line width="85%" height="1rem" />
                <Line width="50%" />
                <Line width="35%" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  } else if (variant === 'list') {
    body = (
      <div className="d-flex flex-column gap-3">
        {items.map((i) => (
          <div className="d-flex gap-3 align-items-center" key={i}>
            <span className="pt-skeleton" style={{ width: 160, maxWidth: '40%', height: 90, flexShrink: 0 }} />
            <div className="flex-grow-1">
              <Line width="70%" height="1rem" />
              <Line width="40%" />
            </div>
          </div>
        ))}
      </div>
    );
  } else if (variant === 'comments') {
    body = (
      <div className="d-flex flex-column gap-3">
        {items.map((i) => (
          <div className="d-flex gap-3" key={i}>
            <span className="pt-skeleton pt-skeleton-circle" style={{ width: 36, height: 36 }} />
            <div className="flex-grow-1">
              <Line width="25%" />
              <Line width="90%" />
              <Line width="60%" />
            </div>
          </div>
        ))}
      </div>
    );
  } else if (variant === 'detail') {
    body = (
      <div>
        <span className="pt-skeleton ratio ratio-16x9 mb-3" />
        <Line width="60%" height="1.5rem" />
        <Line width="30%" />
        <Line width="90%" />
        <Line width="80%" />
      </div>
    );
  } else {
    body = (
      <div>
        {items.map((i) => (
          <Line key={i} width={`${Math.max(30, 90 - i * 10)}%`} />
        ))}
      </div>
    );
  }

  return (
    <div role="status" aria-label={label} aria-busy="true" className="py-2" data-testid="skeleton">
      <span className="visually-hidden">{label}</span>
      <div aria-hidden="true">{body}</div>
    </div>
  );
};

export default Skeleton;
