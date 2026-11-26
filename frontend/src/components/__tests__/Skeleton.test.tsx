import { render, screen } from '@testing-library/react';
import Skeleton from '../Skeleton';

describe('Skeleton', () => {
  it.each(['cards', 'list', 'comments', 'detail', 'block'] as const)(
    'renders the %s variant as a busy status announced with its label',
    (variant) => {
      render(<Skeleton label="Loading things" variant={variant} count={2} />);

      const status = screen.getByRole('status', { name: 'Loading things' });
      expect(status).toHaveAttribute('aria-busy', 'true');
      expect(status).toHaveTextContent('Loading things');
      expect(status.querySelectorAll('.pt-skeleton').length).toBeGreaterThan(0);
    }
  );

  it('renders one placeholder card per item', () => {
    const { container } = render(<Skeleton label="Loading videos..." variant="cards" count={3} />);
    expect(container.querySelectorAll('.card')).toHaveLength(3);
  });

  it('hides the placeholder shapes from screen readers', () => {
    const { container } = render(<Skeleton label="Loading" />);
    expect(container.querySelector('[aria-hidden="true"]')).toBeInTheDocument();
  });
});
