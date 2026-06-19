export function validateDateOfBirth(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const d = new Date(`${trimmed}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "Enter a valid date.";

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (d > today) return "Birthday cannot be in the future.";

  const minAge = new Date(today);
  minAge.setFullYear(minAge.getFullYear() - 13);
  if (d > minAge) return "You must be at least 13 years old to use Zumelia.";

  const maxAge = new Date(today);
  maxAge.setFullYear(maxAge.getFullYear() - 120);
  if (d < maxAge) return "Enter a valid birth year.";

  return undefined;
}

export function isBirthdayToday(date: string | null): boolean {
  if (!date) return false;
  const d = new Date(`${date}T00:00:00`);
  const today = new Date();
  return (
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  );
}

export function formatBirthdayShort(date: string | null): string | null {
  if (!date) return null;
  return new Date(`${date}T00:00:00`).toLocaleDateString([], {
    month: "long",
    day: "numeric",
  });
}

export function maxBirthdayInputValue(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 13);
  return d.toISOString().slice(0, 10);
}

export function minBirthdayInputValue(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 120);
  return d.toISOString().slice(0, 10);
}
