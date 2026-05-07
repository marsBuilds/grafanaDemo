import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from 'test/test-utils';

import { GrafanaTheme2 } from '@grafana/data';

import * as themeService from 'app/core/services/theme';

import { ThemeModeToggle } from './ThemeModeToggle';

const mockUseTheme2 = jest.fn();

jest.mock('@grafana/ui', () => ({
  ...jest.requireActual('@grafana/ui'),
  useTheme2: () => mockUseTheme2(),
}));

jest.mock('app/core/services/theme', () => ({
  toggleTheme: jest.fn(),
}));

describe('ThemeModeToggle', () => {
  beforeEach(() => {
    mockUseTheme2.mockReturnValue({ isDark: true } as GrafanaTheme2);
  });

  it('toggles from dark to light when clicked in dark mode', async () => {
    const user = userEvent.setup();
    render(<ThemeModeToggle />);

    await user.click(screen.getByRole('button', { name: /switch to light mode/i }));
    expect(themeService.toggleTheme).toHaveBeenCalledWith(false);
  });

  it('toggles from light to dark when clicked in light mode', async () => {
    mockUseTheme2.mockReturnValue({ isDark: false } as GrafanaTheme2);
    const user = userEvent.setup();
    render(<ThemeModeToggle />);

    await user.click(screen.getByRole('button', { name: /switch to dark mode/i }));
    expect(themeService.toggleTheme).toHaveBeenCalledWith(false);
  });
});
