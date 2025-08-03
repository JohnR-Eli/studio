import { Shirt } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HeaderProps {
  onIconClick: () => void;
}

export default function Header({ onIconClick }: HeaderProps) {
  return (
    <header className="bg-card text-card-foreground py-4 px-6 shadow-md border-b border-border">
      <div className="container mx-auto flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={onIconClick}
          aria-label="Toggle Debug Panel"
          className="h-10 w-10 text-primary hover:bg-primary/10"
        >
          <Shirt size={36} />
        </Button>
        <h1 className="text-4xl font-bold tracking-tight text-primary">Fitted Tool</h1>
      </div>
    </header>
  );
}
