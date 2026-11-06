import { fireEvent } from '@testing-library/react-native';
import { renderRouter, screen } from 'expo-router/testing-library';
import { Text } from 'react-native';
import Home from '../(tabs)/index';

jest.mock('../../src/lib/preview', () => ({ isPreview: true }));
jest.mock('../../src/features/history/store', () => ({ listHistory: jest.fn().mockResolvedValue([]) }));

it('opens the real capture route from the demo home', async () => {
  await renderRouter({ index: Home, capture: () => <Text>Test captură</Text>, scan: () => <Text>Test scanare</Text> });
  await fireEvent.press(screen.getByRole('button', { name: 'Fotografiază produsul' }));
  expect(screen).toHavePathname('/capture');
});
it('opens the real scan route from the demo home', async () => {
  await renderRouter({ index: Home, capture: () => <Text>Test captură</Text>, scan: () => <Text>Test scanare</Text> });
  await fireEvent.press(screen.getByRole('button', { name: 'Scanează codul de bare' }));
  expect(screen).toHavePathname('/scan');
});
