# Transaction half-sheet layout

The row **outer box** is the alignment rule. Header title and item title start
at the row box edge; row icons and text remain inset for readability.

## Ownership and spacing

- `HalfSheetHost` owns one scrollport with `px-sheet-gutter` (20px) around both
  the sticky header and detail body. A classic scrollbar therefore removes the
  same width from both; overlay scrollbars remove none. No descendant sheet
  header or detail wrapper adds another horizontal gutter.
- `HalfSheetHeader` is 44px tall, with centered controls and no vertical padding.
- Detail starts 16px after the header (`sheet-header-gap`). Its sections use
  `gap-sheet-section` (24px): title, grouped lines, suggestion, conversation.
- Title and navigation share `items-center`; title margin is zero. Navigation
  cannot shrink. A one-line title has a 28px line box in a 36px row; wrapping
  grows the row and keeps navigation centered.
- Bank comes before Books. Rows within each group have 4px gaps (`sheet-row`);
  nonempty groups have 12px gaps (`sheet-group`). No empty group adds a gap.
- Conversation uses 16px above its heading and 12px between heading and thread.
- `Button size="icon-sheet"` owns a borderless 36px square, 10px padding, and a
  16px SVG. `edge="end"` cancels the 10px padding with a shared negative end
  margin. Both Close and Next use it; Previous uses the same size without edge.
  Hit targets extend 10px into the 20px gutter. No per-instance offsets.

## Horizontal derivation (CSS pixels, 16px root font size)

Let W be the rounded panel's outer width, b its hairline border (0.5px at DPR2,
1px at DPR1), and S the space consumed by a classic right scrollbar (0 for
an overlay scrollbar). The common content edges are L = b + 20 and
R = W - b - S - 20. The host's external 10px padding is outside this panel.

| Element / layout box | Left x | Right x |
| --- | --- | --- |
| Header title allocation (Close only) | L | R - 46 |
| Close SVG | R - 16 | R |
| Item title allocation | L | R - 74 |
| Navigation group | R - 62 | R |
| Previous SVG | R - 52 | R - 36 |
| Next SVG | R - 16 | R |
| Line row outer box | L | R |
| Line row SVG | L + 8 | L + 24 |

Header reservation: (36 - 10)px Close + 20px header gap = 46px.
Title reservation: (36 + 36 - 10)px navigation + 12px gap = 74px.
Rows have 8px horizontal padding and a 16px icon. Icons here mean their CSS
SVG viewports; Lucide's painted paths have intrinsic whitespace. Text allocation
edges are layout boxes, not the variable ink width of a particular title.

Example: W=470px, b=0.5px, S=0 gives L=20.5px and R=449.5px. Header title:
20.5–403.5; Close: 433.5–449.5; item title: 20.5–375.5; navigation:
387.5–449.5; Previous: 397.5–413.5; Next: 433.5–449.5; row:
20.5–449.5; row icon: 28.5–44.5.

For the two-contractor example, vertical coordinates relative to the inside of
the top border are: header 0–44, title row 60–96 (center 78), first Bank row
120–160, second Bank row 164–204, first Books row 216–256, second Books row
260–300. Wrapped content can increase row heights; the gaps remain fixed.

## Reuse audit

v1 is the transaction HalfSheetHost consumer. v2 renders its own paired inline
ledger detail, with separate Books/Bank columns and its own suggestion controls;
it does not use this header or LineRow. v3 renders a focus card, reusing LineRow
but not HalfSheetHost. Its stacked Bank/Books groups now use the same 4px/12px
gap tokens. LineRow's defaults and the unrelated suggestion controls are unchanged.

Validation is source/CSS derivation plus TypeScript, lint, and reconciliation
flow checks. No browser measurements are claimed.
