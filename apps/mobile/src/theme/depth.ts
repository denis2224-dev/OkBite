import { light } from './tokens';

/** Soft depth ("Moss"): light from the top left. Raised = a dark shade bottom-right plus a light lift top-left; pressed = the same, inset. */
const shade = 'rgba(166,160,142,0.38)';
const lift = 'rgba(255,255,255,0.95)';
export const depth = {
  /** Cards, the bottom nav, sheets, toasts. */
  raised: { boxShadow: `7px 7px 16px ${shade}, -6px -6px 14px ${lift}` },
  /** Chips, secondary buttons, small tiles. */
  raisedSmall: { boxShadow: `4px 4px 9px ${shade}, -4px -4px 9px ${lift}` },
  /** A selected chip, the current tab or a pressed secondary button: cream, pushed in. */
  pressed: { backgroundColor: light.cream, boxShadow: 'inset 3px 3px 6px rgba(166,160,142,0.35), inset -3px -3px 6px rgba(255,255,255,0.9)' },
  /** Wells: the camera frame, switch tracks, inputs. */
  well: { boxShadow: `inset 2px 2px 5px ${shade}, inset -2px -2px 5px ${lift}` },
  /** Raised on the dark camera view: a deeper shade only, no white lift (a white lift reads as a halo on dark). */
  raisedOnDark: { boxShadow: '4px 6px 14px rgba(0,0,0,0.45)' },
  /** The forest primary surface: buttons, the score tag, the scan button. */
  forest: {
    backgroundColor: light.primary,
    experimental_backgroundImage: `linear-gradient(160deg, ${light.primaryLight}, ${light.primary})`,
    boxShadow: `5px 6px 14px rgba(30,91,62,0.35), -4px -4px 10px ${lift}, inset 0px 1px 0px rgba(255,255,255,0.18)`,
  },
  /** Forest on the dark camera view: the gradient without the white lift. */
  forestOnDark: {
    backgroundColor: light.primary,
    experimental_backgroundImage: `linear-gradient(160deg, ${light.primaryLight}, ${light.primary})`,
    boxShadow: '4px 6px 14px rgba(0,0,0,0.45), inset 0px 1px 0px rgba(255,255,255,0.18)',
  },
  forestPressed: { backgroundColor: light.primaryPressed, boxShadow: 'inset 3px 3px 7px rgba(0,0,0,0.25)' },
  /** Sage icon tiles (settings, about, back). */
  sageTile: {
    backgroundColor: light.sageSoft,
    experimental_backgroundImage: `linear-gradient(145deg, #DCEFE2, ${light.sage})`,
    boxShadow: `3px 3px 7px rgba(140,170,150,0.45), -3px -3px 7px ${lift}`,
  },
} as const;
