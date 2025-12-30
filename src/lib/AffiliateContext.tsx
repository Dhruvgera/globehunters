"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Affiliate, fetchAffiliates, getAffiliateByCode } from '@/services/affiliateService';
import { useBookingStore } from '@/store/bookingStore';
import Cookies from 'js-cookie';

interface AffiliateContextType {
  // Current affiliate code from URL
  affiliateCode: string | null;
  // Current affiliate data (matched from API)
  affiliate: Affiliate | null;
  // Phone number to display (affiliate phone or default)
  phoneNumber: string;
  // Loading state
  loading: boolean;
  // Set affiliate code (e.g., from URL params)
  setAffiliateCode: (code: string | null) => void;
  // All affiliates (for lookup)
  affiliates: Affiliate[];
}

const DEFAULT_PHONE = '020 4502 2984';

const AffiliateContext = createContext<AffiliateContextType>({
  affiliateCode: null,
  affiliate: null,
  phoneNumber: DEFAULT_PHONE,
  loading: true,
  setAffiliateCode: () => {},
  affiliates: [],
});

export function AffiliateProvider({ children }: { children: ReactNode }) {
  const [affiliateCode, setAffiliateCodeState] = useState<string | null>(null);
  const [affiliate, setAffiliate] = useState<Affiliate | null>(null);
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [phoneNumber, setPhoneNumber] = useState<string>(DEFAULT_PHONE);
  const [loading, setLoading] = useState(true);
  const setAffiliateData = useBookingStore((state) => state.setAffiliateData);

  // Load affiliate code from cookies on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedCode = Cookies.get('affiliate_code');
      if (storedCode) {
        setAffiliateCodeState(storedCode);
      }
    }
  }, []);

  // Fetch all affiliates on mount
  useEffect(() => {
    const loadAffiliates = async () => {
      try {
        const data = await fetchAffiliates();
        setAffiliates(data);
      } catch (error) {
        console.error('Failed to load affiliates:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAffiliates();
  }, []);

  // Update affiliate data when code or affiliates change
  useEffect(() => {
    if (!affiliateCode || affiliates.length === 0) {
      setAffiliate(null);
      setPhoneNumber(DEFAULT_PHONE);
      setAffiliateData(null);
      return;
    }

    const matched = affiliates.find(
      (aff) => aff.Aff_TrackingCode.toLowerCase() === affiliateCode.toLowerCase()
    );

    if (matched) {
      setAffiliate(matched);
      setPhoneNumber(matched.Aff_TelNo || DEFAULT_PHONE);
      // Sync to booking store for persistence across pages
      setAffiliateData({
        code: matched.Aff_TrackingCode,
        id: matched.Aff_ID,
        name: matched.Aff_Name,
        phone: matched.Aff_TelNo,
      });
      console.log('✅ Matched affiliate:', matched.Aff_Name, 'Phone:', matched.Aff_TelNo);
    } else {
      setAffiliate(null);
      setPhoneNumber(DEFAULT_PHONE);
      // Still store the code even if not matched (for tracking)
      setAffiliateData({ code: affiliateCode });
      console.log('⚠️ No matching affiliate for code:', affiliateCode);
    }
  }, [affiliateCode, affiliates, setAffiliateData]);

  // Set affiliate code and persist to cookies
  const setAffiliateCode = useCallback((code: string | null) => {
    setAffiliateCodeState(code);
    if (typeof window !== 'undefined') {
      if (code) {
        // Set cookie for 30 days
        Cookies.set('affiliate_code', code, { expires: 30 });
        console.log('💾 Stored affiliate code in cookie:', code);
      } else {
        Cookies.remove('affiliate_code');
      }
    }
  }, []);

  return (
    <AffiliateContext.Provider
      value={{
        affiliateCode,
        affiliate,
        phoneNumber,
        loading,
        setAffiliateCode,
        affiliates,
      }}
    >
      {children}
    </AffiliateContext.Provider>
  );
}

export function useAffiliate() {
  const context = useContext(AffiliateContext);
  if (!context) {
    throw new Error('useAffiliate must be used within an AffiliateProvider');
  }
  return context;
}

/**
 * Hook to get just the phone number (for components that only need the phone)
 */
export function useAffiliatePhone() {
  const { phoneNumber, loading } = useAffiliate();
  return { phoneNumber, loading };
}
