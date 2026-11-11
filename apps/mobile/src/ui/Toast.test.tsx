import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { ToastProvider, useToast } from './Toast';

import { SafeAreaProvider } from 'react-native-safe-area-context';

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, right: 0, bottom: 34, left: 0 } };

function Trigger({ action }: { action?: () => void }) {
  const toast = useToast();
  useEffect(() => { toast('Șters', action ? { label: 'Anulează', onPress: action } : undefined); }, [toast, action]);
  return null;
}

it('sits above the navigation bar and the home indicator', async () => {
  await render(<SafeAreaProvider initialMetrics={metrics}><ToastProvider><Trigger /></ToastProvider></SafeAreaProvider>);
  const toast = screen.getByTestId('toast');
  expect(StyleSheet.flatten(toast.props.style).bottom).toBe(84 + 34);
});

it('shows its action as a full-size button that dismisses the toast', async () => {
  const undo = jest.fn();
  await render(<ToastProvider><Trigger action={undo} /></ToastProvider>);
  const button = screen.getByRole('button', { name: 'Anulează' });
  expect(StyleSheet.flatten(button.props.style).minHeight).toBeGreaterThanOrEqual(44);
  await fireEvent.press(button);
  expect(undo).toHaveBeenCalledTimes(1);
  expect(screen.queryByTestId('toast')).toBeNull();
});

it('still renders above the navigation bar outside a safe-area provider', async () => {
  await render(<ToastProvider><Trigger /></ToastProvider>);
  expect(StyleSheet.flatten(screen.getByTestId('toast').props.style).bottom).toBe(84);
});
