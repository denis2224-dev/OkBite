import React from 'react';
import { ro } from '../../copy/ro';
import { Card } from '../../ui/Card';
import { Heading } from '../../ui/Typography';
import { ActionButton } from '../capture/StatusPanel';

type Mode = 'separate' | 'same_photo' | 'none' | 'skipped';
export function GuidedNutritionQuestion({ onChoose, disabled = false }: {
  onChoose: (mode: Mode) => void; disabled?: boolean;
}) {
  return <Card>
    <Heading style={{ fontSize: 22, lineHeight: 28 }}>{ro.add.nutritionQuestion}</Heading>
    {([
      ['separate', ro.add.nutritionYes], ['same_photo', ro.add.nutritionSame],
      ['none', ro.add.nutritionNone], ['skipped', ro.add.nutritionSkip],
    ] as const).map(([mode, label]) => (
      <ActionButton
        key={mode}
        label={label}
        variant={mode === 'separate' ? 'primary' : 'secondary'}
        disabled={disabled}
        onPress={() => onChoose(mode)}
      />
    ))}
  </Card>;
}
