import { resolveRefundability } from "./refundability";

describe("resolveRefundability", () => {
  it("lets explicit non-refundable supplier text override a conflicting boolean", () => {
    expect(resolveRefundability({ refundable: true, text: "Ticket can't be refunded" })).toMatchObject({
      status: "non-refundable",
      label: "Non-Refundable",
    });
  });

  it("identifies fully refundable and penalty fares", () => {
    expect(resolveRefundability({ text: "Fully refundable" }).label).toBe("Fully Refundable");
    expect(resolveRefundability({ text: "Refundable with penalty fees" }).label).toBe("Refundable with Penalty");
  });
});
