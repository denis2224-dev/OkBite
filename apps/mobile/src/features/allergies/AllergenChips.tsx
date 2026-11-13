import { View } from 'react-native';
import { ALLERGENS, type Allergen } from '@okbite/shared';
import { ro } from '../../copy/ro';
import { ToggleChip } from './ToggleChip';

type Props = { selected: readonly Allergen[]; disabled: boolean; onToggle: (allergen: Allergen) => unknown };

/** The 14 regulated allergens as wrapping toggle chips. */
export function AllergenChips({ selected, disabled, onToggle }: Props) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {ALLERGENS.map((allergen) => (
        <ToggleChip
          key={allergen}
          text={ro.allergens[allergen]}
          selected={selected.includes(allergen)}
          disabled={disabled}
          onPress={() => onToggle(allergen)}
        />
      ))}
    </View>
  );
}
