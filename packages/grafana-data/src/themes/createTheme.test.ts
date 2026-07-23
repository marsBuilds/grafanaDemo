import { createTheme } from './createTheme';
import { getBuiltInThemes, getThemeById } from './registry';

describe('createTheme', () => {
  it('create custom theme', () => {
    const custom = createTheme({
      colors: {
        mode: 'dark',
        primary: {
          main: 'rgb(240,0,0)',
        },
        background: {
          canvas: '#123',
        },
      },
    });

    expect(custom.colors.primary.main).toBe('rgb(240,0,0)');
    expect(custom.colors.primary.shade).toBe('rgb(242, 38, 38)');
    expect(custom.colors.background.canvas).toBe('#123');
  });

  it('create default theme', () => {
    const theme = createTheme();
    expect(theme.colors.mode).toBe('dark');
  });

  it('creates the orange built-in theme', () => {
    const orange = getThemeById('orange');

    expect(orange.name).toBe('Orange');
    expect(orange.colors.mode).toBe('dark');
    expect(orange.colors.primary.main).toBe('#FF8833');
    expect(getBuiltInThemes(['orange']).some((theme) => theme.id === 'orange')).toBe(true);
  });
});
