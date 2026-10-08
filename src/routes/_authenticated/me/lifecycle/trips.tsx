import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Plane, Plus, Calendar, DollarSign, Receipt, MapPin } from "lucide-react";

export const Route = createFileRoute("/_authenticated/me/lifecycle/trips")({
  component: MeTripsPage,
});

export default function MeTripsPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<any>(null);
  const [isExpenseOpen, setIsExpenseOpen] = useState(false);

  const [formData, setFormData] = useState({
    purpose: "",
    destination: "",
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    expectedBudget: "500",
    advanceRequested: "0",
  });

  const [expenseData, setExpenseData] = useState({
    category: "Airfare",
    amount: "100",
    currency: "USD",
    receiptNo: "",
    notes: "",
  });

  const { data: trips = [], isLoading } = useQuery({
    queryKey: ["me-lifecycle-trips"],
    queryFn: async () => {
      const res = await api.get("/me/lifecycle/trips");
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return await api.post("/me/lifecycle/trips", {
        ...data,
        expectedBudget: parseFloat(data.expectedBudget) || 0,
        advanceRequested: parseFloat(data.advanceRequested) || 0,
      });
    },
    onSuccess: () => {
      toast.success("Travel request submitted for manager approval");
      queryClient.invalidateQueries({ queryKey: ["me-lifecycle-trips"] });
      setIsModalOpen(false);
      setFormData({
        purpose: "",
        destination: "",
        startDate: new Date().toISOString().split("T")[0],
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        expectedBudget: "500",
        advanceRequested: "0",
      });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to submit travel request");
    },
  });

  const expenseMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof expenseData }) => {
      return await api.post(`/me/lifecycle/trips/${id}/expenses`, {
        ...data,
        amount: parseFloat(data.amount) || 0,
      });
    },
    onSuccess: () => {
      toast.success("Expense item logged");
      queryClient.invalidateQueries({ queryKey: ["me-lifecycle-trips"] });
      setIsExpenseOpen(false);
      setSelectedTrip(null);
      setExpenseData({
        category: "Airfare",
        amount: "100",
        currency: "USD",
        receiptNo: "",
        notes: "",
      });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to log expense");
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Business Travel & Travel Expenses"
        description="Submit official travel requests, track manager approval status, and record itemized trip receipts."
        actions={
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Request Travel
          </Button>
        }
      />

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">Loading travel trips...</div>
      ) : trips.length === 0 ? (
        <Card className="py-12 text-center">
          <Plane className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-30" />
          <h3 className="text-base font-semibold">No Travel Requests Found</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Submit a travel authorization request before embarking on company business.
          </p>
        </Card>
      ) : (
        <div className="space-y-6">
          {trips.map((t: any) => (
            <Card key={t.id}>
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base font-semibold">{t.purpose}</CardTitle>
                      <Badge
                        variant={
                          t.status === "approved"
                            ? "default"
                            : t.status === "completed"
                            ? "secondary"
                            : "outline"
                        }
                      >
                        {t.status.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-1">
                      <span className="flex items-center gap-1 font-medium text-foreground">
                        <MapPin className="h-3.5 w-3.5 text-blue-500" /> {t.destination}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(t.startDate).toLocaleDateString()} –{" "}
                        {new Date(t.endDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right text-xs">
                      <span className="text-muted-foreground block">Estimated Budget:</span>
                      <span className="font-mono font-medium">${Number(t.expectedBudget).toLocaleString()}</span>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedTrip(t);
                        setIsExpenseOpen(true);
                      }}
                    >
                      <Receipt className="h-4 w-4 mr-1" /> Log Expense
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {t.expenses && t.expenses.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <h5 className="text-xs font-semibold text-muted-foreground mb-2">
                      Logged Expense Receipts ({t.expenses.length})
                    </h5>
                    <div className="space-y-2">
                      {t.expenses.map((exp: any) => (
                        <div
                          key={exp.id}
                          className="flex items-center justify-between text-xs p-2 rounded bg-muted/40"
                        >
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px] py-0">
                              {exp.category}
                            </Badge>
                            <span>{exp.notes || "Item receipt"}</span>
                            {exp.receiptNo && (
                              <span className="text-muted-foreground">#{exp.receiptNo}</span>
                            )}
                          </div>
                          <span className="font-mono font-medium">
                            ${Number(exp.amount).toLocaleString()} {exp.currency}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* REQUEST MODAL */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Request Business Travel</DialogTitle>
            <DialogDescription>
              Submit dates, travel itinerary, and estimated budget for pre-approval.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Trip Purpose / Conference / Client</Label>
              <Input
                placeholder="e.g. Annual Cloud Summit & Client Meetings"
                value={formData.purpose}
                onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
              />
            </div>
            <div>
              <Label>Destination City & Country</Label>
              <Input
                placeholder="e.g. San Francisco, CA"
                value={formData.destination}
                onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
              </div>
              <div>
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Expected Budget ($)</Label>
                <Input
                  type="number"
                  value={formData.expectedBudget}
                  onChange={(e) => setFormData({ ...formData, expectedBudget: e.target.value })}
                />
              </div>
              <div>
                <Label>Advance Requested ($)</Label>
                <Input
                  type="number"
                  value={formData.advanceRequested}
                  onChange={(e) =>
                    setFormData({ ...formData, advanceRequested: e.target.value })
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={createMutation.isPending || !formData.purpose || !formData.destination}
              onClick={() => createMutation.mutate(formData)}
            >
              {createMutation.isPending ? "Submitting..." : "Submit Travel Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* LOG EXPENSE MODAL */}
      <Dialog open={isExpenseOpen} onOpenChange={setIsExpenseOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Log Travel Expense</DialogTitle>
            <DialogDescription>
              Record an itemized expense for trip: {selectedTrip?.purpose}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Expense Category</Label>
              <Select
                value={expenseData.category}
                onValueChange={(val) => setExpenseData({ ...expenseData, category: val })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Airfare">Airfare & Flights</SelectItem>
                  <SelectItem value="Hotel / Lodging">Hotel & Lodging</SelectItem>
                  <SelectItem value="Meals & Per Diem">Meals & Per Diem</SelectItem>
                  <SelectItem value="Local Transit">Taxi & Local Transit</SelectItem>
                  <SelectItem value="Conference Fee">Conference / Registration Fee</SelectItem>
                  <SelectItem value="Other">Other Expenses</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Amount</Label>
                <Input
                  type="number"
                  value={expenseData.amount}
                  onChange={(e) => setExpenseData({ ...expenseData, amount: e.target.value })}
                />
              </div>
              <div>
                <Label>Receipt / Voucher #</Label>
                <Input
                  placeholder="Optional #..."
                  value={expenseData.receiptNo}
                  onChange={(e) => setExpenseData({ ...expenseData, receiptNo: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>Description / Notes</Label>
              <Input
                placeholder="Details of expense..."
                value={expenseData.notes}
                onChange={(e) => setExpenseData({ ...expenseData, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsExpenseOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={expenseMutation.isPending || !expenseData.amount}
              onClick={() => {
                if (selectedTrip) {
                  expenseMutation.mutate({
                    id: selectedTrip.id,
                    data: expenseData,
                  });
                }
              }}
            >
              {expenseMutation.isPending ? "Logging..." : "Log Receipt"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
