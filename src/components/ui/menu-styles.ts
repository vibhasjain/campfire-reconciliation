// Shared menu / popover classes (spec §4.4–4.5). Menus: 150ms fade + scale .98 + 4px slide.
export const menuMotion =
  "duration-150 data-[side=bottom]:slide-in-from-top-1 data-[side=left]:slide-in-from-right-1 data-[side=right]:slide-in-from-left-1 data-[side=top]:slide-in-from-bottom-1 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-98 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-98"
export const popoverMotion =
  "duration-150 data-[side=bottom]:slide-in-from-top-1 data-[side=left]:slide-in-from-right-1 data-[side=right]:slide-in-from-left-1 data-[side=top]:slide-in-from-bottom-1 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
export const menuContent = `z-50 min-w-[200px] overflow-x-hidden overflow-y-auto rounded-lg bg-surface p-1 text-fg-2 shadow-menu outline-none ${menuMotion}`
export const menuItem =
  "group/menu-item relative flex h-7 cursor-default items-center gap-2 rounded-md px-2 py-1 text-sm text-fg-2 outline-hidden select-none focus:bg-fill-hover focus:text-fg data-highlighted:bg-fill-hover data-highlighted:text-fg data-disabled:pointer-events-none data-disabled:text-fg-disabled data-inset:pl-8 data-[variant=destructive]:text-danger data-[variant=destructive]:focus:bg-fill-selected data-[variant=destructive]:focus:text-danger [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-fg-3 data-[variant=destructive]:[&_svg]:text-danger"
export const menuLabel = "px-2 py-1 text-xs text-fg-4"
export const menuSeparator = "-mx-1 my-1 h-px bg-line-subtle"
