import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { emptyWaterProfile } from '@okbite/shared';
import { ro } from '../../copy/ro';
import { WaterFields } from './WaterFields';

describe('WaterFields', () => {
  it('renders preserved min-max ranges and explicit zero without collapsing them', async () => {
    const profile = {
      ...emptyWaterProfile(),
      tdsMgL: 375,
      no3MgL: 0,
      ranges: { tdsMgL: { min: 350, max: 400 } },
    };
    const onChange = jest.fn();
    await render(<WaterFields value={profile} onChange={onChange} />);

    expect(screen.getByTestId('water-tdsMgL').props.value).toBe('350-400');
    expect(screen.getByTestId('water-no3MgL').props.value).toBe('0');
  });

  it('stores both midpoint and interval range when user enters 350-400 and preserves explicit 0', async () => {
    const onChange = jest.fn();
    const view = await render(<WaterFields value={emptyWaterProfile()} onChange={onChange} />);

    await fireEvent.changeText(screen.getByTestId('water-tdsMgL'), '350-400');
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({
      tdsMgL: 375,
      ranges: { tdsMgL: { min: 350, max: 400 } },
    }));

    const withRange = {
      ...emptyWaterProfile(),
      tdsMgL: 375,
      ranges: { tdsMgL: { min: 350, max: 400 } },
    };
    await view.rerender(<WaterFields value={withRange} onChange={onChange} />);
    await fireEvent.changeText(screen.getByTestId('water-tdsMgL'), '380');
    const lastCall = onChange.mock.calls.at(-1)?.[0];
    expect(lastCall.tdsMgL).toBe(380);
    expect(lastCall.ranges?.tdsMgL).toBeUndefined();

    await fireEvent.press(screen.getByRole('button', { name: ro.result.water.traceToggle }));
    await fireEvent.changeText(screen.getByTestId('water-no3MgL'), '0');
    const zeroCall = onChange.mock.calls.at(-1)?.[0];
    expect(zeroCall.no3MgL).toBe(0);
    expect(zeroCall.ranges?.no3MgL).toBeUndefined();
  });
});
