import { useLayoutEffect, useRef, useState } from 'react';
import { ChevronDown, Copy, Download, PanelRightOpen, PauseCircle, Radio, RefreshCcw, Trash2 } from 'lucide-react';
import { formatTimestamp } from '../lib/subtitles';
import type { CaptionFontSize, CaptionFontWeight, DownloadFormat, PopupState } from '../lib/types';
import { Badge } from './components/ui/badge';
import { Button } from './components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './components/ui/collapsible';
import { ScrollArea } from './components/ui/scroll-area';
import { Switch } from './components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';

type Props = {
  state: PopupState;
  isSidePanel: boolean;
  canOpenSidePanel: boolean;
  onStart: () => void;
  onStop: () => void;
  onOpenSidePanel: () => void;
  onToggleAutoDetect: (enabled: boolean) => void;
  onToggleAutoSaveLibrary: (enabled: boolean) => void;
  onToggleDomExtraction: (enabled: boolean) => void;
  onToggleVttResponseAnalysis: (enabled: boolean) => void;
  onSetCaptionDisplay: (payload: { fontSize?: CaptionFontSize; fontWeight?: CaptionFontWeight }) => void;
  onClearCaptions: () => void;
  onCopyAll: () => void;
  onDownload: (format: DownloadFormat) => void;
  onDownloadLibrary: (pageUrl: string, format: DownloadFormat) => void;
  onDownloadAllLibrary: (format: DownloadFormat) => void;
  onDeleteLibraryEntry: (pageUrl: string) => void;
  onRefresh: () => void;
};

