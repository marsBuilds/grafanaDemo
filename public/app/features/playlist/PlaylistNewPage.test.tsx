import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { of } from 'rxjs';
import { TestProvider } from 'test/helpers/TestProvider';

import { selectors } from '@grafana/e2e-selectors';
import { config, locationService } from '@grafana/runtime';

import { createFetchResponse } from '../../../test/helpers/createFetchResponse';
import { backendSrv } from '../../core/services/backend_srv';

import { PlaylistNewPage } from './PlaylistNewPage';

const mockNavigate = jest.fn();
jest.mock('react-router-dom-v5-compat', () => ({
  ...jest.requireActual('react-router-dom-v5-compat'),
  useNavigate: () => mockNavigate,
}));

jest.mock('@grafana/runtime', () => ({
  ...jest.requireActual('@grafana/runtime'),
  getBackendSrv: () => backendSrv,
}));

jest.mock('app/core/components/TagFilter/TagFilter', () => ({
  TagFilter: () => {
    return <>mocked-tag-filter</>;
  },
}));

function getTestContext() {
  jest.clearAllMocks();
  mockNavigate.mockClear();

  const postSpy = jest.fn();
  const otherSpy = jest.fn();

  const backendSrvMock = jest.spyOn(backendSrv, 'fetch').mockImplementation((options) => {
    if (options.method === 'POST') {
      postSpy(options);
      return of(createFetchResponse({}));
    }
    otherSpy(options);
    return of(createFetchResponse({ items: [] }));
  });

  jest.spyOn(backendSrv, 'search').mockResolvedValue([]);

  const { rerender } = render(
    <TestProvider>
      <PlaylistNewPage />
    </TestProvider>
  );

  return { rerender, backendSrvMock, postSpy, otherSpy };
}

async function submitPlaylistForm(postSpy: jest.Mock) {
  await userEvent.type(screen.getByRole('textbox', { name: selectors.pages.PlaylistForm.name }), 'A new name');
  fireEvent.submit(screen.getByRole('button', { name: /save/i }));
  await waitFor(() => expect(postSpy).toHaveBeenCalledTimes(1));
}

describe('PlaylistNewPage', () => {
  beforeEach(() => {
    config.featureToggles.playlistUseNavigate = false;
  });

  afterEach(() => {
    config.featureToggles.playlistUseNavigate = false;
  });

  describe('when mounted', () => {
    it('then header should be correct', async () => {
      getTestContext();

      expect(await screen.findByRole('heading', { name: /new playlist/i })).toBeInTheDocument();
    });
  });

  describe('when submitted', () => {
    it('then correct api should be called', async () => {
      const { postSpy } = getTestContext();

      expect(locationService.getLocation().pathname).toEqual('/');

      await submitPlaylistForm(postSpy);

      expect(postSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          body: expect.objectContaining({
            spec: {
              title: 'A new name',
              interval: '5m',
              items: [],
            },
          }),
        })
      );
      await waitFor(() => {
        expect(locationService.getLocation().pathname).toEqual('/playlists');
      });
    });

    describe('when feature flag is disabled', () => {
      it('should use locationService.push', async () => {
        const { postSpy } = getTestContext();

        await submitPlaylistForm(postSpy);

        await waitFor(() => {
          expect(locationService.getLocation().pathname).toEqual('/playlists');
        });
        expect(mockNavigate).not.toHaveBeenCalled();
      });
    });

    describe('when feature flag is enabled', () => {
      beforeEach(() => {
        config.featureToggles.playlistUseNavigate = true;
      });

      it('should use navigate', async () => {
        const { postSpy } = getTestContext();

        await submitPlaylistForm(postSpy);

        await waitFor(() => {
          expect(mockNavigate).toHaveBeenCalledWith('/playlists');
        });
      });
    });
  });
});
