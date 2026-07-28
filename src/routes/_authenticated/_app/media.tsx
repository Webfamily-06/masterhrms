import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ImageIcon, Upload, Trash2, FileText, Image as ImgIcon, Download, Search } from "lucide-react";
import { PlanGuard, PlanLimitBar } from "@/components/plan-guard";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/_app/media")({
  component: TenantMediaPage,
  head: () => ({ meta: [{ title: "Media Library — Master ERP" }] }),
});

const DEFAULT_ASSETS = [
  { id: "ast-01", name: "Company Logo HD.png", size: "1.2 MB", type: "image", date: "2026-07-28", url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=80" },
  { id: "ast-02", name: "Employee Handbook 2026.pdf", size: "4.8 MB", type: "document", date: "2026-07-26", url: "https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=400&q=80" },
  { id: "ast-03", name: "GST Registration Certificate.pdf", size: "850 KB", type: "document", date: "2026-07-20", url: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=400&q=80" },
  { id: "ast-04", name: "Branch 1 POS Banner.jpg", size: "2.1 MB", type: "image", date: "2026-07-15", url: "https://images.unsplash.com/photo-1556742049-0a67dd38805f?auto=format&fit=crop&w=400&q=80" },
];

function TenantMediaPage() {
  const [assets, setAssets] = useState(DEFAULT_ASSETS);
  const [search, setSearch] = useState("");

  const filtered = assets.filter((a) => a.name.toLowerCase().includes(search.toLowerCase()));

  function handleSimulatedUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];

    const newAsset = {
      id: `ast-${Math.floor(10 + Math.random() * 90)}`,
      name: file.name,
      size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
      type: file.type.includes("image") ? "image" : "document",
      date: new Date().toISOString().slice(0, 10),
      url: URL.createObjectURL(file),
    };
    setAssets([newAsset, ...assets]);
    toast.success(`Asset "${file.name}" uploaded to Workspace Media Storage!`);
  }

  function deleteAsset(id: string) {
    setAssets((prev) => prev.filter((a) => a.id !== id));
    toast.success("Asset deleted");
  }

  return (
    <PlanGuard moduleName="Media Library & Storage" requiredPlan="free">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
              <ImageIcon className="size-6 text-primary" /> Workspace Media & Assets
            </h1>
            <p className="text-xs text-muted-foreground">Store company logos, contract documents, employee files & invoice assets.</p>
          </div>
          <div className="flex items-center gap-3">
            <PlanLimitBar used={assets.length} limit={50} label="Storage Assets Limit" />
          </div>
        </div>

        {/* Upload Bar & Search */}
        <Card className="p-4 bg-card shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input placeholder="Search documents & assets..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 text-xs" />
          </div>

          <label className="w-full sm:w-auto">
            <input type="file" onChange={handleSimulatedUpload} className="hidden" />
            <Button asChild className="w-full sm:w-auto font-bold text-xs gap-2 cursor-pointer">
              <span>
                <Upload className="size-4" /> Upload Workspace File
              </span>
            </Button>
          </label>
        </Card>

        {/* Assets Grid */}
        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((ast) => (
            <Card key={ast.id} className="overflow-hidden group hover:border-primary/50 transition-all">
              <div className="h-32 bg-secondary/40 relative overflow-hidden flex items-center justify-center">
                {ast.type === "image" ? (
                  <img src={ast.url} alt={ast.name} className="object-cover size-full group-hover:scale-105 transition-transform duration-300" />
                ) : (
                  <div className="size-12 rounded-2xl bg-primary/10 text-primary grid place-items-center">
                    <FileText className="size-6" />
                  </div>
                )}
                <Badge variant="outline" className="absolute top-2 left-2 text-[9px] font-mono bg-background/80 backdrop-blur-xs">
                  {ast.size}
                </Badge>
              </div>

              <CardContent className="p-3.5 space-y-2">
                <p className="font-bold text-xs truncate" title={ast.name}>
                  {ast.name}
                </p>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t">
                  <span>{ast.date}</span>
                  <Button size="icon" variant="ghost" className="size-6 text-destructive" onClick={() => deleteAsset(ast.id)}>
                    <Trash2 className="size-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </PlanGuard>
  );
}
