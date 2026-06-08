export type AuthField = "email" | "password" | "displayName" | "username";

export type AuthFieldErrors = Partial<Record<AuthField, string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email: string): string | undefined {
  const trimmed = email.trim();
  if (!trimmed) return "Email is required.";
  if (!EMAIL_PATTERN.test(trimmed)) return "Enter a valid email address.";
  return undefined;
}

export function validatePassword(
  password: string,
  mode: "login" | "signup",
): string | undefined {
  if (!password) return "Password is required.";
  if (password.length < 6) return "Password must be at least 6 characters.";
  if (mode === "signup" && password.length > 72) {
    return "Password must be 72 characters or fewer.";
  }
  return undefined;
}

export function validateDisplayName(displayName: string): string | undefined {
  const trimmed = displayName.trim();
  if (!trimmed) return "Display name is required.";
  if (trimmed.length < 2) return "Display name must be at least 2 characters.";
  if (trimmed.length > 50) return "Display name must be 50 characters or fewer.";
  return undefined;
}

export function validateUsername(username: string): string | undefined {
  const trimmed = username.trim();
  if (!trimmed) return "Username is required.";
  if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
    return "Username can only contain letters, numbers, and underscores.";
  }
  if (trimmed.length < 3) return "Username must be at least 3 characters.";
  if (trimmed.length > 24) return "Username must be 24 characters or fewer.";
  return undefined;
}

export function cleanUsername(username: string): string {
  return username.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
}

export function validateAuthForm(
  mode: "login" | "signup",
  values: {
    email: string;
    password: string;
    displayName: string;
    username: string;
  },
): AuthFieldErrors {
  const errors: AuthFieldErrors = {};

  const emailError = validateEmail(values.email);
  if (emailError) errors.email = emailError;

  const passwordError = validatePassword(values.password, mode);
  if (passwordError) errors.password = passwordError;

  if (mode === "signup") {
    const displayNameError = validateDisplayName(values.displayName);
    if (displayNameError) errors.displayName = displayNameError;

    const usernameError = validateUsername(values.username);
    if (usernameError) errors.username = usernameError;
  }

  return errors;
}
