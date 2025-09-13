
"use client";

import { LogEntry } from '@/ai/flows/types';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Server, ArrowDown, ArrowUp, AlertTriangle } from 'lucide-react';

interface DebugPanelProps {
  logs: LogEntry[];
}

export default function DebugPanel({ logs }: DebugPanelProps) {
  const getBadgeVariant = (event: LogEntry['event']) => {
    switch (event) {
      case 'invoke':
        return 'secondary';
      case 'response':
        return 'default';
      case 'error':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getEventIcon = (event: LogEntry['event']) => {
    switch (event) {
      case 'invoke':
        return <ArrowUp size={14} className="mr-2 text-blue-500" />;
      case 'response':
        return <ArrowDown size={14} className="mr-2 text-green-500" />;
      case 'error':
        return <AlertTriangle size={14} className="mr-2 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border/60 shadow-2xl">
      <Accordion type="single" collapsible>
        <AccordionItem value="debug-panel" className="border-b-0">
          <AccordionTrigger className="py-2 px-4 text-sm font-semibold">
            <div className="flex items-center">
                <Server size={16} className="mr-2" />
                <span>API Communication Log</span>
                <Badge variant="outline" className="ml-3">{logs.length}</Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <ScrollArea className="h-64 bg-background">
              <div className="p-4 text-xs font-mono">
                {logs.length === 0 ? (
                  <p className="text-center text-muted-foreground">No API calls logged yet. Upload an image to start.</p>
                ) : (
                  <div className="space-y-3">
                    {logs.map(log => (
                      <Card key={log.id} className="bg-muted/30">
                        <CardHeader className="p-2 flex-row justify-between items-center">
                            <CardTitle className="text-xs font-semibold flex items-center">
                                {getEventIcon(log.event)}
                                {log.flow}
                                <Badge variant={getBadgeVariant(log.event)} className="ml-2 capitalize">{log.event}</Badge>
                            </CardTitle>
                            <span className="text-muted-foreground text-[10px]">{new Date(log.timestamp).toLocaleTimeString()}</span>
                        </CardHeader>
                        <CardContent className="p-2 pt-0">
                           <pre className="whitespace-pre-wrap break-all bg-background p-2 rounded-sm border">
                             {JSON.stringify(log.data, null, 2)}
                           </pre>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
