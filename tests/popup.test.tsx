import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PopupApp } from '../src/popup/PopupApp';
import type { PopupState } from '../src/lib/types';

const baseState: PopupState = {
  tabId: 12,
  isSupported: true,
  session: {
    tabId: 12,
    autoDetect: false,
    detectionEnabled: false,
    status: 'idle',
    lastError: null,
    captions: {
      cues: [
        { id: '1-2-hello', start: 1, end: 2, text: 'hello' },
        { id: '2-3-world', start: 2, end: 3, text: 'world' }
      ],
      cueMap: {},
      previewText: 'hello',
      lastUpdatedAt: 1
    }
  }
};

describe('PopupApp', () => {
  it('renders accumulated subtitles and action buttons', () => {
    render(
      <PopupApp
        state={baseState}
        onStart={vi.fn()}
        onStop={vi.fn()}
        onToggleAutoDetect={vi.fn()}
        onClearCaptions={vi.fn()}
        onCopyAll={vi.fn()}
        onDownload={vi.fn()}
        onRefresh={vi.fn()}
      />
    );

    expect(screen.getByText('hello')).toBeInTheDocument();
    expect(screen.getByText('00:00:01.000')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Download VTT' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clear Captions' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy All Captions' })).toBeInTheDocument();
    expect(screen.getByText('Live Buffer')).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Auto detect subtitles' })).toBeInTheDocument();
    expect(screen.queryByText('VTT Collector')).not.toBeInTheDocument();
    expect(screen.queryByText(/Capture subtitle prefetches early/i)).not.toBeInTheDocument();
  });

  it('calls clear handler for the selected track', async () => {
    const user = userEvent.setup();
    const onClearCaptions = vi.fn();

    render(
      <PopupApp
        state={baseState}
        onStart={vi.fn()}
        onStop={vi.fn()}
        onToggleAutoDetect={vi.fn()}
        onClearCaptions={onClearCaptions}
        onCopyAll={vi.fn()}
        onDownload={vi.fn()}
        onRefresh={vi.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Clear Captions' }));
    expect(onClearCaptions).toHaveBeenCalled();
  });

  it('shows a manual refresh affordance for stale popup state', () => {
    render(
      <PopupApp
        state={baseState}
        onStart={vi.fn()}
        onStop={vi.fn()}
        onToggleAutoDetect={vi.fn()}
        onClearCaptions={vi.fn()}
        onCopyAll={vi.fn()}
        onDownload={vi.fn()}
        onRefresh={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: 'Refresh' })).toBeInTheDocument();
  });

  it('calls copy handler for accumulated captions', async () => {
    const user = userEvent.setup();
    const onCopyAll = vi.fn();

    render(
      <PopupApp
        state={baseState}
        onStart={vi.fn()}
        onStop={vi.fn()}
        onToggleAutoDetect={vi.fn()}
        onClearCaptions={vi.fn()}
        onCopyAll={onCopyAll}
        onDownload={vi.fn()}
        onRefresh={vi.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Copy All Captions' }));
    expect(onCopyAll).toHaveBeenCalled();
  });
});
