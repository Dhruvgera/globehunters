import type { ActivitySearchRequest, ActivitySearchResponse } from "@/types/activities";

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
}

export const activityService = new ActivityService();
