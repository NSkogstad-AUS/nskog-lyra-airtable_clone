export const getToolbarMenuPosition = (
  trigger: HTMLElement | null,
  menu: HTMLElement | null,
  fallbackWidth: number,
) => {
  if (!trigger) return null;
  const rect = trigger.getBoundingClientRect();
  const gap = 12;
  const viewportWidth = window.innerWidth;
  const maxWidth = Math.max(0, viewportWidth - gap * 2);
  const measuredWidth = menu?.getBoundingClientRect().width ?? 0;
  const resolvedWidth = measuredWidth > 0 ? measuredWidth : fallbackWidth;
  const menuWidth = Math.min(resolvedWidth, maxWidth);
  let left = rect.right - menuWidth;
  left = Math.max(gap, Math.min(left, viewportWidth - menuWidth - gap));
  const top = rect.bottom + 6;
  return { top, left };
};
