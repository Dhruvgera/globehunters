"use client";

import { useState } from "react";
import { CardDetails, BillingAddress, PaymentFormErrors } from "@/types/payment";
import { validatePaymentCard, validateBillingAddress, hasErrors } from "@/utils/validation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CreditCard, Lock } from "lucide-react";

interface PaymentFormProps {
  onSubmit: (cardDetails: CardDetails, billingAddress: BillingAddress) => void;
  loading?: boolean;
}

export function PaymentForm({ onSubmit, loading = false }: PaymentFormProps) {
  const [cardDetails, setCardDetails] = useState<Partial<CardDetails>>({
    cardNumber: "",
    cardholderName: "",
    expiryMonth: "",
    expiryYear: "",
    cvv: "",
  });

  const [billingAddress, setBillingAddress] = useState<Partial<BillingAddress>>({
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "",
  });

  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  const handleCardChange = (field: keyof CardDetails, value: string) => {
    // Format card number with spaces
    if (field === "cardNumber") {
      value = value.replace(/\s/g, "").replace(/(\d{4})/g, "$1 ").trim();
    }
    
    setCardDetails((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleAddressChange = (field: keyof BillingAddress, value: string) => {
    setBillingAddress((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate card details
    const cardErrors = validatePaymentCard(cardDetails as CardDetails);
    const addressErrors = validateBillingAddress(billingAddress as BillingAddress);

    const allErrors = { ...cardErrors, ...addressErrors };

    if (hasErrors(allErrors)) {
      setErrors(allErrors as Record<string, string | undefined>);
      return;
    }

    // Submit payment
    onSubmit(cardDetails as CardDetails, billingAddress as BillingAddress);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Card Details Section */}
      <div className="bg-white border border-[#DFE0E4] rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <CreditCard className="w-5 h-5 text-[#3754ED]" />
          <h3 className="text-lg font-semibold text-[#010D50]">Card Details</h3>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {/* Card Number */}
          <div className="space-y-2">
            <Label htmlFor="cardNumber">Card Number *</Label>
            <Input
              id="cardNumber"
              type="text"
              value={cardDetails.cardNumber}
              onChange={(e) => handleCardChange("cardNumber", e.target.value)}
              placeholder="1234 5678 9012 3456"
              maxLength={19}
              className={errors.cardNumber ? "border-red-500" : ""}
            />
            {errors.cardNumber && (
              <p className="text-xs text-red-600">{errors.cardNumber}</p>
            )}
          </div>

          {/* Cardholder Name */}
          <div className="space-y-2">
            <Label htmlFor="cardholderName">Cardholder Name *</Label>
            <Input
              id="cardholderName"
              type="text"
              value={cardDetails.cardholderName}
              onChange={(e) => handleCardChange("cardholderName", e.target.value)}
              placeholder="John Doe"
              className={errors.cardholderName ? "border-red-500" : ""}
            />
            {errors.cardholderName && (
              <p className="text-xs text-red-600">{errors.cardholderName}</p>
            )}
          </div>

          {/* Expiry and CVV */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="expiryMonth">Month *</Label>
              <Input
                id="expiryMonth"
                type="text"
                value={cardDetails.expiryMonth}
                onChange={(e) => handleCardChange("expiryMonth", e.target.value)}
                placeholder="MM"
                maxLength={2}
                className={errors.expiryMonth ? "border-red-500" : ""}
              />
              {errors.expiryMonth && (
                <p className="text-xs text-red-600">{errors.expiryMonth}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="expiryYear">Year *</Label>
              <Input
                id="expiryYear"
                type="text"
                value={cardDetails.expiryYear}
                onChange={(e) => handleCardChange("expiryYear", e.target.value)}
                placeholder="YY"
                maxLength={2}
                className={errors.expiryYear ? "border-red-500" : ""}
              />
              {errors.expiryYear && (
                <p className="text-xs text-red-600">{errors.expiryYear}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="cvv">CVV *</Label>
              <Input
                id="cvv"
                type="text"
                value={cardDetails.cvv}
                onChange={(e) => handleCardChange("cvv", e.target.value)}
                placeholder="123"
                maxLength={4}
                className={errors.cvv ? "border-red-500" : ""}
              />
              {errors.cvv && (
                <p className="text-xs text-red-600">{errors.cvv}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Billing Address Section */}
      <div className="bg-white border border-[#DFE0E4] rounded-xl p-6">
        <h3 className="text-lg font-semibold text-[#010D50] mb-4">
          Billing Address
        </h3>

        <div className="grid grid-cols-1 gap-4">
          {/* Address Line 1 */}
          <div className="space-y-2">
            <Label htmlFor="addressLine1">Address Line 1 *</Label>
            <Input
              id="addressLine1"
              type="text"
              value={billingAddress.addressLine1}
              onChange={(e) => handleAddressChange("addressLine1", e.target.value)}
              placeholder="123 Main St"
              className={errors.addressLine1 ? "border-red-500" : ""}
            />
            {errors.addressLine1 && (
              <p className="text-xs text-red-600">{errors.addressLine1}</p>
            )}
          </div>

          {/* Address Line 2 */}
          <div className="space-y-2">
            <Label htmlFor="addressLine2">Address Line 2</Label>
            <Input
              id="addressLine2"
              type="text"
              value={billingAddress.addressLine2}
              onChange={(e) => handleAddressChange("addressLine2", e.target.value)}
              placeholder="Apt 4B (Optional)"
            />
          </div>

          {/* City, State, Postal Code */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">City *</Label>
              <Input
                id="city"
                type="text"
                value={billingAddress.city}
                onChange={(e) => handleAddressChange("city", e.target.value)}
                placeholder="New York"
                className={errors.city ? "border-red-500" : ""}
              />
              {errors.city && (
                <p className="text-xs text-red-600">{errors.city}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="state">State/Province *</Label>
              <Input
                id="state"
                type="text"
                value={billingAddress.state}
                onChange={(e) => handleAddressChange("state", e.target.value)}
                placeholder="NY"
                className={errors.state ? "border-red-500" : ""}
              />
              {errors.state && (
                <p className="text-xs text-red-600">{errors.state}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="postalCode">Postal Code *</Label>
              <Input
                id="postalCode"
                type="text"
                value={billingAddress.postalCode}
                onChange={(e) => handleAddressChange("postalCode", e.target.value)}
                placeholder="10001"
                className={errors.postalCode ? "border-red-500" : ""}
              />
              {errors.postalCode && (
                <p className="text-xs text-red-600">{errors.postalCode}</p>
              )}
            </div>
          </div>

          {/* Country */}
          <div className="space-y-2">
            <Label htmlFor="country">Country *</Label>
            <Input
              id="country"
              type="text"
              value={billingAddress.country}
              onChange={(e) => handleAddressChange("country", e.target.value)}
              placeholder="United States"
              className={errors.country ? "border-red-500" : ""}
            />
            {errors.country && (
              <p className="text-xs text-red-600">{errors.country}</p>
            )}
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={loading}
        className="w-full bg-[#3754ED] hover:bg-[#2942D1] text-white rounded-full px-6 py-3 h-auto text-base font-semibold flex items-center justify-center gap-2"
      >
        <Lock className="w-5 h-5" />
        {loading ? "Processing..." : "Complete Payment"}
      </Button>

      {/* Security Notice */}
      <div className="text-center text-xs text-[#3A478A]">
        <p>Your payment information is secure and encrypted</p>
      </div>
    </form>
  );
}
