import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { CONNECT_URL } from '../constants';

import { ConnectRepositoryButton, getConfigureRepoTooltip } from './ConnectRepositoryButton';

const mockNavigate = jest.fn();

jest.mock('react-router-dom-v5-compat', () => ({
  ...jest.requireActual('react-router-dom-v5-compat'),
  useNavigate: () => mockNavigate,
}));

jest.mock('app/api/clients/provisioning/v0alpha1', () => ({
  useGetFrontendSettingsQuery: jest.fn(() => ({
    data: {
      availableRepositoryTypes: ['github', 'local'],
    },
  })),
}));

jest.mock('../utils/checkSyncSettings', () => ({
  checkSyncSettings: jest.fn(() => ({
    instanceConnected: false,
    folderConnected: false,
    repoCount: 0,
    maxReposReached: false,
  })),
}));

describe('getConfigureRepoTooltip', () => {
  it('returns empty string when configuration is allowed', () => {
    expect(
      getConfigureRepoTooltip({
        instanceConnected: false,
        maxReposReached: false,
        count: 0,
      })
    ).toBe('');
  });

  it('explains when the instance is fully managed', () => {
    expect(
      getConfigureRepoTooltip({
        instanceConnected: true,
        maxReposReached: false,
        count: 1,
      })
    ).toMatch(/fully managed/i);
  });

  it('explains when the free-tier connection limit is reached', () => {
    expect(
      getConfigureRepoTooltip({
        instanceConnected: false,
        maxReposReached: true,
        count: 1,
      })
    ).toMatch(/restricted to one connection/i);
  });
});

describe('ConnectRepositoryButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('navigates to the connect URL for the selected repository type', async () => {
    const user = userEvent.setup();
    render(<ConnectRepositoryButton />);

    await user.click(screen.getByRole('button', { name: /configure/i }));
    await user.click(await screen.findByRole('menuitem', { name: /github/i }));

    expect(mockNavigate).toHaveBeenCalledWith(`${CONNECT_URL}/github`);
  });

  it('navigates to the local connect URL when Local is selected', async () => {
    const user = userEvent.setup();
    render(<ConnectRepositoryButton />);

    await user.click(screen.getByRole('button', { name: /configure/i }));
    await user.click(await screen.findByRole('menuitem', { name: /local/i }));

    expect(mockNavigate).toHaveBeenCalledWith(`${CONNECT_URL}/local`);
  });
});
