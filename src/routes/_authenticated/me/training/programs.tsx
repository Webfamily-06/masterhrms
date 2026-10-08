import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpen, Clock, Award, ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/_authenticated/me/training/programs")({
  component: MeTrainingProgramsPage,
});

export default function MeTrainingProgramsPage() {
  const { data: programs = [], isLoading } = useQuery({
    queryKey: ["me-training-programs-catalog"],
    queryFn: async () => {
      const res = await api.get("/me/training/programs");
      return res.data;
    },
  });

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Training Catalog & Courses"
        description="Explore available professional certifications and learning pathways offered by the enterprise."
      />

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading course catalog...</div>
      ) : programs.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No training courses currently published in the catalog.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {programs.map((p: any) => (
            <Card key={p.id} className="flex flex-col justify-between">
              <CardHeader>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <Badge variant="outline">{p.category}</Badge>
                  {p.isMandatory && (
                    <Badge variant="destructive" className="gap-1 text-xs">
                      <ShieldAlert className="h-3 w-3" /> Mandatory
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-base">{p.title}</CardTitle>
                <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                  {p.description || "Comprehensive modular learning program designed for career acceleration."}
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" /> {p.durationHours} hrs
                  </span>
                  <span className="flex items-center gap-1 font-semibold text-amber-600">
                    <Award className="h-3.5 w-3.5" /> Passing: {p.passingScore}%
                  </span>
                </div>
              </CardContent>
              <CardFooter className="pt-0">
                <Button variant="outline" className="w-full gap-2">
                  <BookOpen className="h-4 w-4" /> Course Details
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
