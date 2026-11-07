import { StyleSheet } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Icon } from './Icon';
import { ScoreRing } from './ScoreRing';
import { Screen } from './Screen';
import { ro } from '../copy/ro';

const mockSvgProps: Record<string, unknown>[] = [];
jest.mock('react-native-svg', () => {
  const actual = jest.requireActual('react-native-svg');
  const { forwardRef } = jest.requireActual('react');
  return {
    ...actual,
    __esModule: true,
    default: forwardRef((props: Record<string, unknown>, ref: unknown) => {
      mockSvgProps.push(props);
      return actual.default.render ? actual.default.render(props, ref) : <actual.default {...props} />;
    }),
  };
});
jest.mock('expo-router', () => ({ router: { canGoBack: () => false, back: jest.fn(), replace: jest.fn() } }));

beforeEach(() => { mockSvgProps.length = 0; });
it('keeps the native-only accessible prop off the SVG element (audit R4-02)', async () => {
  await render(<><Icon name="back" /><ScoreRing score={50} grade="good" /></>);
  expect(mockSvgProps.length).toBe(2);
  for (const props of mockSvgProps) expect(props).not.toHaveProperty('accessible');
});
it('gives the Back button at least a 44 by 44 touch target (audit R4-03)', async () => {
  await render(<SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 800 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }}><Screen title="T" back /></SafeAreaProvider>);
  const style = StyleSheet.flatten(screen.getByLabelText(ro.app.back).props.style);
  expect(style.minWidth).toBeGreaterThanOrEqual(44);
  expect(style.minHeight).toBeGreaterThanOrEqual(44);
});
