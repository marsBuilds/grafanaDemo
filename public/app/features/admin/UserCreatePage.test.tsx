import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import UserCreatePage from './UserCreatePage';

const mockNavigate = jest.fn();
const mockPost = jest.fn();

jest.mock('react-router-dom-v5-compat', () => ({
  ...jest.requireActual('react-router-dom-v5-compat'),
  useNavigate: () => mockNavigate,
}));

jest.mock('@grafana/runtime', () => ({
  ...jest.requireActual('@grafana/runtime'),
  getBackendSrv: () => ({
    post: mockPost,
  }),
}));

jest.mock('app/core/components/Page/Page', () => {
  const Page = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
  Page.Contents = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
  return { Page };
});

const fillAndSubmit = async ({
  name,
  email,
  username,
  password,
}: {
  name?: string;
  email?: string;
  username?: string;
  password?: string;
}) => {
  const user = userEvent.setup();

  if (name) {
    await user.type(screen.getByLabelText(/^Name/i), name);
  }
  if (email) {
    await user.type(screen.getByLabelText(/^Email/i), email);
  }
  if (username) {
    await user.type(screen.getByLabelText(/^Username/i), username);
  }
  if (password) {
    await user.type(screen.getByLabelText(/^Password/i), password);
  }

  await user.click(screen.getByRole('button', { name: /create user/i }));
  return user;
};

describe('UserCreatePage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPost.mockResolvedValue({ uid: 'user-123' });
  });

  it('renders the create user form', () => {
    render(<UserCreatePage />);

    expect(screen.getByLabelText(/^Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create user/i })).toBeInTheDocument();
  });

  it('shows validation errors when required fields are empty', async () => {
    render(<UserCreatePage />);

    await userEvent.click(screen.getByRole('button', { name: /create user/i }));

    expect(await screen.findByText(/Name is required/i)).toBeInTheDocument();
    expect(
      await screen.findByText(/Password is required and must contain at least 4 characters/i)
    ).toBeInTheDocument();
    expect(mockPost).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('rejects passwords shorter than 4 characters', async () => {
    render(<UserCreatePage />);

    await fillAndSubmit({ name: 'Ada Lovelace', password: 'abc' });

    expect(
      await screen.findByText(/Password is required and must contain at least 4 characters/i)
    ).toBeInTheDocument();
    expect(mockPost).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('creates a user and navigates to the edit page on success', async () => {
    render(<UserCreatePage />);

    await fillAndSubmit({
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      username: 'ada',
      password: 'secure-pass',
    });

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith('/api/admin/users', {
        name: 'Ada Lovelace',
        email: 'ada@example.com',
        login: 'ada',
        password: 'secure-pass',
      });
    });

    expect(mockNavigate).toHaveBeenCalledWith('/admin/users/edit/user-123');
  });
});