export function PopupApp({
  state,
  isSidePanel,
  canOpenSidePanel,
  onStart,
  onStop,
  onOpenSidePanel,
  onToggleAutoDetect,
  onToggleAutoSaveLibrary,
  onToggleDomExtraction,
  onToggleVttResponseAnalysis,
  onSetCaptionDisplay,
  onClearCaptions,
  onCopyAll,
  onDownload,
  onDownloadLibrary,
  onDownloadAllLibrary,
  onDeleteLibraryEntry,
  onRefresh
}: Props) {
  const [activeTab, setActiveTab] = useState<'live' | 'library' | 'settings'>('live');
  const [isAutoDetectExpanded, setIsAutoDetectExpanded] = useState(false);
  const session = state.session;
  const captions = session?.captions;
  const cueCount = captions?.cues.length ?? 0;
  const libraryPages = state.library.length;
  const transcriptViewportRef = useRef<HTMLDivElement | null>(null);
  const shouldStickTranscriptToBottomRef = useRef(true);
  const captionTextClassName = `${captionFontSizeClassName(session?.captionFontSize ?? 'sm')} ${captionFontWeightClassName(session?.captionFontWeight ?? 'normal')}`;
  const statusVariant =
    session?.lastError
      ? 'destructive'
      : session?.status === 'collecting'
        ? 'accent'
        : session?.status === 'detecting'
          ? 'default'
          : 'secondary';

  useLayoutEffect(() => {
    const viewport = transcriptViewportRef.current;
    if (!viewport || !shouldStickTranscriptToBottomRef.current) return;
    viewport.scrollTop = viewport.scrollHeight;
  }, [cueCount, activeTab]);

  function handleTranscriptScroll(event: React.UIEvent<HTMLDivElement>): void {
    shouldStickTranscriptToBottomRef.current = isScrolledToBottom(event.currentTarget);
  }

  return (
    <main className={`box-border bg-grain p-3 text-foreground ${isSidePanel ? 'h-full min-h-full w-full min-w-[420px]' : 'min-h-[560px] w-[420px]'}`}>
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)} className={isSidePanel ? 'flex h-full min-h-0 flex-col' : ''}>
        <Card className={`overflow-hidden border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.86),rgba(246,250,255,0.8))] ${isSidePanel ? 'flex h-full flex-col' : ''}`}>
          <CardHeader className="space-y-3 border-b border-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.45),rgba(255,255,255,0.08))] pb-3">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-[1.2rem]">Security Checker</CardTitle>

              <div className="flex items-center gap-2">
                {canOpenSidePanel ? (
                  <Button type="button" variant="outline" size="icon" onClick={onOpenSidePanel} aria-label="Open Side Panel">
                    <PanelRightOpen className="h-4 w-4" />
                  </Button>
                ) : null}
                <Button type="button" variant="outline" size="icon" onClick={onRefresh} aria-label="Refresh">
                  <RefreshCcw className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2">
              <TabsList className="grid w-fit grid-cols-3">
                <TabsTrigger value="live" aria-label="Live Tab">
                  Live
                </TabsTrigger>
                <TabsTrigger value="library" aria-label="Library Tab">
                  Library
                </TabsTrigger>
                <TabsTrigger value="settings" aria-label="Settings Tab">
                  Settings
                </TabsTrigger>
              </TabsList>

              <div className="flex items-center gap-2">
                <Badge variant={statusVariant}>{session?.status ?? 'idle'}</Badge>
                <Badge variant="outline">{activeTab === 'library' ? `${libraryPages} pages` : `${cueCount} items`}</Badge>
              </div>
            </div>

            {activeTab === 'live' && session?.lastError ? (
              <div className="rounded-xl border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                Error: {session.lastError}
              </div>
            ) : null}
          </CardHeader>

          <CardContent className={`pt-4 ${isSidePanel ? 'flex min-h-0 flex-1 flex-col overflow-y-auto pr-4' : ''}`}>
            <TabsContent value="live" className={isSidePanel ? 'flex flex-col' : ''}>
              <div className="space-y-3">
                <section className={`min-w-0 overflow-hidden rounded-[1.25rem] border border-border/70 bg-white/78 p-1.5 shadow-sm shadow-slate-900/5 ${isSidePanel ? 'min-h-[320px] max-h-[560px]' : ''}`}>
                  <div className="flex items-center justify-between px-2.5 pb-1.5 pt-1.5">
                    <div className="space-y-1">
                      <h3 className="text-sm font-semibold tracking-[0.08em] text-foreground">Transcript Queue</h3>
                    </div>
                    <Badge variant="outline">{cueCount} lines</Badge>
                  </div>

                  <ScrollArea
                    viewportRef={transcriptViewportRef}
                    viewportProps={{ onScroll: handleTranscriptScroll }}
                    className={`min-w-0 rounded-[1rem] bg-background/70 ${isSidePanel ? 'h-[clamp(320px,48vh,560px)]' : 'h-[344px]'}`}
                  >
                    <div className="min-w-0 space-y-1.5 p-1.5">
                      {cueCount ? (
                        captions!.cues.map((cue) => (
                          <article
                            key={cue.id}
                            className="grid min-w-0 grid-cols-[78px_minmax(0,1fr)] gap-2.5 rounded-2xl border border-border/60 bg-white/86 px-2.5 py-2 shadow-sm shadow-slate-900/5 transition-colors hover:border-primary/20"
                          >
                            <time className="rounded-xl bg-secondary/70 px-2 py-1 text-center text-[11px] font-semibold tracking-[0.12em] text-primary">
                              {formatBufferTimestamp(cue.start)}
                            </time>
                            <p className={`min-w-0 break-words leading-5 text-foreground/90 ${captionTextClassName}`}>{cue.text}</p>
                          </article>
                        ))
                      ) : (
                        <div className="flex h-[248px] items-center justify-center rounded-2xl border border-dashed border-border bg-background/62 px-6 text-center text-sm text-muted-foreground">
                          No captions collected yet.
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </section>

                <section className="rounded-[1.25rem] border border-border/70 bg-white/78 p-3 shadow-sm shadow-slate-900/5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h2 className="font-display text-lg tracking-tight">Live Buffer</h2>
                        <Badge variant={statusVariant}>{session?.status ?? 'idle'}</Badge>
                      </div>
                    </div>
                    <Badge variant="outline">{cueCount} cues</Badge>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2.5">
                    <div className="rounded-2xl border border-border/70 bg-background/72 p-2.5">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Capture</p>
                      <div className="mt-2.5 grid grid-cols-2 gap-2">
                        <Button type="button" size="sm" onClick={onStart} className="gap-2" disabled={!state.tabId}>
                          <Radio className="h-3.5 w-3.5" />
                          Start Detection
                        </Button>
                        <Button type="button" size="sm" onClick={onStop} variant="secondary" className="gap-2" disabled={!state.tabId}>
                          <PauseCircle className="h-3.5 w-3.5" />
                          Stop Detection
                        </Button>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-border/70 bg-background/72 p-2.5">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Export</p>
                      <div className="mt-2.5 grid grid-cols-2 gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={!cueCount}
                          onClick={onClearCaptions}
                          className="gap-2"
                          aria-label="Clear Captions"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Clear
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={!cueCount}
                          onClick={onCopyAll}
                          className="gap-2"
                          aria-label="Copy All Captions"
                        >
                          <Copy className="h-3.5 w-3.5" />
                          Copy
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          disabled={!cueCount}
                          onClick={() => onDownload('vtt')}
                          className="gap-2"
                          aria-label="Download VTT"
                        >
                          <Download className="h-3.5 w-3.5" />
                          VTT
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          disabled={!cueCount}
                          onClick={() => onDownload('txt')}
                          className="gap-2"
                          aria-label="Download TXT"
                        >
                          <Download className="h-3.5 w-3.5" />
                          TXT
                        </Button>
                      </div>
                    </div>
                  </div>
                </section>

                <Collapsible open={isAutoDetectExpanded} onOpenChange={setIsAutoDetectExpanded}>
                  <section className="rounded-[1.25rem] border border-border/70 bg-white/78 shadow-sm shadow-slate-900/5">
                    <CollapsibleTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        className="flex h-auto w-full items-start justify-between rounded-[1.25rem] px-3.5 py-2.5 text-left"
                        aria-label="Auto detect subtitles"
                      >
                        <div>
                          <p className="text-sm font-semibold text-foreground">Auto detect subtitles</p>
                        </div>
                        <ChevronDown className={`mt-0.5 h-4 w-4 shrink-0 transition-transform ${isAutoDetectExpanded ? 'rotate-180' : ''}`} />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="border-t border-border/70 px-3.5 py-2.5 data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold">Background detection</p>
                        </div>
                        <Switch
                          aria-label="Auto detect subtitles toggle"
                          checked={session?.autoDetect ?? false}
                          onCheckedChange={onToggleAutoDetect}
                          disabled={!state.tabId}
                        />
                      </div>
                    </CollapsibleContent>
                  </section>
                </Collapsible>
              </div>
            </TabsContent>

            <TabsContent value="library" className={isSidePanel ? 'flex flex-col' : ''}>
              <section className={`space-y-3 ${isSidePanel ? 'pb-1' : ''}`}>
                <div className="rounded-[1.25rem] border border-border/70 bg-white/78 p-3 shadow-sm shadow-slate-900/5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="font-display text-lg tracking-tight">Saved By URL</h2>
                      <p className="mt-1 text-sm leading-5 text-muted-foreground">Every page keeps its own subtitle history so you can export it again later.</p>
                    </div>

                    <div className="grid shrink-0 grid-cols-2 gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="gap-2"
                        disabled={!libraryPages}
                        onClick={() => onDownloadAllLibrary('vtt')}
                        aria-label="Download All Saved VTT"
                      >
                        <Download className="h-3.5 w-3.5" />
                        All VTT
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="gap-2"
                        disabled={!libraryPages}
                        onClick={() => onDownloadAllLibrary('txt')}
                        aria-label="Download All Saved TXT"
                      >
                        <Download className="h-3.5 w-3.5" />
                        All TXT
                      </Button>
                    </div>
                  </div>
                </div>

                <section className="rounded-[1.25rem] border border-border/70 bg-white/78 p-1.5 shadow-sm shadow-slate-900/5">
                  <ScrollArea className={isSidePanel ? 'h-[clamp(320px,48vh,560px)]' : 'h-[460px]'}>
                    <div className="space-y-2.5 p-1.5">
                      {libraryPages ? (
                        state.library.map((entry) => (
                          <article key={entry.pageUrl} className="space-y-2.5 rounded-2xl border border-border/60 bg-white/88 p-3 shadow-sm shadow-slate-900/5">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-foreground">{entry.title}</p>
                                <p className="mt-1 break-all text-xs leading-5 text-muted-foreground">{entry.pageUrl}</p>
                              </div>
                              <Badge variant="outline">{entry.captions.cues.length} cues</Badge>
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="secondary"
                                className="gap-2"
                                onClick={() => onDownloadLibrary(entry.pageUrl, 'vtt')}
                                aria-label={`Download Saved VTT ${entry.pageUrl}`}
                              >
                                <Download className="h-3.5 w-3.5" />
                                VTT
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="secondary"
                                className="gap-2"
                                onClick={() => onDownloadLibrary(entry.pageUrl, 'txt')}
                                aria-label={`Download Saved TXT ${entry.pageUrl}`}
                              >
                                <Download className="h-3.5 w-3.5" />
                                TXT
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="gap-2"
                                onClick={() => onDeleteLibraryEntry(entry.pageUrl)}
                                aria-label={`Delete Saved Captions ${entry.pageUrl}`}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Delete
                              </Button>
                            </div>
                          </article>
                        ))
                      ) : (
                        <div className="flex h-[248px] items-center justify-center rounded-2xl border border-dashed border-border bg-background/62 px-6 text-center text-sm text-muted-foreground">
                          No saved captions yet.
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </section>
              </section>
            </TabsContent>

            <TabsContent value="settings">
              <section className="space-y-3">
                <div className="rounded-[1.25rem] border border-border/70 bg-white/78 p-3 shadow-sm shadow-slate-900/5">
                  <h2 className="font-display text-lg tracking-tight">Settings</h2>
                  <p className="mt-1 text-sm leading-5 text-muted-foreground">Control how captions are stored and reused across the same page URL.</p>
                </div>

                <div className="rounded-[1.25rem] border border-border/70 bg-white/78 p-3 shadow-sm shadow-slate-900/5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">Auto save captions by URL</p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">Load saved captions for the same page and keep merging new segments into that record.</p>
                    </div>
                    <Switch
                      aria-label="Auto save captions by URL"
                      checked={session?.autoSaveLibrary ?? true}
                      onCheckedChange={onToggleAutoSaveLibrary}
                      disabled={!state.tabId}
                    />
                  </div>
                </div>

                <div className="rounded-[1.25rem] border border-border/70 bg-white/78 p-3 shadow-sm shadow-slate-900/5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">DOM caption extraction</p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">Collect captions rendered in the player subtitle DOM.</p>
                    </div>
                    <Switch
                      aria-label="DOM caption extraction"
                      checked={session?.domExtractionEnabled ?? true}
                      onCheckedChange={onToggleDomExtraction}
                      disabled={!state.tabId}
                    />
                  </div>
                </div>

                <div className="rounded-[1.25rem] border border-border/70 bg-white/78 p-3 shadow-sm shadow-slate-900/5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">VTT response analysis</p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">Analyze VTT subtitle responses from fetch, XHR, and debugger network bodies.</p>
                    </div>
                    <Switch
                      aria-label="VTT response analysis"
                      checked={session?.vttResponseAnalysisEnabled ?? true}
                      onCheckedChange={onToggleVttResponseAnalysis}
                      disabled={!state.tabId}
                    />
                  </div>
                </div>

                <div className="rounded-[1.25rem] border border-border/70 bg-white/78 p-3 shadow-sm shadow-slate-900/5">
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-semibold">Caption display</p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">Adjust transcript text size and weight in the live queue.</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2.5">
                      <label className="space-y-1.5">
                        <span className="text-xs font-semibold text-muted-foreground">Font size</span>
                        <select
                          aria-label="Caption font size"
                          className="h-9 w-full rounded-xl border border-border/70 bg-background px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                          value={session?.captionFontSize ?? 'sm'}
                          onChange={(event) => onSetCaptionDisplay({ fontSize: event.currentTarget.value as CaptionFontSize })}
                          disabled={!state.tabId}
                        >
                          <option value="sm">Small</option>
                          <option value="base">Medium</option>
                          <option value="lg">Large</option>
                        </select>
                      </label>
                      <label className="space-y-1.5">
                        <span className="text-xs font-semibold text-muted-foreground">Font weight</span>
                        <select
                          aria-label="Caption font weight"
                          className="h-9 w-full rounded-xl border border-border/70 bg-background px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                          value={session?.captionFontWeight ?? 'normal'}
                          onChange={(event) => onSetCaptionDisplay({ fontWeight: event.currentTarget.value as CaptionFontWeight })}
                          disabled={!state.tabId}
                        >
                          <option value="normal">Normal</option>
                          <option value="medium">Medium</option>
                          <option value="semibold">Semibold</option>
                        </select>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="rounded-[1.25rem] border border-border/70 bg-background/62 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Workspace Notes</p>
                  <p className="mt-2 text-sm leading-6 text-foreground/78">
                    Use the popup for quick exports, or open the side panel when you want more vertical space for long transcript review sessions.
                  </p>
                </div>
              </section>
            </TabsContent>
          </CardContent>
        </Card>
      </Tabs>
    </main>
  );
}

function formatBufferTimestamp(seconds: number): string {
  return formatTimestamp(seconds).split('.')[0] ?? formatTimestamp(seconds);
}

function isScrolledToBottom(element: HTMLElement): boolean {
  const remainingScroll = element.scrollHeight - element.scrollTop - element.clientHeight;
  return remainingScroll <= 8;
}

function captionFontSizeClassName(value: CaptionFontSize): string {
  const classNames: Record<CaptionFontSize, string> = {
    sm: 'text-sm',
    base: 'text-base',
    lg: 'text-lg'
  };
  return classNames[value];
}

function captionFontWeightClassName(value: CaptionFontWeight): string {
  const classNames: Record<CaptionFontWeight, string> = {
    normal: 'font-normal',
    medium: 'font-medium',
    semibold: 'font-semibold'
  };
  return classNames[value];
}
