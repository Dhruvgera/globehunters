import { extractAvailableDatesFromSchedule } from "./client";

describe("extractAvailableDatesFromSchedule", () => {
  it("returns only operating days before checkout and excludes sold-out timed entries", () => {
    const schedule = {
      bookableItems: [
        {
          seasons: [
            {
              startDate: "2026-09-01",
              endDate: "2026-10-31",
              pricingRecords: [
                {
                  daysOfWeek: ["TUESDAY", "WEDNESDAY", "THURSDAY"],
                  timedEntries: [
                    { startTime: "09:00", unavailableDates: ["2026-09-23"] },
                    { startTime: "13:00", unavailableDates: ["2026-09-24"] },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };

    expect(extractAvailableDatesFromSchedule(schedule, "2026-09-22", "2026-09-26")).toEqual([
      "2026-09-22",
      "2026-09-23",
      "2026-09-24",
    ]);
  });

  it("does not expose a date when every start time is unavailable", () => {
    const schedule = {
      bookableItems: [
        {
          seasons: [
            {
              startDate: "2026-09-01",
              endDate: "2026-10-31",
              pricingRecords: [
                {
                  daysOfWeek: ["WEDNESDAY"],
                  timedEntries: [
                    { startTime: "09:00", unavailableDates: ["2026-09-23"] },
                    { startTime: "13:00", unavailableDates: ["2026-09-23"] },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };

    expect(extractAvailableDatesFromSchedule(schedule, "2026-09-23", "2026-09-24")).toEqual([]);
  });

  it("handles Viator unavailable-date objects", () => {
    const schedule = { bookableItems: [{ seasons: [{ startDate: "2026-09-01", endDate: "2026-10-31", pricingRecords: [{ daysOfWeek: ["WEDNESDAY"], timedEntries: [{ startTime: "09:00", unavailableDates: [{ date: "2026-09-23", reason: "SOLD_OUT" }] }] }] }] }] };
    expect(extractAvailableDatesFromSchedule(schedule, "2026-09-23", "2026-09-24")).toEqual([]);
  });
});
