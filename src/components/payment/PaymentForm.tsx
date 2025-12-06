"use client";

import { useState, useEffect } from "react";
import { BillingAddress } from "@/types/payment";
import { validateBillingAddress, hasErrors } from "@/utils/validation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Shield, CreditCard } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";

interface PaymentFormProps {
  onSubmit: (billingAddress: BillingAddress) => void;
  loading?: boolean;
  onValidityChange?: (valid: boolean) => void;
}

export function PaymentForm({ onSubmit, loading = false, onValidityChange }: PaymentFormProps) {
  const t = useTranslations('payment.form');

  const [billingAddress, setBillingAddress] = useState<Partial<BillingAddress>>({
    firstName: "",
    lastName: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "",
  });

  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  // Derived validity - only check billing address
  const isValid = (() => {
    const addressErrors = validateBillingAddress(billingAddress as BillingAddress);
    return !hasErrors(addressErrors);
  })();

  // Notify parent when validity changes
  useEffect(() => {
    onValidityChange?.(isValid);
  }, [isValid, onValidityChange]);

  const handleAddressChange = (field: keyof BillingAddress, value: string) => {
    setBillingAddress((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate billing address only
    const addressErrors = validateBillingAddress(billingAddress as BillingAddress);

    if (hasErrors(addressErrors)) {
      setErrors(addressErrors as Record<string, string | undefined>);
      return;
    }

    // Submit with billing address
    onSubmit(billingAddress as BillingAddress);
  };

  return (
    <form id="billing-address-form" onSubmit={handleSubmit} className="space-y-6">
      {/* Payment Info Banner */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-white rounded-lg shadow-sm">
            <Shield className="w-5 h-5 text-[#3754ED]" />
          </div>
          <div>
            <h4 className="font-semibold text-[#010D50] mb-1">Secure Payment via BoxPay</h4>
            <p className="text-sm text-[#3A478A]">
              You'll be redirected to our secure payment partner to complete your payment. 
              Your card details are handled securely and never stored on our servers.
            </p>
          </div>
        </div>
        
        {/* Accepted Cards */}
        <div className="mt-4 pt-4 border-t border-blue-100">
          <p className="text-xs text-[#3A478A] mb-2">Accepted payment methods:</p>
          <div className="flex items-center gap-3">
            <Image src="/visa.png" alt="Visa" width={40} height={25} className="h-6 w-auto object-contain" />
            <Image src="/mastercard.png" alt="Mastercard" width={40} height={25} className="h-6 w-auto object-contain" />
            <Image src="/amex.png" alt="American Express" width={40} height={25} className="h-6 w-auto object-contain" />
            <div className="flex items-center gap-1 text-xs text-[#3A478A]">
              <CreditCard className="w-4 h-4" />
              <span>& more</span>
            </div>
          </div>
        </div>
      </div>

      {/* Billing Address Section */}
      <div className="bg-white border border-[#DFE0E4] rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="w-5 h-5 text-[#3754ED]" />
          <h3 className="text-lg font-semibold text-[#010D50]">
            {t('billingAddress')}
          </h3>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {/* Name Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name {t('required')}</Label>
              <Input
                id="firstName"
                type="text"
                value={billingAddress.firstName}
                onChange={(e) => handleAddressChange("firstName", e.target.value)}
                placeholder="John"
                className={errors.firstName ? "border-red-500" : ""}
              />
              {errors.firstName && (
                <p className="text-xs text-red-600">{errors.firstName}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name {t('required')}</Label>
              <Input
                id="lastName"
                type="text"
                value={billingAddress.lastName}
                onChange={(e) => handleAddressChange("lastName", e.target.value)}
                placeholder="Smith"
                className={errors.lastName ? "border-red-500" : ""}
              />
              {errors.lastName && (
                <p className="text-xs text-red-600">{errors.lastName}</p>
              )}
            </div>
          </div>

          {/* Address Line 1 */}
          <div className="space-y-2">
            <Label htmlFor="addressLine1">{t('addressLine1')} {t('required')}</Label>
            <Input
              id="addressLine1"
              type="text"
              value={billingAddress.addressLine1}
              onChange={(e) => handleAddressChange("addressLine1", e.target.value)}
              placeholder={t('addressLine1Placeholder')}
              className={errors.addressLine1 ? "border-red-500" : ""}
            />
            {errors.addressLine1 && (
              <p className="text-xs text-red-600">{errors.addressLine1}</p>
            )}
          </div>

          {/* Address Line 2 */}
          <div className="space-y-2">
            <Label htmlFor="addressLine2">{t('addressLine2')}</Label>
            <Input
              id="addressLine2"
              type="text"
              value={billingAddress.addressLine2}
              onChange={(e) => handleAddressChange("addressLine2", e.target.value)}
              placeholder={t('addressLine2Placeholder')}
            />
          </div>

          {/* City, State, Postal Code */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">{t('city')} {t('required')}</Label>
              <Input
                id="city"
                type="text"
                value={billingAddress.city}
                onChange={(e) => handleAddressChange("city", e.target.value)}
                placeholder={t('cityPlaceholder')}
                className={errors.city ? "border-red-500" : ""}
              />
              {errors.city && (
                <p className="text-xs text-red-600">{errors.city}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="state">{t('state')}</Label>
              <Input
                id="state"
                type="text"
                value={billingAddress.state}
                onChange={(e) => handleAddressChange("state", e.target.value)}
                placeholder={t('statePlaceholder')}
                className={errors.state ? "border-red-500" : ""}
              />
              {errors.state && (
                <p className="text-xs text-red-600">{errors.state}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="postalCode">{t('postalCode')} {t('required')}</Label>
              <Input
                id="postalCode"
                type="text"
                value={billingAddress.postalCode}
                onChange={(e) => handleAddressChange("postalCode", e.target.value)}
                placeholder={t('postalCodePlaceholder')}
                className={errors.postalCode ? "border-red-500" : ""}
              />
              {errors.postalCode && (
                <p className="text-xs text-red-600">{errors.postalCode}</p>
              )}
            </div>
          </div>

          {/* Country */}
          <div className="space-y-2">
            <Label htmlFor="country">{t('country')} {t('required')}</Label>
            <Input
              id="country"
              type="text"
              value={billingAddress.country}
              onChange={(e) => handleAddressChange("country", e.target.value)}
              placeholder={t('countryPlaceholder')}
              className={errors.country ? "border-red-500" : ""}
            />
            {errors.country && (
              <p className="text-xs text-red-600">{errors.country}</p>
            )}
          </div>
        </div>
      </div>

      {/* Security Notice */}
      <div className="flex items-center justify-center gap-2 text-xs text-[#3A478A]">
        <Shield className="w-4 h-4" />
        <p>Your payment is protected with 3D Secure authentication and SSL encryption</p>
      </div>
    </form>
  );
}
