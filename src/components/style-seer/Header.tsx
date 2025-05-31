import { Shirt } from 'lucide-react'; // Using Shirt as a more relevant icon

export default function Header() {
  return (
    <header className="bg-card text-card-foreground py-4 px-6 shadow-md border-b border-border">
      <div className="container mx-auto flex items-center gap-3">
        <Shirt size={36} className="text-primary" />
        <h1 className="text-4xl font-bold tracking-tight text-primary">Fitted Tool</h1>
      </div>
    </header>
  );
}
