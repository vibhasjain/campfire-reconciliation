# Komo attribution

Adapted from [tjcages/komo](https://github.com/tjcages/komo), licensed under MIT.
The accompanying LICENSE preserves attribution to Lué Studio and tjcages.

This React port adapts Komo's identity, anchor and thread types, stable pin-stack
grouping, damped card-motion spring, and its comment interaction model: anchored
thread cards, participant stacks, hover reactions, resolve/undo, compact Enter-to-
send composers, and the searchable Open/Resolved comments inbox.

Anchors refer to reconciliation item IDs; messages live in Campfire's engine
chats. All rendering uses Campfire's React components and design tokens. Komo's
DOM renderer, styling, authentication and network transport are not included.
