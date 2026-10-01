"use client";

import { useState } from "react";
import { Download, Loader2, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getSessionItem, setSessionItem } from "@/lib/storage/safeSessionStorage";
import {
  buildPackageProposalPdf,
  packageCustomerTotal,
  packageProposalFileName,
  type PackageProposalInput,
} from "@/lib/packages/packageProposalPdf";

const MARKUP_STORAGE_KEY = "aiPackageAgentMarkupPercent";

type PackageProposalPdfDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called when the PDF is generated so the latest selections are used. */
  getInput: () => Omit<PackageProposalInput, "markupPercent" | "payAtProperty"> | null;
  packageCost: number;
  currency: string;
  /** Local taxes paid at the hotel, in `currency`. Not marked up. */
  payAtProperty?: number | null;
};

function formatMoney(value: number, currency: string) {
  const code = /^[A-Z]{3}$/.test(String(currency).toUpperCase()) ? String(currency).toUpperCase() : "GBP";
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: code, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
}

function canShareFiles() {
  if (typeof navigator === "undefined" || typeof navigator.canShare !== "function" || typeof File === "undefined") return false;
  try {
    return navigator.canShare({ files: [new File([""], "check.pdf", { type: "application/pdf" })] });
  } catch {
    return false;
  }
}

export function PackageProposalPdfDialog({ open, onOpenChange, getInput, packageCost, currency, payAtProperty }: PackageProposalPdfDialogProps) {
  const [markupPercent, setMarkupPercent] = useState(() => getSessionItem(MARKUP_STORAGE_KEY) ?? "0");
  const [busy, setBusy] = useState<"download" | "share" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const shareSupported = open && canShareFiles();

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) setError(null);
    onOpenChange(nextOpen);
  };

  const updateMarkup = (value: string) => {
    setMarkupPercent(value);
    setSessionItem(MARKUP_STORAGE_KEY, value);
  };

  const generate = async (mode: "download" | "share") => {
    const input = getInput();
    if (!input) {
      setError("Trip details are still loading. Try again in a moment.");
      return;
    }
    setBusy(mode);
    setError(null);
    try {
      const blob = await buildPackageProposalPdf({ ...input, markupPercent: Math.max(0, Number(markupPercent) || 0), payAtProperty });
      const fileName = packageProposalFileName(input.destinations);
      if (mode === "share") {
        const file = new File([blob], fileName, { type: "application/pdf" });
        try {
          await navigator.share({ files: [file], title: "Your Globehunters holiday itinerary" });
        } catch (shareError) {
          if (shareError instanceof DOMException && shareError.name === "AbortError") return;
          throw shareError;
        }
      } else {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
      }
      handleOpenChange(false);
    } catch (generationError) {
      console.error("Failed to create package PDF", generationError);
      setError(mode === "share" ? "Sharing isn't available right now. Download the PDF instead." : "We couldn't create the PDF. Please try again.");
    } finally {
      setBusy(null);
    }
  };

  const customerTotal = packageCustomerTotal(packageCost, Number(markupPercent) || 0);
  const localTaxes = payAtProperty && payAtProperty > 0 ? payAtProperty : 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[min(100vw-32px,460px)] bg-white">
        <DialogHeader>
          <DialogTitle className="pr-6 text-[#010D50]">Customer itinerary PDF</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm leading-6 text-[#3A478A]">
            Creates a customer-ready itinerary with flights, hotels, priced activities, images and what&apos;s included. Your markup
            is added to the trip total and activity prices and is never shown on the PDF.
          </p>
          <label className="block text-sm font-semibold text-[#010D50]">
            Agent markup (%)
            <input
              type="number"
              min="0"
              step="0.01"
              value={markupPercent}
              onChange={(event) => updateMarkup(event.target.value)}
              className="mt-2 h-11 w-full rounded-lg border border-[#DFE0E4] bg-white px-3 text-sm font-normal text-[#010D50] outline-none focus:border-[#3754ED] focus:ring-2 focus:ring-[#DCE3FF]"
            />
          </label>
          <div className="rounded-lg border border-[#DFE0E4] px-3 py-3 text-sm text-[#3A478A]">
            <div className="flex justify-between gap-4">
              <span>Package cost</span>
              <span className="font-semibold text-[#010D50]">{formatMoney(packageCost, currency)}</span>
            </div>
            <div className="mt-2 flex justify-between gap-4 border-t border-[#EEF0F6] pt-2">
              <span>{localTaxes > 0 ? "Pay now on PDF" : "Trip total on PDF"}</span>
              <span className="font-semibold text-[#010D50]">{formatMoney(customerTotal, currency)}</span>
            </div>
            {localTaxes > 0 ? (
              <div className="mt-2 flex justify-between gap-4">
                <span>Pay at check-in (no markup)</span>
                <span className="font-semibold text-[#010D50]">{formatMoney(localTaxes, currency)}</span>
              </div>
            ) : null}
          </div>
          {error ? <div className="text-sm text-[#B42318]">{error}</div> : null}
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} className="h-10 rounded-lg border-[#DFE0E4] px-4">
              Cancel
            </Button>
            {shareSupported ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => generate("share")}
                disabled={busy !== null}
                className="h-10 rounded-lg border-[#DFE0E4] px-4 text-[#010D50]"
              >
                {busy === "share" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
                Share
              </Button>
            ) : null}
            <Button
              type="button"
              onClick={() => generate("download")}
              disabled={busy !== null}
              className="h-10 rounded-lg bg-[#3754ED] px-4 text-white hover:bg-[#2942D1]"
            >
              {busy === "download" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {busy === "download" ? "Creating PDF" : "Download PDF"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
