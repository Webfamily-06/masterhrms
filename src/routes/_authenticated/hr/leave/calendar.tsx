import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/hr/leave/calendar")({
  component: HrLeaveCalendarRedirect,
});

export default function HrLeaveCalendarRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate({ to: "/hr/calendar" as any });
  }, [navigate]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-md w-full text-center p-6 space-y-4">
        <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto">
          <Calendar className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-bold tracking-tight">Redirecting to HR Calendar...</h2>
          <p className="text-sm text-muted-foreground">
            Leave calendar events are now fully integrated into the unified HR Calendar.
          </p>
        </div>
        <Button onClick={() => navigate({ to: "/hr/calendar" as any })} className="w-full">
          Open HR Calendar
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </Card>
    </div>
  );
}
