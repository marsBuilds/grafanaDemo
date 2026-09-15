import React from 'react';

import { t } from '@grafana/i18n';
import { ToolbarButton } from '@grafana/ui';

interface ToolbarItemButtonProps {
  isOpen: boolean;
  title?: string;
  onClick?: () => void;
  pluginId?: string;
  compact?: boolean;
}

function getPluginIcon(pluginId?: string): string {
  switch (pluginId) {
    // The docs plugin ID is transitioning from grafana-grafanadocsplugin-app to grafana-pathfinder-app.
    // Support both until that migration is complete.
    case 'grafana-grafanadocsplugin-app':
    case 'grafana-pathfinder-app':
      return 'book';
    case 'grafana-grotfood-app':
      return 'gf-grotfood';
    default:
      return 'ai-sparkle';
  }
}

function ExtensionToolbarItemButtonComponent(
  { isOpen, title, onClick, pluginId, compact }: ToolbarItemButtonProps,
  ref: React.ForwardedRef<HTMLButtonElement>
) {
  const icon = getPluginIcon(pluginId);
  const isAssistant = pluginId === 'grafana-assistant-app';
  const label =
    !compact && isAssistant ? t('navigation.extension-sidebar.ask-grafana-label', 'Ask Grafana') : undefined;
  const tooltip = (() => {
    if (isAssistant) {
      return isOpen
        ? t('navigation.extension-sidebar.button-tooltip.close-ask-grafana', 'Close Ask Grafana')
        : t('navigation.extension-sidebar.button-tooltip.open-ask-grafana', 'Open Ask Grafana');
    }
    if (isOpen) {
      return t('navigation.extension-sidebar.button-tooltip.close', 'Close {{title}}', { title });
    }
    if (title) {
      return t('navigation.extension-sidebar.button-tooltip.open', 'Open {{title}}', { title });
    }
    return t('navigation.extension-sidebar.button-tooltip.open-all', 'Open AI assistants and sidebar apps');
  })();

  return (
    <ToolbarButton
      ref={ref}
      icon={icon}
      iconOnly={!label}
      data-testid={`extension-toolbar-button-${isOpen ? 'close' : 'open'}`}
      variant={isOpen ? 'active' : 'default'}
      aria-expanded={isOpen}
      onClick={onClick}
      tooltip={tooltip}
    >
      {label}
    </ToolbarButton>
  );
}

// Wrapped the component with React.forwardRef to enable ref forwarding, which is required
// for proper integration with the Dropdown component from @grafana/ui
export const ExtensionToolbarItemButton = React.forwardRef<HTMLButtonElement, ToolbarItemButtonProps>(
  ExtensionToolbarItemButtonComponent
);
