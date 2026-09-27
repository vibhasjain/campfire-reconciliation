import { createCn } from "cn/config"

// Teach the class merger our custom utilities (src/index.css) so they aren't dropped as "conflicting" colors.
export const cn = createCn({
  extend: {
    classGroups: {
      "font-size": [{ text: ["xxs", "xs-medium"] }],
      "border-w": [{ border: ["hair"] }],
      "border-w-t": [{ "border-t": ["hair"] }],
      "border-w-b": [{ "border-b": ["hair"] }],
      "border-w-l": [{ "border-l": ["hair"] }],
      "border-w-r": [{ "border-r": ["hair"] }],
      shadow: [{ shadow: ["menu", "dialog", "composer", "button", "button-lg", "ring"] }],
    },
  },
})
