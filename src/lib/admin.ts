export const ADMIN_EMAILS = [
  "jeanmichel@allianz-nogaro.fr",
  "julien.boetti@allianz-nogaro.fr",
];

export function isAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}
