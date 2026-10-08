import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, ArrowUpRight, Calendar, Building, DollarSign } from "lucide-react";

export const Route = createFileRoute("/_authenticated/me/lifecycle/promotions")({
  component: MePromotionsPage,
});

export default function MePromotionsPage() {
  const { data: promotions = [], isLoading } = useQuery({
    queryKey: ["me-lifecycle-promotions"],
    queryFn: async () => {
      const res = await api.get("/me/lifecycle/promotions");
      return res.data;
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Career Progression & Promotions"
        description="Historical log of your advancements, designation elevations, and compensation revisions."
      />

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">Loading career timeline...</div>
      ) : promotions.length === 0 ? (
        <Card className="py-12 text-center">
          <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-30" />
          <h3 className="text-base font-semibold">No Promotions Recorded</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Official career advancements and title changes approved by HR will be tracked here.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {promotions.map((p: any, idx: number) => (
            <Card key={p.id} className="relative">
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
                      <ArrowUpRight className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-base">{p.title || "Career Advancement"}</span>
                        <Badge variant="outline" className="text-xs">
                          {p.promotionType || "Standard"}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" /> Effective: {new Date(p.promotionDate).toLocaleDateString()}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Building className="h-3.5 w-3.5" />
                          {p.previousDesignation?.title || "Previous"} → <strong className="text-foreground">{p.newDesignation?.title || "Advanced"}</strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  {p.salaryIncrease && Number(p.salaryIncrease) > 0 && (
                    <Badge variant="secondary" className="font-mono text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30">
                      +${Number(p.salaryIncrease).toLocaleString()} /mo Revision
                    </Badge>
                  )}
                </div>

                {p.description && (
                  <p className="text-sm text-muted-foreground mt-4 pt-3 border-t border-border">
                    {p.description}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
