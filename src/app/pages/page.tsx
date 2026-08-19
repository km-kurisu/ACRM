import { FileSpreadsheet } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default function PagesPage() {
  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Pages</h1>
        <p className="mt-1 text-muted-foreground">Content pages and management.</p>
      </div>

      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="size-5" />
            Coming Soon
          </CardTitle>
          <CardDescription>This section is under construction.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Page management features will be available here. Check back later.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
