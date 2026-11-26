import React from 'react';

export type EmptyIllustration = 'videos' | 'search' | 'history' | 'playlist' | 'comments' | 'people' | 'chart';

interface Props {
  message: string;
  description?: string;
  illustration?: EmptyIllustration;
  /** Optional call to action (link or button). */
  action?: React.ReactNode;
}

const Screen: React.FC = () => (
  <>
    <rect className="pt-ill-soft" x="20" y="22" width="120" height="80" rx="14" />
    <rect className="pt-ill-primary" x="34" y="34" width="92" height="56" rx="10" opacity="0.9" />
  </>
);

/** Small decorative drawing for each kind of empty list; colours come from the theme tokens. */
const Illustration: React.FC<{ kind: EmptyIllustration }> = ({ kind }) => {
  let detail: React.ReactNode;
  switch (kind) {
    case 'search':
      detail = (
        <>
          <Screen />
          <circle cx="110" cy="84" r="18" className="pt-ill-soft" />
          <circle cx="110" cy="84" r="12" className="pt-ill-accent" opacity="0.35" />
          <rect className="pt-ill-accent" x="122" y="96" width="24" height="9" rx="4.5" transform="rotate(45 122 96)" />
        </>
      );
      break;
    case 'history':
      detail = (
        <>
          <Screen />
          <circle cx="80" cy="62" r="20" className="pt-ill-soft" />
          <path d="M80 50v13l9 6" fill="none" stroke="var(--pt-accent)" strokeWidth="5" strokeLinecap="round" />
        </>
      );
      break;
    case 'playlist':
      detail = (
        <>
          <rect className="pt-ill-soft" x="20" y="22" width="120" height="80" rx="14" />
          <rect className="pt-ill-primary" x="36" y="38" width="62" height="10" rx="5" />
          <rect className="pt-ill-primary" x="36" y="57" width="62" height="10" rx="5" opacity="0.7" />
          <rect className="pt-ill-primary" x="36" y="76" width="40" height="10" rx="5" opacity="0.5" />
          <path className="pt-ill-accent" d="M108 56v26l20-13z" />
        </>
      );
      break;
    case 'comments':
      detail = (
        <>
          <rect className="pt-ill-primary" x="24" y="26" width="80" height="50" rx="14" />
          <path className="pt-ill-primary" d="M40 74l-6 18 22-16z" />
          <rect className="pt-ill-soft" x="62" y="52" width="76" height="46" rx="14" />
          <circle className="pt-ill-accent" cx="84" cy="75" r="4" />
          <circle className="pt-ill-accent" cx="100" cy="75" r="4" />
          <circle className="pt-ill-accent" cx="116" cy="75" r="4" />
        </>
      );
      break;
    case 'people':
      detail = (
        <>
          <rect className="pt-ill-soft" x="20" y="22" width="120" height="80" rx="14" />
          <circle className="pt-ill-primary" cx="62" cy="54" r="14" />
          <path className="pt-ill-primary" d="M38 92c2-14 12-22 24-22s22 8 24 22z" />
          <circle className="pt-ill-accent" cx="106" cy="58" r="11" />
          <path className="pt-ill-accent" d="M88 92c2-11 9-17 18-17s16 6 18 17z" />
        </>
      );
      break;
    case 'chart':
      detail = (
        <>
          <rect className="pt-ill-soft" x="20" y="22" width="120" height="80" rx="14" />
          <rect className="pt-ill-primary" x="40" y="66" width="16" height="22" rx="4" />
          <rect className="pt-ill-primary" x="64" y="52" width="16" height="36" rx="4" opacity="0.8" />
          <rect className="pt-ill-primary" x="88" y="40" width="16" height="48" rx="4" opacity="0.6" />
          <circle className="pt-ill-accent" cx="120" cy="38" r="7" />
        </>
      );
      break;
    default:
      detail = (
        <>
          <Screen />
          <path className="pt-ill-accent" d="M72 48v28l24-14z" />
        </>
      );
  }

  return (
    <svg viewBox="0 0 160 124" aria-hidden="true" focusable="false" data-illustration={kind}>
      {detail}
    </svg>
  );
};

/** Friendly "nothing here yet" block with an illustration, used by every list. */
const EmptyState: React.FC<Props> = ({ message, description, illustration = 'videos', action }) => (
  <div className="pt-empty">
    <Illustration kind={illustration} />
    <p className="fs-5 fw-semibold mb-1">{message}</p>
    {description && <p className="text-body-secondary mb-3">{description}</p>}
    {action && <div className="pt-empty-action">{action}</div>}
  </div>
);

export default EmptyState;
