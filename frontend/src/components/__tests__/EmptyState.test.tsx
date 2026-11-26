import { render, screen } from '@testing-library/react';
import EmptyState, { EmptyIllustration } from '../EmptyState';

describe('EmptyState', () => {
  it('shows the message, description and action', () => {
    render(
      <EmptyState
        message="Nothing here"
        description="Come back later"
        action={<button type="button">Browse videos</button>}
      />
    );

    expect(screen.getByText('Nothing here')).toBeInTheDocument();
    expect(screen.getByText('Come back later')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Browse videos' })).toBeInTheDocument();
    // The action has its own spaced, centred wrapper (not stuck to the text)
    expect(screen.getByRole('button', { name: 'Browse videos' }).parentElement).toHaveClass('pt-empty-action');
  });

  it('renders no action wrapper without an action', () => {
    const { container } = render(<EmptyState message="Nothing" />);
    expect(container.querySelector('.pt-empty-action')).toBeNull();
  });

  it.each(['videos', 'search', 'history', 'playlist', 'comments', 'people', 'chart'] as EmptyIllustration[])(
    'draws a decorative %s illustration',
    (kind) => {
      const { container } = render(<EmptyState message="Empty" illustration={kind} />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('data-illustration', kind);
      expect(svg).toHaveAttribute('aria-hidden', 'true');
      expect(screen.queryByRole('img')).not.toBeInTheDocument();
    }
  );
});
