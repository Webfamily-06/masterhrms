import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FileText, Download, Calendar } from "lucide-react";

export const Route = createFileRoute("/_authenticated/me/documents/")({
  component: MeDocumentsPage,
});

export default function MeDocumentsPage() {
  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["me-company-documents"],
    queryFn: async () => {
      const res = await api.get("/me/documents");
      return res.data;
    },
  });

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Company Handbooks & Documents"
        description="Access official enterprise policies, code of conduct, health guidelines, and corporate guidelines."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5 text-indigo-500" />
            Corporate Documents Vault ({documents.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Document Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>File Size</TableHead>
                <TableHead>Published Date</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Loading company documents...
                  </TableCell>
                </TableRow>
              ) : documents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No documents currently published to your portal.
                  </TableCell>
                </TableRow>
              ) : (
                documents.map((d: any) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">
                      <div>{d.title}</div>
                      <div className="text-xs text-muted-foreground font-mono">{d.documentCode}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{d.category}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{d.fileSize}</TableCell>
                    <TableCell className="text-sm">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                        {new Date(d.createdAt).toLocaleDateString()}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {d.fileUrl && (
                        <a href={d.fileUrl} target="_blank" rel="noreferrer" download>
                          <Button variant="outline" size="sm" className="gap-1">
                            <Download className="h-3.5 w-3.5" /> View
                          </Button>
                        </a>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
