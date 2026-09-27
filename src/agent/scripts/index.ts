import type { Script } from '../types'

/** Neutral fallback until the reconciliation lanes supply their demo scripts. */
export const SCRIPTS: Script[] = [{
  id: 'fallback',
  match: () => 1,
  run: async (ctx) => { await ctx.say('Ember is ready to help with this reconciliation.') },
}]
