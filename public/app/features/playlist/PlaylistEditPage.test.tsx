import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { of } from 'rxjs';
import { TestProvider } from 'test/helpers/TestProvider';

import { config, locationService } from '@grafana/runtime';
import { backendSrv } from 'app/core/services/backend_srv';

import { createFetchResponse } from '../../../test/helpers/createFetchResponse';

const mockNavigate = jest.fn();
jest.mock('react-router-dom-v5-compat', () => ({
  ...jest.requireActual('react-router-dom-v5-compat'),
  useNavigate: () => mockNavigate,
}));

import { PlaylistEditPage } from './PlaylistEditPage';

jest.mock('@grafana/runtime', () => ({
  ...jest.requireActual('@grafana/runtime'),
  getBackendSrv: () => backendSrv,
}));

jest.mock('app/core/components/TagFilter/TagFilter', () => ({
  TagFilter: () => {
    return <>mocked-tag-filter</>;
  },
}));

async function getTestContext() {
  jest.clearAllMocks();
  mockNavigate.mockClear();

  const backendSrvMock = jest.spyOn(backendSrv, 'fetch').mockImplementation(() =>
    of(
      createFetchResponse({
        spec: {
          title: 'Test Playlist',
          interval: '5s',
          items: [{ title: 'First item', type: 'dashboard_by_uid', order: 1, value: '1' }],
        },
        metadata: {
          name: 'foo',
        },
      })
    )
  );

  const { rerender } = render(
    <TestProvider>
      <PlaylistEditPage />
    </TestProvider>
  );
  await waitFor(() => expect(backendSrvMock).toHaveBeenCalledTimes(1));

  return { rerender, backendSrvMock };
}

describe('PlaylistEditPage', () => {
  beforeEach(async () => {
    config.featureToggles.playlistUseNavigate = false;
    await act(async () => {
      locationService.replace('/');
    });
  });

  afterEach(async () => {
    config.featureToggles.playlistUseNavigate = false;
    await act(async () => {
      locationService.replace('/');
    });
  });

  describe('when mounted', () => {
    it('then it should load playlist and header should be correct', async () => {
      await getTestContext();

      expect(await screen.findByRole('heading', { name: /edit playlist/i })).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: /playlist name/i })).toHaveValue('Test Playlist');
      expect(screen.getByRole('textbox', { name: /playlist interval/i })).toHaveValue('5s');
      expect(screen.getAllByRole('row')).toHaveLength(1);
    });
  });

  describe('when submitted', () => {
    describe('when playlistUseNavigate is disabled', () => {
      it('then correct api should be called and locationService navigates', async () => {
        const { backendSrvMock } = await getTestContext();

        expect(await screen.findByRole('heading', { name: /edit playlist/i })).toBeInTheDocument();
        expect(locationService.getLocation().pathname).toEqual('/');
        await userEvent.clear(await screen.findByRole('textbox', { name: /playlist name/i }));
        await userEvent.type(screen.getByRole('textbox', { name: /playlist name/i }), 'A Name');
        await userEvent.clear(await screen.findByRole('textbox', { name: /playlist interval/i }));
        await userEvent.type(screen.getByRole('textbox', { name: /playlist interval/i }), '10s');
        fireEvent.submit(screen.getByRole('button', { name: /save/i }));
        await waitFor(() =>
          expect(backendSrvMock).toHaveBeenCalledWith(
            expect.objectContaining({
              body: expect.objectContaining({
                spec: {
                  title: 'A Name',
                  interval: '10s',
                  items: [{ title: 'First item', type: 'dashboard_by_uid', order: 1, value: '1' }],
                },
                metadata: {
                  name: 'foo',
                },
              }),
              method: 'PUT',
            })
          )
        );
        expect(locationService.getLocation().pathname).toEqual('/playlists');
        expect(mockNavigate).not.toHaveBeenCalled();
      });
    });

    describe('when playlistUseNavigate is enabled', () => {
      beforeEach(() => {
        config.featureToggles.playlistUseNavigate = true;
      });

      it('then correct api should be called and navigate is used', async () => {
        const { backendSrvMock } = await getTestContext();

        expect(await screen.findByRole('heading', { name: /edit playlist/i })).toBeInTheDocument();
        expect(locationService.getLocation().pathname).toEqual('/');
        await userEvent.clear(await screen.findByRole('textbox', { name: /playlist name/i }));
        await userEvent.type(screen.getByRole('textbox', { name: /playlist name/i }), 'A Name');
        await userEvent.clear(await screen.findByRole('textbox', { name: /playlist interval/i }));
        await userEvent.type(screen.getByRole('textbox', { name: /playlist interval/i }), '10s');
        fireEvent.submit(screen.getByRole('button', { name: /save/i }));
        await waitFor(() =>
          expect(backendSrvMock).toHaveBeenCalledWith(
            expect.objectContaining({
              body: expect.objectContaining({
                spec: {
                  title: 'A Name',
                  interval: '10s',
                  items: [{ title: 'First item', type: 'dashboard_by_uid', order: 1, value: '1' }],
                },
                metadata: {
                  name: 'foo',
                },
              }),
              method: 'PUT',
            })
          )
        );
        expect(mockNavigate).toHaveBeenCalledWith('/playlists');
        expect(locationService.getLocation().pathname).toEqual('/');
      });
    });
  });
});
