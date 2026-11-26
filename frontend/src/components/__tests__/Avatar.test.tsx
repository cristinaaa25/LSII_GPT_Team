import { fireEvent, render, screen } from '@testing-library/react';
import Avatar from '../Avatar';

describe('Avatar', () => {
  it('shows the picture with the name as alt text', () => {
    render(<Avatar src="http://x/a.png" name="alice" />);
    expect(screen.getByRole('img', { name: 'alice' })).toHaveAttribute('src', 'http://x/a.png');
  });

  it('shows the initial in upper case when there is no picture', () => {
    render(<Avatar name="bob" />);
    expect(screen.getByRole('img', { name: 'bob' })).toHaveTextContent('B');
  });

  it('falls back to the initial when the picture fails to load', () => {
    render(<Avatar src="http://x/broken.png" name="carol" />);
    fireEvent.error(screen.getByRole('img', { name: 'carol' }));
    expect(screen.getByRole('img', { name: 'carol' })).toHaveTextContent('C');
  });

  it('is hidden from assistive tech when alt is empty', () => {
    const { container } = render(<Avatar name="dave" alt="" />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true');
  });

  it('uses a question mark for an empty name', () => {
    render(<Avatar name="  " alt="Unknown user" />);
    expect(screen.getByRole('img', { name: 'Unknown user' })).toHaveTextContent('?');
  });
});
