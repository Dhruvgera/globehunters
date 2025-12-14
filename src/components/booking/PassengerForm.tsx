"use client";

import { useState, useEffect } from "react";
import { Passenger, PassengerFormErrors } from "@/types/booking";
import { validatePassenger, hasErrors, validateDateOfBirthForType } from "@/utils/validation";
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
import { useTranslations } from "next-intl";

interface PassengerFormProps {
  passengerIndex: number;
  initialData?: Partial<Passenger>;
  onSave: (passenger: Passenger) => void;
  onCancel?: () => void;
  showPassportFields?: boolean;
  disabled?: boolean;
  /** Passenger type for age validation: adult (12+), child (2-11), infant (0-23 months) */
  passengerType?: 'adult' | 'child' | 'infant';
}

export function PassengerForm({
  passengerIndex,
  initialData,
  onSave,
  onCancel,
  showPassportFields = false,
  disabled = false,
  passengerType = 'adult',
}: PassengerFormProps) {
  const t = useTranslations('booking.passengerDetails');
  
  const [formData, setFormData] = useState<Partial<Passenger>>({
    title: initialData?.title || "Mr",
    firstName: initialData?.firstName || "",
    lastName: initialData?.lastName || "",
    dateOfBirth: initialData?.dateOfBirth || "",
    email: initialData?.email || "",
    phone: initialData?.phone || "",
    countryCode: initialData?.countryCode || "+44",
    passportNumber: initialData?.passportNumber || "",
    passportExpiry: initialData?.passportExpiry || "",
    nationality: initialData?.nationality || "",
  });

  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  // Validate date of birth on initial load if pre-populated
  useEffect(() => {
    if (formData.dateOfBirth) {
      const dobValidation = validateDateOfBirthForType(formData.dateOfBirth, passengerType);
      if (!dobValidation.valid) {
        setErrors((prev) => ({ ...prev, dateOfBirth: dobValidation.error }));
      }
    }
  }, [formData.dateOfBirth, passengerType]);

  const handleChange = (field: keyof Passenger, value: string) => {
    const newFormData = { ...formData, [field]: value };
    setFormData(newFormData);
    
    // Real-time validation for date of birth
    if (field === 'dateOfBirth' && value) {
      const dobValidation = validateDateOfBirthForType(value, passengerType);
      if (!dobValidation.valid) {
        setErrors((prev) => ({ ...prev, dateOfBirth: dobValidation.error }));
        return;
      }
    }
    
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
    
    // Auto-save silently when all required fields are filled (no UI lock)
    const requiredFields = ['title', 'firstName', 'lastName', 'dateOfBirth', 'email', 'phone'];
    const allFieldsFilled = requiredFields.every(f => {
      const val = f === field ? value : (formData as any)[f];
      return val && String(val).trim() !== '';
    });
    
    if (allFieldsFilled) {
      // Validate and save to store (but keep form editable)
      const validationErrors = validatePassenger(newFormData as Passenger, passengerType);
      if (!hasErrors(validationErrors)) {
        onSave(newFormData as Passenger);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form data with passenger type for age validation
    const validationErrors = validatePassenger(formData as Passenger, passengerType);
    
    console.log('[PassengerForm] Validation:', {
      passengerType,
      dateOfBirth: formData.dateOfBirth,
      errors: validationErrors,
      hasErrors: hasErrors(validationErrors),
    });

    if (hasErrors(validationErrors)) {
      setErrors(validationErrors as Record<string, string | undefined>);
      return;
    }

    // Save passenger data
    onSave(formData as Passenger);
  };

  const handleEdit = () => {
    onCancel?.();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white border border-[#DFE0E4] rounded-xl p-6">
        <h3 className="text-lg font-semibold text-[#010D50] mb-4">
          {t('passenger')} {passengerIndex + 1}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor={`title-${passengerIndex}`}>{t('titleLabel')} {t('required')}</Label>
            <Select
              value={formData.title}
              onValueChange={(value) => handleChange("title", value)}
              disabled={disabled}
            >
              <SelectTrigger id={`title-${passengerIndex}`}>
                <SelectValue placeholder={t('selectTitle')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Mr">{t('mr')}</SelectItem>
                <SelectItem value="Mrs">{t('mrs')}</SelectItem>
                <SelectItem value="Miss">{t('miss')}</SelectItem>
                <SelectItem value="Ms">{t('ms')}</SelectItem>
                <SelectItem value="Dr">{t('dr')}</SelectItem>
              </SelectContent>
            </Select>
            {errors.title && (
              <p className="text-xs text-red-600">{errors.title}</p>
            )}
          </div>

          {/* First Name */}
          <div className="space-y-2">
            <Label htmlFor={`firstName-${passengerIndex}`}>{t('firstName')} {t('required')}</Label>
            <Input
              id={`firstName-${passengerIndex}`}
              type="text"
              value={formData.firstName}
              onChange={(e) => handleChange("firstName", e.target.value)}
              placeholder={t('firstName')}
              className={errors.firstName ? "border-red-500" : ""}
              disabled={disabled}
            />
            {errors.firstName && (
              <p className="text-xs text-red-600">{errors.firstName}</p>
            )}
          </div>

          {/* Last Name */}
          <div className="space-y-2">
            <Label htmlFor={`lastName-${passengerIndex}`}>{t('lastName')} {t('required')}</Label>
            <Input
              id={`lastName-${passengerIndex}`}
              type="text"
              value={formData.lastName}
              onChange={(e) => handleChange("lastName", e.target.value)}
              placeholder={t('lastName')}
              className={errors.lastName ? "border-red-500" : ""}
              disabled={disabled}
            />
            {errors.lastName && (
              <p className="text-xs text-red-600">{errors.lastName}</p>
            )}
          </div>

          {/* Date of Birth */}
          <div className="space-y-2">
            <Label htmlFor={`dob-${passengerIndex}`}>{t('dateOfBirth')} {t('required')}</Label>
            <Input
              id={`dob-${passengerIndex}`}
              type="date"
              value={formData.dateOfBirth}
              onChange={(e) => handleChange("dateOfBirth", e.target.value)}
              className={errors.dateOfBirth ? "border-red-500" : ""}
              disabled={disabled}
            />
            {errors.dateOfBirth && (
              <p className="text-xs text-red-600">{errors.dateOfBirth}</p>
            )}
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor={`email-${passengerIndex}`}>{t('email')} {t('required')}</Label>
            <Input
              id={`email-${passengerIndex}`}
              type="email"
              value={formData.email}
              onChange={(e) => handleChange("email", e.target.value)}
              placeholder={t('emailPlaceholder')}
              className={errors.email ? "border-red-500" : ""}
              disabled={disabled}
            />
            {errors.email && (
              <p className="text-xs text-red-600">{errors.email}</p>
            )}
          </div>

          {/* Phone with Country Code */}
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor={`phone-${passengerIndex}`}>{t('phone')} {t('required')}</Label>
            <div className="flex gap-2">
              {/* Country Code Selector */}
              <Select
                value={formData.countryCode || "+44"}
                onValueChange={(value) => handleChange("countryCode", value)}
                disabled={disabled}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  <SelectItem value="+44">
                    <span className="flex items-center gap-2">
                      <span className="fi fi-gb w-4 h-3"></span>
                      <span>+44</span>
                    </span>
                  </SelectItem>
                  <SelectItem value="+1">
                    <span className="flex items-center gap-2">
                      <span className="fi fi-us w-4 h-3"></span>
                      <span>+1</span>
                    </span>
                  </SelectItem>
                  <SelectItem value="+91">
                    <span className="flex items-center gap-2">
                      <span className="fi fi-in w-4 h-3"></span>
                      <span>+91</span>
                    </span>
                  </SelectItem>
                  <SelectItem value="+61">
                    <span className="flex items-center gap-2">
                      <span className="fi fi-au w-4 h-3"></span>
                      <span>+61</span>
                    </span>
                  </SelectItem>
                  <SelectItem value="+49">
                    <span className="flex items-center gap-2">
                      <span className="fi fi-de w-4 h-3"></span>
                      <span>+49</span>
                    </span>
                  </SelectItem>
                  <SelectItem value="+33">
                    <span className="flex items-center gap-2">
                      <span className="fi fi-fr w-4 h-3"></span>
                      <span>+33</span>
                    </span>
                  </SelectItem>
                  <SelectItem value="+34">
                    <span className="flex items-center gap-2">
                      <span className="fi fi-es w-4 h-3"></span>
                      <span>+34</span>
                    </span>
                  </SelectItem>
                  <SelectItem value="+39">
                    <span className="flex items-center gap-2">
                      <span className="fi fi-it w-4 h-3"></span>
                      <span>+39</span>
                    </span>
                  </SelectItem>
                  <SelectItem value="+81">
                    <span className="flex items-center gap-2">
                      <span className="fi fi-jp w-4 h-3"></span>
                      <span>+81</span>
                    </span>
                  </SelectItem>
                  <SelectItem value="+86">
                    <span className="flex items-center gap-2">
                      <span className="fi fi-cn w-4 h-3"></span>
                      <span>+86</span>
                    </span>
                  </SelectItem>
                  <SelectItem value="+971">
                    <span className="flex items-center gap-2">
                      <span className="fi fi-ae w-4 h-3"></span>
                      <span>+971</span>
                    </span>
                  </SelectItem>
                  <SelectItem value="+65">
                    <span className="flex items-center gap-2">
                      <span className="fi fi-sg w-4 h-3"></span>
                      <span>+65</span>
                    </span>
                  </SelectItem>
                  <SelectItem value="+27">
                    <span className="flex items-center gap-2">
                      <span className="fi fi-za w-4 h-3"></span>
                      <span>+27</span>
                    </span>
                  </SelectItem>
                  <SelectItem value="+55">
                    <span className="flex items-center gap-2">
                      <span className="fi fi-br w-4 h-3"></span>
                      <span>+55</span>
                    </span>
                  </SelectItem>
                  <SelectItem value="+52">
                    <span className="flex items-center gap-2">
                      <span className="fi fi-mx w-4 h-3"></span>
                      <span>+52</span>
                    </span>
                  </SelectItem>
                  <SelectItem value="+31">
                    <span className="flex items-center gap-2">
                      <span className="fi fi-nl w-4 h-3"></span>
                      <span>+31</span>
                    </span>
                  </SelectItem>
                  <SelectItem value="+46">
                    <span className="flex items-center gap-2">
                      <span className="fi fi-se w-4 h-3"></span>
                      <span>+46</span>
                    </span>
                  </SelectItem>
                  <SelectItem value="+41">
                    <span className="flex items-center gap-2">
                      <span className="fi fi-ch w-4 h-3"></span>
                      <span>+41</span>
                    </span>
                  </SelectItem>
                  <SelectItem value="+64">
                    <span className="flex items-center gap-2">
                      <span className="fi fi-nz w-4 h-3"></span>
                      <span>+64</span>
                    </span>
                  </SelectItem>
                  <SelectItem value="+353">
                    <span className="flex items-center gap-2">
                      <span className="fi fi-ie w-4 h-3"></span>
                      <span>+353</span>
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
              {/* Phone Number Input */}
              <Input
                id={`phone-${passengerIndex}`}
                type="tel"
                value={formData.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
                placeholder={t('phonePlaceholder')}
                className={`flex-1 ${errors.phone ? "border-red-500" : ""}`}
                disabled={disabled}
              />
            </div>
            {errors.phone && (
              <p className="text-xs text-red-600">{errors.phone}</p>
            )}
          </div>
        </div>

        {/* Passport Fields (Optional) */}
        {showPassportFields && (
          <div className="mt-6 pt-6 border-t border-[#DFE0E4]">
            <h4 className="text-md font-semibold text-[#010D50] mb-4">
              {t('passportNumber')} (Optional)
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Passport Number */}
              <div className="space-y-2">
                <Label htmlFor={`passport-${passengerIndex}`}>
                  {t('passportNumber')}
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
                  disabled={disabled}
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
                  {t('passportExpiry')}
                </Label>
                <Input
                  id={`passportExpiry-${passengerIndex}`}
                  type="date"
                  value={formData.passportExpiry}
                  onChange={(e) =>
                    handleChange("passportExpiry", e.target.value)
                  }
                  className={errors.passportExpiry ? "border-red-500" : ""}
                  disabled={disabled}
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
                  {t('nationality')}
                </Label>
                <Input
                  id={`nationality-${passengerIndex}`}
                  type="text"
                  value={formData.nationality}
                  onChange={(e) => handleChange("nationality", e.target.value)}
                  placeholder="United States"
                  className={errors.nationality ? "border-red-500" : ""}
                  disabled={disabled}
                />
                {errors.nationality && (
                  <p className="text-xs text-red-600">{errors.nationality}</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

    </form>
  );
}
