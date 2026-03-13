import { Copy, Download, PauseCircle, Radio, RefreshCcw, Trash2 } from 'lucide-react';
import { formatTimestamp } from '../lib/subtitles';
import type { DownloadFormat, PopupState } from '../lib/types';
import { Badge } from './components/ui/badge';
import { Button } from './components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { ScrollArea } from './components/ui/scroll-area';
import { Separator } from './components/ui/separator';
import { Switch } from './components/ui/switch';

type Props = {
  state: PopupState;
  onStart: () => void;
  onStop: () => void;
  onToggleAutoDetect: (enabled: boolean) => void;
  onClearCaptions: () => void;
  onCopyAll: () => void;
  onDownload: (format: DownloadFormat) => void;
  onRefresh: () => void;
};

export function PopupApp({
  state,
  onStart,
  onStop,
  onToggleAutoDetect,
  onClearCaptions,
  onCopyAll,
  onDownload,
  onRefresh
}: Props) {
  const session = state.session;
  const captions = session?.captions;

  if (!state.tabId || !state.isSupported) {
    return (
      <main className="box-border flex min-h-[560px] w-[420px] items-center bg-grain p-4 text-foreground">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>VTT Collector</CardTitle>
            <CardDescription>Open a regular webpage tab to use this extension.</CardDescription>
          </CardHeader>
        </Card>
      </main>
    );
  }

  const cueCount = captions?.cues.length ?? 0;
  const statusVariant =
    session?.lastError
      ? 'destructive'
      : session?.status === 'collecting'
        ? 'accent'
        : session?.status === 'detecting'
          ? 'default'
          : 'secondary';

  return (
    <main className="box-border min-h-[560px] w-[420px] overflow-hidden bg-grain p-4 text-foreground">
      <Card className="relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-20 bg-[radial-gradient(circle_at_top,rgba(237,167,95,0.28),transparent_72%)]" />
        <CardHeader className="relative space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CardTitle className="text-xl leading-none">Live Buffer</CardTitle>
                <Badge variant={statusVariant}>{session?.status ?? 'idle'}</Badge>
              </div>
              <CardDescription>Everything merged from every detected VTT segment.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{cueCount} items</Badge>
              <Button type="button" variant="ghost" size="icon" onClick={onRefresh} aria-label="Refresh">
                <RefreshCcw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {session?.lastError ? (
            <div className="rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              Error: {session.lastError}
            </div>
          ) : null}
        </CardHeader>

        <CardContent className="space-y-4">
          <section className="rounded-lg border border-border/80 bg-white/60 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">Auto detect subtitles</p>
                <p className="mt-1 text-xs text-muted-foreground">Capture subtitle prefetches before you open the popup.</p>
              </div>
              <label className="flex items-center gap-3">
                <span className="sr-only">Auto detect subtitles</span>
                <Switch
                  aria-label="Auto detect subtitles"
                  checked={session?.autoDetect ?? false}
                  onCheckedChange={onToggleAutoDetect}
                />
              </label>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button type="button" onClick={onStart} className="gap-2">
                <Radio className="h-4 w-4" />
                Start Detection
              </Button>
              <Button type="button" onClick={onStop} variant="secondary" className="gap-2">
                <PauseCircle className="h-4 w-4" />
                Stop Detection
              </Button>
            </div>

            <Separator className="my-4" />

            <div className="grid grid-cols-4 gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={!captions?.cues.length}
                onClick={onClearCaptions}
                className="gap-2"
                aria-label="Clear Captions"
              >
                <Trash2 className="h-4 w-4" />
                Clear
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={!captions?.cues.length}
                onClick={onCopyAll}
                className="gap-2"
                aria-label="Copy All Captions"
              >
                <Copy className="h-4 w-4" />
                Copy
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={!captions?.cues.length}
                onClick={() => onDownload('vtt')}
                className="gap-2"
                aria-label="Download VTT"
              >
                <Download className="h-4 w-4" />
                VTT
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={!captions?.cues.length}
                onClick={() => onDownload('txt')}
                className="gap-2"
                aria-label="Download TXT"
              >
                <Download className="h-4 w-4" />
                TXT
              </Button>
            </div>
          </section>

          <section>
            <ScrollArea className="h-[344px] rounded-lg border border-border/80 bg-white/70 p-1">
              <div className="space-y-2 p-2">
                {captions?.cues.length ? (
                  captions.cues.map((cue) => (
                    <article
                      key={cue.id}
                      className="grid grid-cols-[88px_1fr] gap-3 rounded-md border border-transparent bg-secondary/45 px-3 py-2 transition-colors hover:border-border hover:bg-secondary/70"
                    >
                      <time className="pt-0.5 text-xs font-semibold tracking-wide text-primary">
                        {formatTimestamp(cue.start)}
                      </time>
                      <p className="text-sm leading-5 text-foreground/90">{cue.text}</p>
                    </article>
                  ))
                ) : (
                  <div className="flex h-[248px] items-center justify-center rounded-md border border-dashed border-border bg-background/60 px-6 text-center text-sm text-muted-foreground">
                    No captions collected yet.
                  </div>
                )}
              </div>
            </ScrollArea>
          </section>
        </CardContent>
      </Card>
    </main>
  );
}
