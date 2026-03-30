import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { getDashboardModel } from '../../../../../test/helpers/getDashboardModel';
import { DashboardModel } from '../../state/DashboardModel';
import { PanelModel } from '../../state/PanelModel';

import { DashNavTimeControls } from './DashNavTimeControls';

describe('DashNavTimeControls', () => {
  let dashboardModel: DashboardModel;

  beforeEach(() => {
    const json = {
      panels: [
        {
          datasource: null,
          gridPos: {
            h: 3,
            w: 24,
            x: 0,
            y: 8,
          },
          id: 1,
          type: 'welcome',
        },
      ],
      refresh: '',
      templating: {
        list: [],
      },
    };
    dashboardModel = getDashboardModel(json);
  });

  it('renders RefreshPicker with run button in panel view', () => {
    const container = render(
      <DashNavTimeControls dashboard={dashboardModel} onChangeTimeZone={jest.fn()} key="time-controls" />
    );
    expect(container.queryByLabelText(/Refresh dashboard/i)).toBeInTheDocument();
  });

  it('renders RefreshPicker with interval button in panel view', () => {
    const container = render(
      <DashNavTimeControls dashboard={dashboardModel} onChangeTimeZone={jest.fn()} key="time-controls" />
    );
    expect(container.queryByLabelText(/Choose refresh time interval/i)).toBeInTheDocument();
  });

  it('should not render RefreshPicker interval button in panel edit', () => {
    const panel: PanelModel = new PanelModel({ destroy: jest.fn(), isEditing: true });
    dashboardModel.startRefresh = jest.fn();
    dashboardModel.panelInEdit = panel;
    const container = render(
      <DashNavTimeControls dashboard={dashboardModel} onChangeTimeZone={jest.fn()} key="time-controls" />
    );
    expect(container.queryByLabelText(/Choose refresh time interval/i)).not.toBeInTheDocument();
  });

  it('should render RefreshPicker run button in panel edit', () => {
    const panel: PanelModel = new PanelModel({ destroy: jest.fn(), isEditing: true });
    dashboardModel.startRefresh = jest.fn();
    dashboardModel.panelInEdit = panel;
    const container = render(
      <DashNavTimeControls dashboard={dashboardModel} onChangeTimeZone={jest.fn()} key="time-controls" />
    );
    expect(container.queryByLabelText(/Refresh dashboard/i)).toBeInTheDocument();
  });

  it('shows a Sync button for the home dashboard only', () => {
    dashboardModel.meta.isHomeDashboard = true;

    render(<DashNavTimeControls dashboard={dashboardModel} onChangeTimeZone={jest.fn()} key="time-controls" />);

    expect(screen.getByRole('button', { name: 'Sync' })).toBeInTheDocument();
  });

  it('does not show a Sync button for non-home dashboards', () => {
    render(<DashNavTimeControls dashboard={dashboardModel} onChangeTimeZone={jest.fn()} key="time-controls" />);

    expect(screen.queryByRole('button', { name: 'Sync' })).not.toBeInTheDocument();
  });

  it('clicking Sync triggers the same refresh path as the refresh picker', async () => {
    dashboardModel.meta.isHomeDashboard = true;
    const refreshSpy = jest.spyOn(DashNavTimeControls.prototype as unknown as { onRefreshClick: () => void }, 'onRefreshClick');

    render(<DashNavTimeControls dashboard={dashboardModel} onChangeTimeZone={jest.fn()} key="time-controls" />);

    await userEvent.click(screen.getByRole('button', { name: 'Sync' }));

    expect(refreshSpy).toHaveBeenCalledTimes(1);
  });
});
