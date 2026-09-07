export function resolveRefundability({ refundable, status, text }: {
  refundable?: boolean | null;
  status?: string | null;
  text?: string | null;
}) {
  const description = String(text || "").trim();
  const normalizedStatus = String(status || "").toLowerCase();
  const saysNonRefundable = /non[- ]?refundable|can(?:not|'t) be refunded|no refunds?/i.test(description);
  const saysFullyRefundable = /fully refundable/i.test(description) || normalizedStatus === "fully-refundable";
  const saysPenalty = /penalt|fee|charge/i.test(description) || normalizedStatus === "refundable-with-penalty";
  const isRefundable = saysNonRefundable ? false : (saysFullyRefundable || saysPenalty || normalizedStatus === "refundable" ? true : Boolean(refundable));

  return {
    isRefundable,
    status: isRefundable ? (saysFullyRefundable ? "fully-refundable" : saysPenalty ? "refundable-with-penalty" : "refundable") : "non-refundable",
    label: isRefundable ? (saysFullyRefundable ? "Fully Refundable" : saysPenalty ? "Refundable with Penalty" : "Refundable") : "Non-Refundable",
    description: description || (isRefundable ? "Ticket can be refunded (fees may apply)" : "Ticket can't be refunded"),
  };
}
