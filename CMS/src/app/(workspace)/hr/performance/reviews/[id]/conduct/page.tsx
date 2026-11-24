"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, unwrapData } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowLeft, Star } from "lucide-react";

interface IndicatorItem {
  id: string;
  code: string;
  name: string;
  description: string;
  measurementUnit: string;
  targetValue: string;
  weight: number;
  rating: number | null;
  comments: string;
}

interface IndicatorCategoryGroup {
  id: string;
  code: string;
  name: string;
  description?: string;
  indicators: IndicatorItem[];
}

interface ReviewDetailResponse {
  id: string;
  reviewDate: string;
  ratingScore: number | null;
  overallComments?: string;
  status: "scheduled" | "in_progress" | "completed";
  cycle?: { id: string; name: string; title?: string } | null;
  employee?: { id: string; firstName: string; lastName: string; email?: string } | null;
  reviewer?: { id: string; firstName: string; lastName: string; email?: string } | null;
  categories: IndicatorCategoryGroup[];
}

function formatSliderRating(val: number) {
  return Number.isInteger(val) ? String(val) : val.toFixed(1);
}

export default function ConductPerformanceReviewPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const reviewId = params?.id;

  const [ratingsState, setRatingsState] = useState<
    Record<string, { rating: number; comments: string }>
  >({});
  const [overallComments, setOverallComments] = useState("");
  const [initialized, setInitialized] = useState(false);

  const { data: review, isLoading } = useQuery<ReviewDetailResponse>({
    queryKey: ["hr-performance-review-detail", reviewId],
    enabled: Boolean(reviewId),
    queryFn: async () => {
      const res = await api.get(`/hr/performance/reviews/${reviewId}`);
      return unwrapData<ReviewDetailResponse>(res);
    },
  });

  useEffect(() => {
    if (!review || initialized) return;
    const initial: Record<string, { rating: number; comments: string }> = {};
    for (const cat of review.categories || []) {
      for (const ind of cat.indicators || []) {
        initial[ind.id] = {
          rating: ind.rating !== null && ind.rating !== undefined ? Number(ind.rating) : 3,
          comments: ind.comments || "",
        };
      }
    }
    setRatingsState(initial);
    setOverallComments(review.overallComments || "");
    setInitialized(true);
  }, [review, initialized]);

  const weightedAverage = useMemo(() => {
    if (!review) return 3.0;
    let sum = 0;
    let totalWeight = 0;
    for (const cat of review.categories || []) {
      for (const ind of cat.indicators || []) {
        const w = Number(ind.weight || 1);
        const val = ratingsState[ind.id]?.rating ?? 3;
        sum += val * w;
        totalWeight += w;
      }
    }
    return totalWeight > 0 ? Number((sum / totalWeight).toFixed(1)) : 3.0;
  }, [review, ratingsState]);

  const submitMutation = useMutation({
    mutationFn: async (targetStatus: "in_progress" | "completed") => {
      const ratingsPayload = Object.entries(ratingsState).map(([indicatorId, val]) => ({
        indicatorId,
        rating: val.rating,
        comments: val.comments,
      }));
      return api.post(`/hr/performance/reviews/${reviewId}/conduct`, {
        ratings: ratingsPayload,
        overallComments,
        status: targetStatus,
      });
    },
    onSuccess: (_data, targetStatus) => {
      toast.success(
        targetStatus === "completed"
          ? "Performance review submitted successfully"
          : "Review progress saved as draft"
      );
      queryClient.invalidateQueries({ queryKey: ["hr-performance-reviews"] });
      queryClient.invalidateQueries({ queryKey: ["hr-performance-review-detail", reviewId] });
      if (targetStatus === "completed") {
        router.push(`/hr/performance/reviews/${reviewId}`);
      } else {
        router.push("/hr/performance/reviews");
      }
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to save performance review");
    },
  });

  if (isLoading) {
    return (
      <div className="p-4 lg:p-6 max-w-7xl mx-auto">
        <div className="bg-card border border-border/80 rounded-xl p-10 text-center text-sm text-muted-foreground">
          Loading performance review form...
        </div>
      </div>
    );
  }

  if (!review) {
    return (
      <div className="p-4 lg:p-6 max-w-7xl mx-auto space-y-4">
        <Button variant="outline" onClick={() => router.push("/hr/performance/reviews")}>
          <ArrowLeft className="h-4 w-4 mr-1.5" /> Back
        </Button>
        <div className="bg-card border border-border/80 rounded-xl p-10 text-center text-sm text-muted-foreground">
          Performance review not found.
        </div>
      </div>
    );
  }

  const employeeName = review.employee
    ? `${review.employee.firstName || ""} ${review.employee.lastName || ""}`.trim()
    : "—";

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title="Conduct Performance Review"
        description="Fill in and submit the performance review for this employee."
        actions={
          <Button
            variant="outline"
            onClick={() => router.push("/hr/performance/reviews")}
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Back
          </Button>
        }
      />

      {/* Review Information Card */}
      <div className="bg-card border border-border/80 rounded-xl shadow-xs p-6 space-y-5">
        <div>
          <h2 className="text-lg font-bold text-foreground">Review Information</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            You are conducting a performance review for:
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8">
          <div className="space-y-4">
            <div>
              <div className="text-xs text-muted-foreground">Employee</div>
              <div className="text-sm font-bold text-foreground mt-1">{employeeName}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Review Cycle</div>
              <div className="text-sm font-bold text-foreground mt-1">
                {review.cycle?.name || review.cycle?.title || "—"}
              </div>
            </div>
          </div>

          <div>
            <div className="text-xs text-muted-foreground">Review Date</div>
            <div className="text-sm font-bold text-foreground mt-1">
              {review.reviewDate || "—"}
            </div>
          </div>
        </div>
      </div>

      {/* Performance Ratings Card */}
      <div className="bg-card border border-border/80 rounded-xl shadow-xs p-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-foreground">Performance Ratings</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Rate the employee on each performance indicator
            </p>
          </div>
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-muted/60 border border-border/80 text-sm">
            <span className="text-muted-foreground">Calculated Rating:</span>
            <span className="font-bold text-foreground">{weightedAverage.toFixed(1)}</span>
            <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
          </div>
        </div>

        <div className="space-y-8">
          {(review.categories || []).map((category) => (
            <div key={category.id} className="space-y-4">
              <h3 className="text-base font-bold text-foreground">{category.name}</h3>
              <div className="space-y-4">
                {category.indicators.map((ind) => {
                  const state = ratingsState[ind.id] || { rating: 3, comments: "" };
                  const pct = ((state.rating - 1) / 4) * 100;
                  return (
                    <div
                      key={ind.id}
                      className="border border-border/80 rounded-xl p-5 bg-background/50 space-y-4"
                    >
                      <div className="space-y-1.5">
                        <div className="text-sm font-bold text-foreground">{ind.name}</div>
                        {ind.description && (
                          <p className="text-xs text-muted-foreground">{ind.description}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-2 pt-1.5">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-muted/80 text-foreground border border-border/70">
                            Measurement: {ind.measurementUnit || "Rating"}
                          </span>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-muted/80 text-foreground border border-border/70">
                            Target: {ind.targetValue || "4/5"}
                          </span>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-muted/80 text-foreground border border-border/70">
                            Weight: {Number(ind.weight || 1)}
                          </span>
                        </div>
                      </div>

                      {/* Rating Slider */}
                      <div className="space-y-2 pt-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-foreground">Rating</span>
                          <span className="inline-flex items-center gap-1 text-sm font-bold text-foreground">
                            <span>{formatSliderRating(state.rating)}</span>
                            <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                          </span>
                        </div>

                        <div className="relative flex items-center">
                          <input
                            type="range"
                            min={1}
                            max={5}
                            step={0.1}
                            value={state.rating}
                            onChange={(e) => {
                              const nextVal = parseFloat(e.target.value);
                              setRatingsState((prev) => ({
                                ...prev,
                                [ind.id]: {
                                  rating: nextVal,
                                  comments: prev[ind.id]?.comments ?? "",
                                },
                              }));
                            }}
                            className="w-full h-2 rounded-full appearance-none cursor-pointer accent-slate-900 dark:accent-white"
                            style={{
                              background: `linear-gradient(to right, #0f172a 0%, #0f172a ${pct}%, #e2e8f0 ${pct}%, #e2e8f0 100%)`,
                            }}
                          />
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                          <span>Poor</span>
                          <span>Average</span>
                          <span>Excellent</span>
                        </div>
                      </div>

                      {/* Comments */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground block">
                          Comments
                        </label>
                        <Textarea
                          rows={2}
                          value={state.comments}
                          onChange={(e) => {
                            const nextText = e.target.value;
                            setRatingsState((prev) => ({
                              ...prev,
                              [ind.id]: {
                                rating: prev[ind.id]?.rating ?? 3,
                                comments: nextText,
                              },
                            }));
                          }}
                          placeholder="Add specific feedback for this indicator"
                          className="bg-background resize-y"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Overall Comments Section */}
        <div className="border-t border-border/70 pt-6 space-y-3">
          <h3 className="text-base font-bold text-foreground">Overall Comments</h3>
          <Textarea
            rows={4}
            value={overallComments}
            onChange={(e) => setOverallComments(e.target.value)}
            placeholder="Provide an overall summary of the employee's performance, key strengths, and areas for growth..."
            className="bg-background"
          />
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-end gap-3 pt-2 border-t border-border/70">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/hr/performance/reviews")}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={submitMutation.isPending}
            onClick={() => submitMutation.mutate("in_progress")}
          >
            {submitMutation.isPending ? "Saving..." : "Save Draft"}
          </Button>
          <Button
            type="button"
            disabled={submitMutation.isPending}
            onClick={() => submitMutation.mutate("completed")}
            className="bg-emerald-500 hover:bg-emerald-600 text-white"
          >
            {submitMutation.isPending ? "Submitting..." : "Submit Review"}
          </Button>
        </div>
      </div>
    </div>
  );
}
