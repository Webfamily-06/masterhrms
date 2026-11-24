"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api, unwrapData } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Star, ClipboardList } from "lucide-react";

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

function StatusBadge({ status }: { status?: string }) {
  if (status === "completed") {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
        Completed
      </span>
    );
  }
  if (status === "in_progress") {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
        In Progress
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-500/20">
      Scheduled
    </span>
  );
}

export default function PerformanceReviewDetailsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const reviewId = params?.id;

  const { data: review, isLoading } = useQuery<ReviewDetailResponse>({
    queryKey: ["hr-performance-review-detail", reviewId],
    enabled: Boolean(reviewId),
    queryFn: async () => {
      const res = await api.get(`/hr/performance/reviews/${reviewId}`);
      return unwrapData<ReviewDetailResponse>(res);
    },
  });

  if (isLoading) {
    return (
      <div className="p-4 lg:p-6 max-w-7xl mx-auto">
        <div className="bg-card border border-border/80 rounded-xl p-10 text-center text-sm text-muted-foreground">
          Loading review details...
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
  const reviewerName = review.reviewer
    ? `${review.reviewer.firstName || ""} ${review.reviewer.lastName || ""}`.trim()
    : "—";

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title="Review Details"
        description="View the full results and feedback for this performance review."
        actions={
          <div className="flex items-center gap-2">
            {review.status !== "completed" && (
              <Button
                onClick={() => router.push(`/hr/performance/reviews/${review.id}/conduct`)}
                className="bg-emerald-500 hover:bg-emerald-600 text-white"
              >
                <ClipboardList className="h-4 w-4 mr-1.5" />
                Conduct Review
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => router.push("/hr/performance/reviews")}
            >
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Back
            </Button>
          </div>
        }
      />

      {/* Review Information Card */}
      <div className="bg-card border border-border/80 rounded-xl shadow-xs p-6 space-y-6">
        <div>
          <h2 className="text-lg font-bold text-foreground">Review Information</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Details about this performance review
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-5 gap-x-8">
          <div className="space-y-4">
            <div>
              <div className="text-xs text-muted-foreground">Employee</div>
              <div className="text-sm font-semibold text-foreground mt-1">{employeeName}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Reviewer</div>
              <div className="text-sm font-semibold text-foreground mt-1">{reviewerName}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Review Cycle</div>
              <div className="text-sm font-semibold text-foreground mt-1">
                {review.cycle?.name || review.cycle?.title || "—"}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <div className="text-xs text-muted-foreground">Review Date</div>
              <div className="text-sm font-semibold text-foreground mt-1">
                {review.reviewDate || "—"}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Status</div>
              <div className="mt-1">
                <StatusBadge status={review.status} />
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-border/70 pt-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-foreground">Overall Rating</h3>
            <div className="flex items-center gap-1.5">
              <span className="text-xl font-bold text-foreground">
                {review.ratingScore !== null && review.ratingScore !== undefined
                  ? Number(review.ratingScore).toFixed(1)
                  : "-"}
              </span>
              {review.ratingScore !== null && review.ratingScore !== undefined && (
                <Star className="h-5 w-5 text-amber-400 fill-amber-400" />
              )}
            </div>
          </div>

          <div>
            <div className="text-xs font-medium text-muted-foreground">Comments</div>
            <p className="text-sm text-foreground mt-1 leading-relaxed">
              {review.overallComments?.trim() || "No overall comments recorded yet."}
            </p>
          </div>
        </div>
      </div>

      {/* Performance Ratings Card */}
      <div className="bg-card border border-border/80 rounded-xl shadow-xs p-6 space-y-6">
        <div>
          <h2 className="text-lg font-bold text-foreground">Performance Ratings</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Individual ratings for each performance indicator
          </p>
        </div>

        {review.categories.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No performance indicators configured yet.
          </div>
        ) : (
          <div className="space-y-8">
            {review.categories.map((category) => (
              <div key={category.id} className="space-y-4">
                <h3 className="text-base font-bold text-foreground">{category.name}</h3>
                <div className="space-y-3">
                  {category.indicators.map((ind) => (
                    <div
                      key={ind.id}
                      className="border border-border/80 rounded-xl p-5 bg-background/50 space-y-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1.5">
                          <div className="text-sm font-bold text-foreground">{ind.name}</div>
                          {ind.description && (
                            <p className="text-xs text-muted-foreground">{ind.description}</p>
                          )}
                          <div className="pt-1">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-muted text-foreground border border-border/70">
                              {ind.measurementUnit || "Rating"}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-base font-bold text-foreground">
                            {ind.rating !== null && ind.rating !== undefined
                              ? Number(ind.rating).toFixed(1)
                              : "-"}
                          </span>
                          {ind.rating !== null && ind.rating !== undefined && (
                            <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                          )}
                        </div>
                      </div>

                      <div className="border-t border-border/60 pt-3">
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Comments
                        </div>
                        <p className="text-sm text-foreground mt-1">
                          {ind.comments?.trim() || "No specific feedback provided."}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
