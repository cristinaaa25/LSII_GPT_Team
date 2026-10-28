import React, { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import TagListEditor from '../TagListEditor';

const Harness: React.FC<{ initial?: string[]; maxItems?: number; onChange?: (v: string[]) => void }> = ({
  initial = [],
  maxItems = 3,
  onChange,
}) => {
  const [values, setValues] = useState(initial);
  return (
    <TagListEditor
      id="tags"
      label="Tags"
      values={values}
      maxItems={maxItems}
      maxLength={50}
      onChange={(v) => {
        setValues(v);
        onChange?.(v);
      }}
    />
  );
};

describe('TagListEditor', () => {
  it('shows the current values with a remove button each', () => {
    render(<Harness initial={['cats', 'funny']} />);

    expect(screen.getByText('cats')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove funny' })).toBeInTheDocument();
  });

  it('adds a trimmed value with the Add button and with Enter', () => {
    const onChange = jest.fn();
    render(<Harness onChange={onChange} />);
    const input = screen.getByLabelText('Tags');

    expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled();
    fireEvent.change(input, { target: { value: '  cats ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(onChange).toHaveBeenLastCalledWith(['cats']);
    expect(input).toHaveValue('');

    fireEvent.change(input, { target: { value: 'dogs' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).toHaveBeenLastCalledWith(['cats', 'dogs']);
  });

  it('removes a value', () => {
    const onChange = jest.fn();
    render(<Harness initial={['cats', 'dogs']} onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Remove cats' }));

    expect(onChange).toHaveBeenCalledWith(['dogs']);
    expect(screen.queryByText('cats')).not.toBeInTheDocument();
  });

  it('rejects case-insensitive duplicates', () => {
    const onChange = jest.fn();
    render(<Harness initial={['Cats']} onChange={onChange} />);

    fireEvent.change(screen.getByLabelText('Tags'), { target: { value: 'cats' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    expect(screen.getByText('"cats" is already in the list')).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('rejects values beyond the maximum count', () => {
    const onChange = jest.fn();
    render(<Harness initial={['a', 'b']} maxItems={2} onChange={onChange} />);

    fireEvent.change(screen.getByLabelText('Tags'), { target: { value: 'c' } });
    fireEvent.keyDown(screen.getByLabelText('Tags'), { key: 'Enter' });

    expect(screen.getByText('You can add at most 2 items')).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('ignores Enter on an empty input', () => {
    const onChange = jest.fn();
    render(<Harness onChange={onChange} />);

    fireEvent.keyDown(screen.getByLabelText('Tags'), { key: 'Enter' });
    fireEvent.keyDown(screen.getByLabelText('Tags'), { key: 'a' });

    expect(onChange).not.toHaveBeenCalled();
  });
});
