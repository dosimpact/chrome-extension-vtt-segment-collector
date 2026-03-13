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
    pageUrl: 'https://example.com/watch/1',
    pageTitle: 'Example video',
    autoDetect: false,
    autoSaveLibrary: true,
    detectionEnabled: false,
    hydratedLibraryUrl: 'https://example.com/watch/1',
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
  },
  library: [
    {
      pageUrl: 'https://example.com/watch/1',
      title: 'Example video',
      captions: {
        cues: [
          { id: '1-2-hello', start: 1, end: 2, text: 'hello' },
          { id: '2-3-world', start: 2, end: 3, text: 'world' }
        ],
        cueMap: { '1-2-hello': true, '2-3-world': true },
        previewText: 'hello',
        lastUpdatedAt: 1
      },
      updatedAt: 1
    }
  ]
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
        onDownloadLibrary={vi.fn()}
        onDeleteLibraryEntry={vi.fn()}
        onToggleAutoSaveLibrary={vi.fn()}
        onRefresh={vi.fn()}
      />
    );

    expect(screen.getByText('hello')).toBeInTheDocument();
    expect(screen.getByText('00:00:01')).toBeInTheDocument();
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
        onDownloadLibrary={vi.fn()}
        onDeleteLibraryEntry={vi.fn()}
        onToggleAutoSaveLibrary={vi.fn()}
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
        onDownloadLibrary={vi.fn()}
        onDeleteLibraryEntry={vi.fn()}
        onToggleAutoSaveLibrary={vi.fn()}
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
        onDownloadLibrary={vi.fn()}
        onDeleteLibraryEntry={vi.fn()}
        onToggleAutoSaveLibrary={vi.fn()}
        onRefresh={vi.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Copy All Captions' }));
    expect(onCopyAll).toHaveBeenCalled();
  });

  it('shows saved captions by url in the library tab', async () => {
    const user = userEvent.setup();

    render(
      <PopupApp
        state={baseState}
        onStart={vi.fn()}
        onStop={vi.fn()}
        onToggleAutoDetect={vi.fn()}
        onClearCaptions={vi.fn()}
        onCopyAll={vi.fn()}
        onDownload={vi.fn()}
        onDownloadLibrary={vi.fn()}
        onDeleteLibraryEntry={vi.fn()}
        onToggleAutoSaveLibrary={vi.fn()}
        onRefresh={vi.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Library Tab' }));

    expect(screen.getByText('Example video')).toBeInTheDocument();
    expect(screen.getByText('https://example.com/watch/1')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Download Saved VTT https://example.com/watch/1' })).toBeInTheDocument();
  });

  it('shows auto save setting in the settings tab', async () => {
    const user = userEvent.setup();

    render(
      <PopupApp
        state={baseState}
        onStart={vi.fn()}
        onStop={vi.fn()}
        onToggleAutoDetect={vi.fn()}
        onClearCaptions={vi.fn()}
        onCopyAll={vi.fn()}
        onDownload={vi.fn()}
        onDownloadLibrary={vi.fn()}
        onDeleteLibraryEntry={vi.fn()}
        onToggleAutoSaveLibrary={vi.fn()}
        onRefresh={vi.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Settings Tab' }));

    expect(screen.getByRole('switch', { name: 'Auto save captions by URL' })).toBeInTheDocument();
  });
});
