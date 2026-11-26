import { act, fireEvent, render, screen } from '@testing-library/react';
import { ToastProvider } from '../ToastProvider';
import { useToast } from '../../hooks/useToast';
import type { ToastVariant } from '../ToastContext';

const Trigger = ({ message, variant }: { message: string; variant?: ToastVariant }) => {
  const { showToast } = useToast();
  return (
    <button type="button" onClick={() => showToast(message, variant)}>
      Notify {message}
    </button>
  );
};

describe('ToastProvider', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('shows a success toast as a polite status message and hides it after the duration', () => {
    render(
      <ToastProvider duration={3000}>
        <Trigger message="Saved" />
      </ToastProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Notify Saved' }));
    expect(screen.getByRole('status')).toHaveTextContent('Saved');

    act(() => jest.advanceTimersByTime(3000));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('announces error toasts as alerts', () => {
    render(
      <ToastProvider>
        <Trigger message="Oops" variant="error" />
      </ToastProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Notify Oops' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Oops');
  });

  it('can be closed by the user and stacks several toasts', () => {
    render(
      <ToastProvider>
        <Trigger message="One" />
        <Trigger message="Two" variant="info" />
      </ToastProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Notify One' }));
    fireEvent.click(screen.getByRole('button', { name: 'Notify Two' }));
    expect(screen.getAllByRole('status')).toHaveLength(2);

    fireEvent.click(screen.getAllByRole('button', { name: 'Close notification' })[0]);
    expect(screen.getAllByRole('status')).toHaveLength(1);
    expect(screen.getByRole('status')).toHaveTextContent('Two');
  });

  it('throws a clear error when used outside the provider', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Trigger message="x" />)).toThrow('useToast must be used within a ToastProvider');
  });
});
