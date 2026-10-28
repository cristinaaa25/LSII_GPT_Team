import { act, fireEvent, render, screen } from '@testing-library/react';
import VideoEditForm from '../VideoEditForm';
import { videoService } from '../../services/videoService';
import type { VideoDetail } from '../../types/video';

jest.mock('../../services/videoService', () => ({
  videoService: { updateVideo: jest.fn() },
}));

const mockedUpdate = videoService.updateVideo as jest.Mock;

const video: VideoDetail & { id: number } = {
  id: 42,
  title: 'Amazing Nature',
  description: 'Wildlife',
  tags: ['nature'],
  categories: ['Documentary'],
  author: 'alice',
  uploadDate: '2024-05-15T12:00:00Z',
  views: 10,
  likes: 1,
  commentCount: 0,
};

const renderForm = () => {
  const onSaved = jest.fn();
  const onCancel = jest.fn();
  render(<VideoEditForm video={video} onSaved={onSaved} onCancel={onCancel} />);
  return { onSaved, onCancel };
};

describe('VideoEditForm', () => {
  beforeEach(() => mockedUpdate.mockReset());

  it('is prefilled with the current metadata', () => {
    renderForm();

    expect(screen.getByLabelText('Title')).toHaveValue('Amazing Nature');
    expect(screen.getByLabelText('Description')).toHaveValue('Wildlife');
    expect(screen.getByText('nature')).toBeInTheDocument();
    expect(screen.getByText('Documentary')).toBeInTheDocument();
  });

  it('saves the edited metadata and reports the updated video', async () => {
    const updated = { ...video, title: 'Edited', tags: ['nature', 'birds'], categories: [] };
    mockedUpdate.mockResolvedValueOnce(updated);
    const { onSaved } = renderForm();

    fireEvent.change(screen.getByLabelText('Title'), { target: { value: '  Edited ' } });
    fireEvent.change(screen.getByLabelText('Tags'), { target: { value: 'birds' } });
    fireEvent.keyDown(screen.getByLabelText('Tags'), { key: 'Enter' });
    fireEvent.click(screen.getByRole('button', { name: 'Remove Documentary' }));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    });

    expect(mockedUpdate).toHaveBeenCalledWith(42, {
      title: 'Edited',
      description: 'Wildlife',
      tags: ['nature', 'birds'],
      categories: [],
    });
    expect(onSaved).toHaveBeenCalledWith(updated);
  });

  it('blocks saving with an empty title or description', async () => {
    renderForm();

    fireEvent.change(screen.getByLabelText('Title'), { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('Title is required')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'ok' } });
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('Description is required')).toBeInTheDocument();

    expect(mockedUpdate).not.toHaveBeenCalled();
  });

  it.each([
    [{ response: { status: 403 } }, 'You can only edit your own videos.'],
    [{ response: { status: 401 } }, 'Your session has expired. Please log in again.'],
    [{ response: { status: 400, data: { detail: 'Tags must not be blank' } } }, 'Tags must not be blank'],
    [new Error('Network Error'), 'Network Error'],
  ])('shows the server error %#', async (error, message) => {
    mockedUpdate.mockRejectedValueOnce(error);
    const { onSaved } = renderForm();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    });

    expect(screen.getByRole('alert')).toHaveTextContent(message);
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeEnabled();
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('disables the buttons while saving', async () => {
    mockedUpdate.mockReturnValueOnce(new Promise(() => {}));
    renderForm();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    });

    expect(screen.getByRole('button', { name: 'Saving...' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
  });

  it('calls onCancel', () => {
    const { onCancel } = renderForm();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onCancel).toHaveBeenCalled();
  });
});
