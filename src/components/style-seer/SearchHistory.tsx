
import type { HistoryEntry } from '@/app/page';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import NextImage from 'next/image';
import { Eye, Clock, ImageIcon } from 'lucide-react'; // Added ImageIcon for placeholder

interface SearchHistoryProps {
  history: HistoryEntry[];
  onSelectHistoryItem: (entry: HistoryEntry) => void;
}

function getSummary(analysisResult: HistoryEntry['analysisResult']): string {
  const parts: string[] = [];
  if (analysisResult.clothingItems && analysisResult.clothingItems.length > 0) {
    parts.push(analysisResult.clothingItems.slice(0, 2).join(', '));
  }
  
  if (analysisResult.identifiedBrand && analysisResult.brandIsExplicit) {
    parts.push(analysisResult.identifiedBrand);
  } else if (analysisResult.approximatedBrands && analysisResult.approximatedBrands.length > 0) {
    parts.push(analysisResult.approximatedBrands[0] + " (Approx.)"); // Take the first approximation for summary
  }

  if (parts.length === 0 && analysisResult.genderDepartment) {
    parts.push(analysisResult.genderDepartment);
  }
  
  if (parts.length === 0) {
    return "Analyzed Details"; 
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
            <div className="w-20 h-20 relative rounded-md overflow-hidden bg-muted/50 flex-shrink-0 flex items-center justify-center">
              {entry.imageUri ? (
                <NextImage
                  src={entry.imageUri}
                  alt="Analyzed item thumbnail"
                  fill
                  className="rounded-md object-cover"
                  data-ai-hint="clothing thumbnail"
                />
              ) : (
                <ImageIcon size={32} className="text-muted-foreground" /> 
              )}
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
