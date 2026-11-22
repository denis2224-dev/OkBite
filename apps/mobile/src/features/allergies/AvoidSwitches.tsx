import type { AvoidKey } from '@okbite/shared';
import { ro } from '../../copy/ro';
import { ToggleRow } from '../../ui/ToggleRow';

export const AVOID_KEYS: readonly AvoidKey[] = ['added_sugar', 'sweeteners', 'ultra_processed', 'colourings', 'palm_oil'];

type Props = { selected: readonly AvoidKey[]; disabled: boolean; onToggle: (key: AvoidKey) => unknown };

/** "Avoid" preferences as label + switch rows with dividers; the caller draws the card. */
export function AvoidSwitches({ selected, disabled, onToggle }: Props) {
  return <>
    {AVOID_KEYS.map((key, index) => <ToggleRow key={key} label={ro.profile[key]} on={selected.includes(key)} disabled={disabled} first={index === 0} onToggle={() => onToggle(key)} />)}
  </>;
}
