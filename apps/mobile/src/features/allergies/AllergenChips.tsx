import { View } from 'react-native';
import { ALLERGENS, type Allergen } from '@okbite/shared';
import { ro } from '../../copy/ro';
import { CheckboxChip } from '../../ui/CheckboxChip';

type Props = { selected: readonly Allergen[]; disabled: boolean; onToggle: (allergen: Allergen) => unknown };

/** The 14 regulated allergens as wrapping checkbox chips; selection changes colour only. */
export function AllergenChips({ selected, disabled, onToggle }: Props) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
      {ALLERGENS.map((allergen) => (
        <CheckboxChip key={allergen} text={ro.allergens[allergen]} selected={selected.includes(allergen)} disabled={disabled} onPress={() => onToggle(allergen)} />
      ))}
    </View>
  );
}
