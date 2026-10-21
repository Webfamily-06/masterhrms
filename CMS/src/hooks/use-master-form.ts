import { useState, useTransition } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";

export interface MasterFormOptions<T = any> {
  endpoint: string;
  queryKeyToInvalidate?: string | string[];
  initialValues: T;
  onSuccess?: (data: any) => void;
  onError?: (error: any) => void;
}

export function useMasterForm<T extends Record<string, any>>({
  endpoint,
  queryKeyToInvalidate,
  initialValues,
  onSuccess,
  onError,
}: MasterFormOptions<T>) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();
  const queryClient = useQueryClient();

  const isEditMode = Boolean(values.id);

  const mutation = useMutation({
    mutationFn: async (payload: T) => {
      if (isEditMode) {
        const url = `${endpoint}/${payload.id}`;
        return await api.put(url, payload);
      }
      return await api.post(endpoint, payload);
    },
    onSuccess: (res) => {
      toast.success(isEditMode ? "Record updated successfully" : "Record created successfully");
      if (queryKeyToInvalidate) {
        if (Array.isArray(queryKeyToInvalidate)) {
          for (const key of queryKeyToInvalidate) {
            queryClient.invalidateQueries({ queryKey: [key] });
          }
        } else {
          queryClient.invalidateQueries({ queryKey: [queryKeyToInvalidate] });
        }
      }
      onSuccess?.(res.data);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.error || err.message || "Failed to save record";
      toast.error(msg);
      onError?.(err);
    },
  });

  const handleChange = (field: keyof T, val: any) => {
    setValues((prev) => ({ ...prev, [field]: val }));
    if (errors[field as string]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field as string];
        return next;
      });
    }
  };

  const reset = (customValues?: T) => {
    setValues(customValues || initialValues);
    setErrors({});
  };

  const submit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    startTransition(() => {
      mutation.mutate(values);
    });
  };

  return {
    values,
    errors,
    isSubmitting: mutation.isPending || isPending,
    isEditMode,
    setValues,
    setErrors,
    handleChange,
    reset,
    submit,
  };
}
