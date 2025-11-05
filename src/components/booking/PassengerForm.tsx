"use client";

import { useState } from "react";
import { Passenger, PassengerFormErrors } from "@/types/booking";
import { validatePassenger, hasErrors } from "@/utils/validation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PassengerFormProps {
  passengerIndex: number;
  initialData?: Partial<Passenger>;
  onSave: (passenger: Passenger) => void;
  onCancel?: () => void;
  showPassportFields?: boolean;
}

export function PassengerForm({
  passengerIndex,
  initialData,
  onSave,
  onCancel,
  showPassportFields = false,
}: PassengerFormProps) {
  const [formData, setFormData] = useState<Partial<Passenger>>({
    title: initialData?.title || "Mr",
    firstName: initialData?.firstName || "",
    lastName: initialData?.lastName || "",
    dateOfBirth: initialData?.dateOfBirth || "",
    email: initialData?.email || "",
    phone: initialData?.phone || "",
    passportNumber: initialData?.passportNumber || "",
    passportExpiry: initialData?.passportExpiry || "",
    nationality: initialData?.nationality || "",
  });

  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  const handleChange = (field: keyof Passenger, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form data
    const validationErrors = validatePassenger(formData as Passenger);

    if (hasErrors(validationErrors)) {
      setErrors(validationErrors as Record<string, string | undefined>);
      return;
    }

    // Save passenger data
    onSave(formData as Passenger);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white border border-[#DFE0E4] rounded-xl p-6">
        <h3 className="text-lg font-semibold text-[#010D50] mb-4">
          Passenger {passengerIndex + 1}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor={`title-${passengerIndex}`}>Title *</Label>
            <Select
              value={formData.title}
              onValueChange={(value) => handleChange("title", value)}
            >
              <SelectTrigger id={`title-${passengerIndex}`}>
                <SelectValue placeholder="Select title" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Mr">Mr</SelectItem>
                <SelectItem value="Mrs">Mrs</SelectItem>
                <SelectItem value="Miss">Miss</SelectItem>
                <SelectItem value="Ms">Ms</SelectItem>
                <SelectItem value="Dr">Dr</SelectItem>
              </SelectContent>
            </Select>
            {errors.title && (
              <p className="text-xs text-red-600">{errors.title}</p>
            )}
          </div>

          {/* First Name */}
          <div className="space-y-2">
            <Label htmlFor={`firstName-${passengerIndex}`}>First Name *</Label>
            <Input
              id={`firstName-${passengerIndex}`}
              type="text"
              value={formData.firstName}
              onChange={(e) => handleChange("firstName", e.target.value)}
              placeholder="Enter first name"
              className={errors.firstName ? "border-red-500" : ""}
            />
            {errors.firstName && (
              <p className="text-xs text-red-600">{errors.firstName}</p>
            )}
          </div>

          {/* Last Name */}
          <div className="space-y-2">
            <Label htmlFor={`lastName-${passengerIndex}`}>Last Name *</Label>
            <Input
              id={`lastName-${passengerIndex}`}
              type="text"
              value={formData.lastName}
              onChange={(e) => handleChange("lastName", e.target.value)}
              placeholder="Enter last name"
              className={errors.lastName ? "border-red-500" : ""}
            />
            {errors.lastName && (
              <p className="text-xs text-red-600">{errors.lastName}</p>
            )}
          </div>

          {/* Date of Birth */}
          <div className="space-y-2">
            <Label htmlFor={`dob-${passengerIndex}`}>Date of Birth *</Label>
            <Input
              id={`dob-${passengerIndex}`}
              type="date"
              value={formData.dateOfBirth}
              onChange={(e) => handleChange("dateOfBirth", e.target.value)}
              className={errors.dateOfBirth ? "border-red-500" : ""}
            />
            {errors.dateOfBirth && (
              <p className="text-xs text-red-600">{errors.dateOfBirth}</p>
            )}
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor={`email-${passengerIndex}`}>Email *</Label>
            <Input
              id={`email-${passengerIndex}`}
              type="email"
              value={formData.email}
              onChange={(e) => handleChange("email", e.target.value)}
              placeholder="email@example.com"
              className={errors.email ? "border-red-500" : ""}
            />
            {errors.email && (
              <p className="text-xs text-red-600">{errors.email}</p>
            )}
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor={`phone-${passengerIndex}`}>Phone *</Label>
            <Input
              id={`phone-${passengerIndex}`}
              type="tel"
              value={formData.phone}
              onChange={(e) => handleChange("phone", e.target.value)}
              placeholder="+1234567890"
              className={errors.phone ? "border-red-500" : ""}
            />
            {errors.phone && (
              <p className="text-xs text-red-600">{errors.phone}</p>
            )}
          </div>
        </div>

        {/* Passport Fields (Optional) */}
        {showPassportFields && (
          <div className="mt-6 pt-6 border-t border-[#DFE0E4]">
            <h4 className="text-md font-semibold text-[#010D50] mb-4">
              Passport Information (Optional)
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Passport Number */}
              <div className="space-y-2">
                <Label htmlFor={`passport-${passengerIndex}`}>
                  Passport Number
                </Label>
                <Input
                  id={`passport-${passengerIndex}`}
                  type="text"
                  value={formData.passportNumber}
                  onChange={(e) =>
                    handleChange("passportNumber", e.target.value)
                  }
                  placeholder="A1234567"
                  className={errors.passportNumber ? "border-red-500" : ""}
                />
                {errors.passportNumber && (
                  <p className="text-xs text-red-600">
                    {errors.passportNumber}
                  </p>
                )}
              </div>

              {/* Passport Expiry */}
              <div className="space-y-2">
                <Label htmlFor={`passportExpiry-${passengerIndex}`}>
                  Passport Expiry
                </Label>
                <Input
                  id={`passportExpiry-${passengerIndex}`}
                  type="date"
                  value={formData.passportExpiry}
                  onChange={(e) =>
                    handleChange("passportExpiry", e.target.value)
                  }
                  className={errors.passportExpiry ? "border-red-500" : ""}
                />
                {errors.passportExpiry && (
                  <p className="text-xs text-red-600">
                    {errors.passportExpiry}
                  </p>
                )}
              </div>

              {/* Nationality */}
              <div className="space-y-2">
                <Label htmlFor={`nationality-${passengerIndex}`}>
                  Nationality
                </Label>
                <Input
                  id={`nationality-${passengerIndex}`}
                  type="text"
                  value={formData.nationality}
                  onChange={(e) => handleChange("nationality", e.target.value)}
                  placeholder="United States"
                  className={errors.nationality ? "border-red-500" : ""}
                />
                {errors.nationality && (
                  <p className="text-xs text-red-600">{errors.nationality}</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="rounded-full px-6 py-2 h-auto text-sm font-medium"
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          className="bg-[#3754ED] hover:bg-[#2942D1] text-white rounded-full px-6 py-2 h-auto text-sm font-medium"
        >
          Save Passenger
        </Button>
      </div>
    </form>
  );
}
