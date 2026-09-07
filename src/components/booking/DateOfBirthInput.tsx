"use client";

import { Input } from "@/components/ui/input";
import { useState } from "react";

function isoToDisplay(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
}

function displayToIso(value: string) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) return null;
  const candidate = `${match[3]}-${match[2]}-${match[1]}`;
  const date = new Date(`${candidate}T00:00:00`);
  if (Number.isNaN(date.getTime()) || date.getFullYear() !== Number(match[3]) || date.getMonth() + 1 !== Number(match[2]) || date.getDate() !== Number(match[1])) return null;
  return candidate;
}

function maskDate(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export function DateOfBirthInput({ id, value, onChange, disabled, className }: {
  id?: string;
  value: string;
  onChange: (isoValue: string) => void;
  disabled?: boolean;
  className?: string;
}) {
  const [displayValue, setDisplayValue] = useState(() => isoToDisplay(value));

  return (
    <Input
      id={id}
      type="text"
      inputMode="numeric"
      autoComplete="bday"
      placeholder="DD/MM/YYYY"
      value={displayValue}
      onChange={(event) => {
        const next = maskDate(event.target.value);
        setDisplayValue(next);
        const iso = displayToIso(next);
        if (iso) onChange(iso);
        else onChange("");
      }}
      aria-label="Date of birth in day, month, year format"
      className={className}
      disabled={disabled}
    />
  );
}
