import { PHONE_COUNTRIES } from "./phone-countries";

/** Every country (from the phone dial-code list) plus a "Global" option. */
export const COUNTRIES: string[] = [
  ...PHONE_COUNTRIES.map((c) => c.name),
  "Global",
];
