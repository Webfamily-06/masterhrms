import ApexCharts from "apexcharts";
import flatpickr from "flatpickr";
import "flatpickr/dist/flatpickr.min.css";

// Ensure globally accessible
if (typeof window !== "undefined") {
  (window as any).ApexCharts = ApexCharts;
  (window as any).flatpickr = flatpickr;
}

export function initFlatpickr() {
  if (typeof document === "undefined") return;
  const elements = document.querySelectorAll('[data-provider="flatpickr"]');
  elements.forEach((el) => {
    const input = el as HTMLInputElement;
    if ((input as any)._flatpickr) {
      (input as any)._flatpickr.destroy();
    }
    const isRange = input.getAttribute("data-range-date") === "true";
    const dateFormat = input.getAttribute("data-date-format") || "d M Y";

    flatpickr(input, {
      mode: isRange ? "range" : "single",
      dateFormat: dateFormat,
      disableMobile: true,
      defaultDate: input.value || undefined,
      onChange: (selectedDates, dateStr) => {
        input.value = dateStr;
      },
    });
  });
}
