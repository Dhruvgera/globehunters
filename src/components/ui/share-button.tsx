"use client";

import { useState } from "react";
import { Share2, MessageCircle, Mail, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Flight } from "@/types/flight";
import {
  shareViaWhatsApp,
  shareViaEmail,
  copyToClipboard,
  generateFlightShareData,
  isWebShareSupported,
  shareWithWebAPI
} from "@/lib/share";
import { useTranslations } from "next-intl";

interface ShareButtonProps {
  flight: Flight;
  className?: string;
}

export function ShareButton({ flight, className }: ShareButtonProps) {
  const t = useTranslations('search.flights');
  const [copied, setCopied] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const handleShare = async () => {
    const shareData = generateFlightShareData(flight);

    // Try Web Share API first (mobile)
    if (isWebShareSupported()) {
      const shared = await shareWithWebAPI(shareData);
      if (shared) return;
    }

    // If Web Share API not available or failed, open popover
    setIsOpen(true);
  };

  const handleWhatsApp = () => {
    const shareData = generateFlightShareData(flight);
    shareViaWhatsApp(shareData);
    setIsOpen(false);
  };

  const handleEmail = () => {
    const shareData = generateFlightShareData(flight);
    shareViaEmail(shareData);
    setIsOpen(false);
  };

  const handleCopyLink = async () => {
    const shareData = generateFlightShareData(flight);
    const success = await copyToClipboard(shareData);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className={`bg-[rgba(55,84,237,0.12)] hover:bg-[rgba(55,84,237,0.2)] text-[#3754ED] rounded-full px-4 py-2 h-auto text-xs font-medium ${className}`}
          onClick={handleShare}
          title={t('shareFlight')}
        >
          <Share2 className="w-4 h-4 mr-1" />
          {t('share')}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-48 p-2">
        <div className="space-y-1">
          <Button
            variant="ghost"
            className="w-full justify-start text-sm h-8"
            onClick={handleWhatsApp}
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            {t('whatsapp')}
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start text-sm h-8"
            onClick={handleEmail}
          >
            <Mail className="w-4 h-4 mr-2" />
            {t('email')}
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start text-sm h-8"
            onClick={handleCopyLink}
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 mr-2 text-green-600" />
                {t('linkCopied')}
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-2" />
                {t('copyLink')}
              </>
            )}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
