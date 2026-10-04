/** Administrator identity is provisioned by the existing configured-password login. */
export function isReservedAdminEmail(email: string): boolean {
  const configured = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  return Boolean(configured && email.trim().toLowerCase() === configured);
}
