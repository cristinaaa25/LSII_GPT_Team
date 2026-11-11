import { render, screen } from '@testing-library/react';
import GoogleLoginButton from '../GoogleLoginButton';

describe('GoogleLoginButton', () => {
  it('links to the backend Google authorization endpoint', () => {
    render(<GoogleLoginButton />);

    // API_DOMAIN comes from the global Env mock in jest.setup.ts
    expect(screen.getByRole('link', { name: /Continue with Google/i })).toHaveAttribute(
      'href',
      'http://api.test/oauth2/authorization/google'
    );
  });
});
