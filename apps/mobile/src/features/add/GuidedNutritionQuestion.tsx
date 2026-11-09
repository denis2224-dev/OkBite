import React from 'react';
import { Text, View } from 'react-native';
import { ro } from '../../copy/ro';
import { useTheme } from '../../theme/useTheme';
import { ActionButton } from '../capture/StatusPanel';

type Mode = 'separate' | 'same_photo' | 'none' | 'skipped';
export function GuidedNutritionQuestion({ onChoose, disabled = false }: {
  onChoose: (mode: Mode) => void; disabled?: boolean;
}) {
  const { colors } = useTheme();
  return <View style={{ gap: 12 }}>
    <Text accessibilityRole="header" style={{ fontSize: 22, color: colors.ink }}>{ro.add.nutritionQuestion}</Text>
    {([
      ['separate', ro.add.nutritionYes], ['same_photo', ro.add.nutritionSame],
      ['none', ro.add.nutritionNone], ['skipped', ro.add.nutritionSkip],
    ] as const).map(([mode, label]) => <ActionButton key={mode} label={label} disabled={disabled} onPress={() => onChoose(mode)} />)}
  </View>;
}
