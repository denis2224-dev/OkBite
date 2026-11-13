import React, { useState } from 'react';
import { describe, it, expect, jest } from '@jest/globals';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { ManualCode } from './ManualCode';
import { ro } from '../../copy/ro';

function Harness({ onSubmit, disabled }: { onSubmit: (code: string) => void; disabled?: boolean }) {
  const [open, setOpen] = useState(true);
  return <ManualCode open={open} onToggle={() => setOpen(o => !o)} onSubmit={onSubmit} disabled={disabled} />;
}
async function typeAndSearch(text: string) {
  await fireEvent.changeText(screen.getByLabelText(ro.scan.manualTitle), text);
  await fireEvent.press(screen.getByRole('button', { name: ro.scan.search }));
}

describe('ManualCode', () => {
  it('is one quiet "Introdu codul" row until opened, then expands the field in place', async () => {
    const onToggle = jest.fn();
    const view = await render(<ManualCode open={false} onToggle={onToggle} onSubmit={jest.fn()} />);
    const row = screen.getByRole('button', { name: ro.scan.manual });
    expect(row.props.accessibilityState).toEqual(expect.objectContaining({ expanded: false }));
    expect(screen.queryByLabelText(ro.scan.manualTitle)).toBeNull();
    expect(screen.queryByText(ro.scan.manualTitle)).toBeNull();
    await fireEvent.press(row);
    expect(onToggle).toHaveBeenCalledTimes(1);
    await view.rerender(<ManualCode open onToggle={onToggle} onSubmit={jest.fn()} />);
    expect(screen.getByRole('button', { name: ro.scan.manual }).props.accessibilityState).toEqual(expect.objectContaining({ expanded: true }));
    const input = screen.getByLabelText(ro.scan.manualTitle);
    expect(input.props.placeholder).toBe('8 sau 13 cifre');
    expect(screen.queryByText('Cifrele de sub codul de bare: 8 sau 13.')).toBeNull();
  });

  it.each([['bad checksum', '4840001000017'], ['too short', '12345'], ['letters', 'abc']])('shows ro.scan.manualInvalid and does not submit: %s', async (_name, text) => {
    const onSubmit = jest.fn();
    await render(<Harness onSubmit={onSubmit} />);
    await typeAndSearch(text);
    expect(screen.getByText('Codul are 8 sau 13 cifre.')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('asks for the digits when the field is empty', async () => {
    const onSubmit = jest.fn();
    await render(<Harness onSubmit={onSubmit} />);
    await fireEvent.press(screen.getByRole('button', { name: ro.scan.search }));
    expect(screen.getByText(ro.scan.manualEmpty)).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it.each([['EAN-13', '4840001000014', '4840001000014'], ['EAN-8', '96385074', '96385074'], ['UPC-A', '036000291452', '0036000291452']])('submits a normalised %s', async (_name, text, expected) => {
    const onSubmit = jest.fn();
    await render(<Harness onSubmit={onSubmit} />);
    await typeAndSearch(text);
    expect(onSubmit).toHaveBeenCalledWith(expected);
  });

  it('clears the error when the user edits the code', async () => {
    await render(<Harness onSubmit={jest.fn()} />);
    await typeAndSearch('123');
    await fireEvent.changeText(screen.getByLabelText(ro.scan.manualTitle), '4840001000014');
    expect(screen.queryByText(ro.scan.manualInvalid)).toBeNull();
  });

  it('does not submit while disabled', async () => {
    const onSubmit = jest.fn();
    await render(<Harness onSubmit={onSubmit} disabled />);
    await typeAndSearch('4840001000014');
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
