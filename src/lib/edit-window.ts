/** How long after sending a post or text message the author may still edit it. */
export const EDIT_WINDOW_MS = 5 * 60 * 1000;

export function canEditWithinWindow(createdAt: string): boolean {
  return Date.now() - new Date(createdAt).getTime() <= EDIT_WINDOW_MS;
}
