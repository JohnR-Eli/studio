
import type { HistoryEntry } from '@/app/page';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import NextImage from 'next/image';
import { Eye, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface SearchHistoryProps {
  history: HistoryEntry[];
  onSelectHistoryItem: (entry: HistoryEntry) => void;
}

function getSummary(analysisResult: HistoryEntry['analysisResult']): string {
  const parts: string[] = [];
  if (analysisResult.clothingItems && analysisResult.clothingItems.length > 0) {
    parts.push(analysisResult.clothingItems.slice(0, 2).join(', '));
  }
  if (analysisResult.brand) {
    parts.push(analysisResult.brand);
  }
  // If brand and clothingItems are missing, check for genderDepartment
  if (parts.length === 0 && analysisResult.genderDepartment) {
    parts.push(analysisResult.genderDepartment);
  }
  if (parts.length === 0) {
    return "Analyzed Image"; // Fallback if no other details are available
  }
  return parts.join(' - ');
}


export default function SearchHistory({ history, onSelectHistoryItem }: SearchHistoryProps) {
  if (history.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-10">
        <p className="text-sm">Your search history will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {history.map((entry) => (
        <Card key={entry.id} className="overflow-hidden shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-start p-3 gap-3">
            <div className="w-20 h-20 relative rounded-md overflow-hidden bg-muted flex-shrink-0">
              <NextImage
                src={entry.imageUri}
                alt="Analyzed item thumbnail"
                fill
                className="rounded-md object-cover"
                data-ai-hint="clothing thumbnail"
              />
            </div>
            <div className="flex-grow min-w-0">
              <p className="text-sm font-medium truncate text-foreground" title={getSummary(entry.analysisResult)}>
                {getSummary(entry.analysisResult)}
              </p>
              <div className="flex items-center text-xs text-muted-foreground mt-1">
                <Clock size={12} className="mr-1" />
                {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                <span className="mx-1">|</span>
                {new Date(entry.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
              </div>
               <Button
                variant="outline"
                size="sm"
                onClick={() => onSelectHistoryItem(entry)}
                className="mt-2 w-full text-xs"
              >
                <Eye size={14} className="mr-1.5" />
                View Details
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
