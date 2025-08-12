
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LogEntry } from '@/app/page';

interface BackendLogsProps {
  logs: LogEntry[];
}

const flowToTitle: Record<string, string> = {
  findSimilarItems: 'Style Suggestions',
  findComplementaryItems: 'Complete the Look',
};

export default function BackendLogs({ logs }: BackendLogsProps) {
  const relevantLogs = logs.filter(log => flowToTitle[log.flow]);

  return (
    <div className="container mx-auto px-4 py-8 md:py-12 h-full">
      <ScrollArea className="h-full">
        <div className="space-y-6">
          {relevantLogs.length > 0 ? (
            relevantLogs.map((log, index) => (
              <Card key={index} className="shadow-lg rounded-xl">
                <CardHeader>
                  <CardTitle>{`${flowToTitle[log.flow]} - ${log.event === 'invoke' ? 'API Request' : 'API Response'}`}</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="text-xs font-mono p-4 bg-muted rounded-md overflow-auto">
                    {JSON.stringify(log.data, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="text-center text-muted-foreground py-10">
              <p>No backend logs to display. Run a new analysis to see the logs.</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
