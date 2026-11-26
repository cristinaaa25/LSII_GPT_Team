import { render } from '@testing-library/react';
import Icon, { IconName } from '../Icon';

describe('Icon', () => {
  const names: IconName[] = [
    'plus',
    'trash',
    'thumbs-up',
    'bookmark',
    'upload',
    'check',
    'reply',
    'pencil',
    'refresh',
    'arrow-left',
    'open',
  ];

  it.each(names)('draws the decorative %s icon with the current text colour', (name) => {
    const { container } = render(<Icon name={name} size={16} className="extra" />);
    const svg = container.querySelector('svg')!;
    expect(svg).toHaveAttribute('data-icon', name);
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveAttribute('stroke', 'currentColor');
    expect(svg).toHaveAttribute('width', '16');
    expect(svg).toHaveClass('extra');
    expect(svg.childNodes.length).toBeGreaterThan(0);
  });

  it('is an outline by default and solid with filled', () => {
    const { container, rerender } = render(<Icon name="bookmark" />);
    expect(container.querySelector('svg')).toHaveAttribute('fill', 'none');
    expect(container.querySelector('svg')).not.toHaveAttribute('data-filled');

    rerender(<Icon name="bookmark" filled />);
    expect(container.querySelector('svg')).toHaveAttribute('fill', 'currentColor');
    expect(container.querySelector('svg')).toHaveAttribute('data-filled', 'true');
  });
});
