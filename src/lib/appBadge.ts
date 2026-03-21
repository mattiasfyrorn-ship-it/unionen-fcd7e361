export async function updateAppBadge(count: number): Promise<void> {
  try {
    if ('setAppBadge' in navigator) {
      if (count > 0) {
        await (navigator as any).setAppBadge(count);
      } else {
        await (navigator as any).clearAppBadge();
      }
    }
  } catch (e) {
    console.warn('[Badge] Failed to update badge:', e);
  }
}

export async function clearAppBadge(): Promise<void> {
  await updateAppBadge(0);
}
