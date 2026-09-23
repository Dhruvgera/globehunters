import type {
  ActivityAvailabilityResponse,
  ActivitySearchRequest,
  ActivitySearchResponse,
} from "@/types/activities";

class ActivityService {
  async searchActivities(request: ActivitySearchRequest): Promise<ActivitySearchResponse> {
    const response = await fetch("/api/activities/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Failed to search activities" }));
      throw new Error(error.message || "Failed to search activities");
    }

    return response.json();
  }

  async getAvailableDates(productCode: string, startDate: string, endDate: string): Promise<ActivityAvailabilityResponse> {
    const query = new URLSearchParams({ startDate, endDate });
    const response = await fetch(`/api/activities/${encodeURIComponent(productCode)}?${query.toString()}`);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Failed to load activity availability" }));
      throw new Error(error.message || "Failed to load activity availability");
    }

    return response.json();
  }
}

export const activityService = new ActivityService();
