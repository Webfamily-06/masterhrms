import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Award, Calendar, Gift, DollarSign, FileText } from "lucide-react";

export const Route = createFileRoute("/_authenticated/me/lifecycle/awards")({
  component: MeAwardsPage,
});

export default function MeAwardsPage() {
  const { data: awards = [], isLoading } = useQuery({
    queryKey: ["me-lifecycle-awards"],
    queryFn: async () => {
      const res = await api.get("/me/lifecycle/awards");
      return res.data;
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Awards & Recognition"
        description="A showcase of your official corporate achievements, excellence awards, and commendations."
      />

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">Loading your awards...</div>
      ) : awards.length === 0 ? (
        <Card className="py-12 text-center">
          <Award className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-30" />
          <h3 className="text-base font-semibold">No Awards Recorded Yet</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Official commendations and awards presented to you by management will appear here.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {awards.map((award: any) => (
            <Card key={award.id} className="relative overflow-hidden border-amber-200/50 bg-gradient-to-br from-background to-amber-500/5">
              <div className="absolute top-0 right-0 p-4">
                <Badge variant="outline" className="border-amber-500 text-amber-600 dark:text-amber-400">
                  {award.certificateNo || "Official Award"}
                </Badge>
              </div>
              <CardHeader className="pt-6 pb-2">
                <div className="h-12 w-12 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center mb-3">
                  <Award className="h-6 w-6" />
                </div>
                <CardTitle className="text-lg font-bold">
                  {award.giftItem || "Corporate Excellence Award"}
                </CardTitle>
                <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Conferred on {new Date(award.awardDate).toLocaleDateString()}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pt-2">
                <p className="text-sm text-muted-foreground">
                  {award.description || "In recognition of outstanding performance, leadership, and exemplary dedication."}
                </p>

                <div className="pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                  <span>Presented by:</span>
                  <span className="font-medium text-foreground">{award.presentedBy || "Senior Management"}</span>
                </div>
                {award.giftAmount && Number(award.giftAmount) > 0 && (
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Cash Value / Prize:</span>
                    <span className="font-mono font-medium text-emerald-600">
                      ${Number(award.giftAmount).toLocaleString()}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
