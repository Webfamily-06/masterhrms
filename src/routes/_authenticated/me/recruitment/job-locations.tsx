import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MapPin, Building, Globe } from "lucide-react";

export const Route = createFileRoute("/_authenticated/me/recruitment/job-locations")({
  component: MeJobLocationsPage,
  head: () => ({
    meta: [{ title: "Workplace Locations — Master HRMS" }],
  }),
});

export default function MeJobLocationsPage() {
  const { data: locations = [], isLoading } = useQuery({
    queryKey: ["me-job-locations"],
    queryFn: async () => {
      const res = await api.get("/api/v1/hr/organization/branches");
      return Array.isArray(res.data) ? res.data : [];
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Office & Work Locations"
        description="Explore corporate offices, operating hubs, and branch locations eligible for internal mobility and transfers."
      />

      <Card>
        <CardHeader>
          <CardTitle>Company Operating Locations</CardTitle>
          <CardDescription>
            Official branches and facilities across the organization.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">Loading locations...</div>
          ) : locations.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">No branches or locations found.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Location Name</TableHead>
                  <TableHead>City / Region</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Type</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {locations.map((loc: any) => (
                  <TableRow key={loc.id}>
                    <TableCell className="font-medium flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary" />
                      {loc.name}
                    </TableCell>
                    <TableCell>{loc.city || loc.state || "Headquarters"}</TableCell>
                    <TableCell>{loc.country || "India"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{loc.isHeadquarters ? "Corporate HQ" : "Branch Office"}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
