import { render, screen } from '@testing-library/react';
import axios from 'axios';
import App from '../../App';

jest.mock('axios', () => ({ __esModule: true, default: { get: jest.fn() } }));

describe('App', () => {
  it('renders the logo and the video catalog on the home page', async () => {
    (axios.get as jest.Mock).mockResolvedValueOnce({
      data: { content: [], page: 0, size: 12, totalElements: 0, totalPages: 0, last: true },
    });

    render(<App />);

    expect(screen.getByRole('img', { name: 'ProTube logo' })).toBeInTheDocument();
    expect(await screen.findByText('No videos available yet.')).toBeInTheDocument();
  });
});
