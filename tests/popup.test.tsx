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
    domExtractionEnabled: true,
    vttResponseAnalysisEnabled: true,
    captionFontSize: 'sm',
    captionFontWeight: 'normal',
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

function renderPopupApp(overrides: Partial<React.ComponentProps<typeof PopupApp>> = {}) {
  return render(
    <PopupApp
      state={baseState}
      isSidePanel={false}
      canOpenSidePanel={true}
      onStart={vi.fn()}
      onStop={vi.fn()}
      onOpenSidePanel={vi.fn()}
      onToggleAutoDetect={vi.fn()}
      onToggleDomExtraction={vi.fn()}
      onToggleVttResponseAnalysis={vi.fn()}
      onSetCaptionDisplay={vi.fn()}
      onClearCaptions={vi.fn()}
      onCopyAll={vi.fn()}
      onDownload={vi.fn()}
      onDownloadLibrary={vi.fn()}
      onDownloadAllLibrary={vi.fn()}
      onDeleteLibraryEntry={vi.fn()}
      onToggleAutoSaveLibrary={vi.fn()}
      onRefresh={vi.fn()}
      {...overrides}
    />
  );
}

describe('PopupApp', () => {
  it('renders accumulated subtitles and action buttons', () => {
    renderPopupApp();

    expect(screen.getByText('hello')).toBeInTheDocument();
    expect(screen.getByText('00:00:01')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Download VTT' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clear Captions' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy All Captions' })).toBeInTheDocument();
    expect(screen.getByText('Live Buffer')).toBeInTheDocument();
    expect(screen.getByText('Transcript Queue')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Auto detect subtitles/i })).toBeInTheDocument();
    expect(screen.getByText('Security Checker')).toBeInTheDocument();
    expect(screen.queryByText(/Current page:/i)).not.toBeInTheDocument();
  });

  it('calls clear handler for the selected track', async () => {
    const user = userEvent.setup();
    const onClearCaptions = vi.fn();

    renderPopupApp({ onClearCaptions });

    await user.click(screen.getByRole('button', { name: 'Clear Captions' }));
    expect(onClearCaptions).toHaveBeenCalled();
  });

  it('shows a manual refresh affordance for stale popup state', () => {
    renderPopupApp();

    expect(screen.getByRole('button', { name: 'Refresh' })).toBeInTheDocument();
  });

  it('calls copy handler for accumulated captions', async () => {
    const user = userEvent.setup();
    const onCopyAll = vi.fn();

    renderPopupApp({ onCopyAll });

    await user.click(screen.getByRole('button', { name: 'Copy All Captions' }));
    expect(onCopyAll).toHaveBeenCalled();
  });

  it('shows saved captions by url in the library tab', async () => {
    const user = userEvent.setup();

    renderPopupApp();

    await user.click(screen.getByRole('tab', { name: 'Library Tab' }));

    expect(screen.getByText('Example video')).toBeInTheDocument();
    expect(screen.getByText('https://example.com/watch/1')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Download Saved VTT https://example.com/watch/1' })).toBeInTheDocument();
  });

  it('shows auto save setting in the settings tab', async () => {
    const user = userEvent.setup();

    renderPopupApp();

    await user.click(screen.getByRole('tab', { name: 'Settings Tab' }));

    expect(screen.getByRole('switch', { name: 'Auto save captions by URL' })).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'DOM caption extraction' })).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'VTT response analysis' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Caption font size' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Caption font weight' })).toBeInTheDocument();
  });

  it('calls collection mode setting handlers', async () => {
    const user = userEvent.setup();
    const onToggleDomExtraction = vi.fn();
    const onToggleVttResponseAnalysis = vi.fn();

    renderPopupApp({ onToggleDomExtraction, onToggleVttResponseAnalysis });

    await user.click(screen.getByRole('tab', { name: 'Settings Tab' }));
    await user.click(screen.getByRole('switch', { name: 'DOM caption extraction' }));
    await user.click(screen.getByRole('switch', { name: 'VTT response analysis' }));

    expect(onToggleDomExtraction).toHaveBeenCalledWith(false);
    expect(onToggleVttResponseAnalysis).toHaveBeenCalledWith(false);
  });

  it('calls caption display setting handler', async () => {
    const user = userEvent.setup();
    const onSetCaptionDisplay = vi.fn();

    renderPopupApp({ onSetCaptionDisplay });

    await user.click(screen.getByRole('tab', { name: 'Settings Tab' }));
    await user.selectOptions(screen.getByRole('combobox', { name: 'Caption font size' }), 'lg');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Caption font weight' }), 'semibold');

    expect(onSetCaptionDisplay).toHaveBeenCalledWith({ fontSize: 'lg' });
    expect(onSetCaptionDisplay).toHaveBeenCalledWith({ fontWeight: 'semibold' });
  });

  it('shows a side panel affordance and calls its handler', async () => {
    const user = userEvent.setup();
    const onOpenSidePanel = vi.fn();

    renderPopupApp({ onOpenSidePanel });

    await user.click(screen.getByRole('button', { name: 'Open Side Panel' }));
    expect(onOpenSidePanel).toHaveBeenCalled();
  });

  it('calls the library bulk download handler', async () => {
    const user = userEvent.setup();
    const onDownloadAllLibrary = vi.fn();

    renderPopupApp({ onDownloadAllLibrary });

    await user.click(screen.getByRole('tab', { name: 'Library Tab' }));
    await user.click(screen.getByRole('button', { name: 'Download All Saved VTT' }));

    expect(onDownloadAllLibrary).toHaveBeenCalledWith('vtt');
  });
});
