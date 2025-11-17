import { getVersionString } from "@shared/version";

export default function Footer() {
  const versionString = getVersionString();
  
  return (
    <footer className="border-t bg-muted/30">
      <div className="container py-4">
        <div className="text-center text-xs text-muted-foreground font-mono">
          <span className="font-medium">{versionString}</span>
        </div>
      </div>
    </footer>
  );
}

