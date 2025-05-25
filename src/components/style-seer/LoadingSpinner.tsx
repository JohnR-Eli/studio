import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  message?: string;
  className?: string;
}

export default function LoadingSpinner({ message = "Analyzing...", className }: LoadingSpinnerProps) {
  return (
    <div className={`flex flex-col items-center justify-center space-y-3 p-6 rounded-lg bg-card shadow-md border ${className}`}>
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
      <p className="text-md text-muted-foreground">{message}</p>
    </div>
  );
}
