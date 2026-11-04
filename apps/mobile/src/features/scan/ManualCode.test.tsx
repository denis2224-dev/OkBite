import React from 'react';
import { describe, it, expect, jest } from '@jest/globals';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { ManualCode } from './ManualCode';
import { ro } from '../../copy/ro';

describe('ManualCode', () => {
  it('shows ro.scan.manualInvalid and does not call onSubmit for invalid codes', () => {
    const onSubmit = jest.fn();
    render(<ManualCode onSubmit={onSubmit} />);
    const input = screen.getByLabelText(ro.scan.manualTitle);
    const submitBtn = screen.getByRole('button', { name: ro.scan.search });
    fireEvent.changeText(input, '4840001000017');
    fireEvent.press(submitBtn);
    expect(screen.getByText(ro.scan.manualInvalid)).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
    fireEvent.changeText(input, '12345');
    fireEvent.press(submitBtn);
    expect(screen.getByText(ro.scan.manualInvalid)).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });
  it('normalises valid EAN-8, EAN-13 and UPC-A codes and calls onSubmit', () => {
    const onSubmit = jest.fn();
    render(<ManualCode onSubmit={onSubmit} />);
    fireEvent.changeText(screen.getByLabelText(ro.scan.manualTitle), '036000291452');
    fireEvent.press(screen.getByRole('button', { name: ro.scan.search }));
    expect(onSubmit).toHaveBeenCalledWith('0036000291452');
  });
});
