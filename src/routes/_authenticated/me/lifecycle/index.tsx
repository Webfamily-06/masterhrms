import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Award,
  TrendingUp,
  MapPin,
  AlertTriangle,
  LogOut,
  Plane,
  ShieldAlert,
  ArrowRight,
  UserCheck,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/me/lifecycle/")({
  component: MeLifecycleHubPage,
});

export default function MeLifecycleHubPage() {
  const { data: awards = [] } = useQuery({
    queryKey: ["me-lifecycle-awards"],
    queryFn: async () => {
      const res = await api.get("/me/lifecycle/awards");
      return res.data;
    },
  });

  const { data: promotions = [] } = useQuery({
    queryKey: ["me-lifecycle-promotions"],
    queryFn: async () => {
      const res = await api.get("/me/lifecycle/promotions");
      return res.data;
    },
  });

  const { data: warnings = [] } = useQuery({
    queryKey: ["me-lifecycle-warnings"],
    queryFn: async () => {
      const res = await api.get("/me/lifecycle/warnings");
      return res.data;
    },
  });

  const { data: trips = [] } = useQuery({
    queryKey: ["me-lifecycle-trips"],
    queryFn: async () => {
      const res = await api.get("/me/lifecycle/trips");
      return res.data;
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Career & Lifecycle Hub"
        description="View your recognition honours, promotions, official transfers, business travel requests, and confidential workplace feedback."
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Awards & Honours"
          value={awards.length.toString()}
          icon={<Award className="h-5 w-5 text-amber-500" />}
          description="Recognition certificates"
        />
        <StatCard
          title="Promotions"
          value={promotions.length.toString()}
          icon={<TrendingUp className="h-5 w-5 text-emerald-500" />}
          description="Career advancement milestones"
        />
        <StatCard
          title="Business Travel"
          value={trips.length.toString()}
          icon={<Plane className="h-5 w-5 text-blue-500" />}
          description="Official trips & expenses"
        />
        <StatCard
          title="Active Notices"
          value={warnings.filter((w: any) => !w.acknowledgedAt).length.toString()}
          icon={<AlertTriangle className="h-5 w-5 text-rose-500" />}
          description="Pending acknowledgements"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Award className="h-4 w-4 text-amber-500" /> Honours & Recognition
              </CardTitle>
            </div>
            <CardDescription>
              View commendations, awards, gift items, and certificates presented to you.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full justify-between">
              <Link to="/me/lifecycle/awards">
                View Awards <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-500" /> Promotion History
              </CardTitle>
            </div>
            <CardDescription>
              Timeline of designation advancements, title upgrades, and effective dates.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full justify-between">
              <Link to="/me/lifecycle/promotions">
                View Promotions <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <MapPin className="h-4 w-4 text-indigo-500" /> Transfers & Relocations
              </CardTitle>
            </div>
            <CardDescription>
              View past department and branch transfers, or submit a relocation request.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full justify-between">
              <Link to="/me/lifecycle/transfers">
                View Transfers <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Plane className="h-4 w-4 text-blue-500" /> Business Travel & Trips
              </CardTitle>
            </div>
            <CardDescription>
              Request domestic or overseas business travel and log itemized trip expenses.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full justify-between">
              <Link to="/me/lifecycle/trips">
                Manage Travel <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-rose-500" /> Disciplinary & Warnings
              </CardTitle>
            </div>
            <CardDescription>
              Review official advisory notices, submit employee explanations, and sign acknowledgements.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full justify-between">
              <Link to="/me/lifecycle/warnings">
                Review Notices <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-purple-500" /> Confidential Grievances
              </CardTitle>
            </div>
            <CardDescription>
              Submit private concerns or whistleblower reports directly to HR Leadership.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full justify-between">
              <Link to="/me/lifecycle/complaints">
                Report Grievance <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <LogOut className="h-4 w-4 text-slate-500" /> Resignation & Exit
              </CardTitle>
            </div>
            <CardDescription>
              Submit official resignation notices, track notice periods, or complete exit clearances.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Button asChild variant="outline" className="w-1/2">
                <Link to="/me/lifecycle/resignation">Resignation</Link>
              </Button>
              <Button asChild variant="outline" className="w-1/2">
                <Link to="/me/lifecycle/exit">Exit Tracker</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
