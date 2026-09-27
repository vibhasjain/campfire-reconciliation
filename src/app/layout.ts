// Shared dimensions for the Campfire shell and reusable primitives.
export const LAYOUT = {
  pageHeader: 56,
  toolbar: 42,
  tableHeader: 47,
  tableRow: 44,
  listRow: 44,
  sidebarRow: 36,
  sidebar: { default: 250, min: 220, max: 300, step: 16 },
  halfSheet: { min: 480, max: 1100 },
  detailPanel: 404,
  composerMaxW: 740,
  dialog: 540,
  dialogWide: 664,
  desktopMin: 1024,
} as const

export const STORAGE = {
  sidebarWidth: "campfire:sidebar-width",
  halfSheetWidth: "campfire:half-sheet-width",
  theme: "campfire:theme",
} as const
