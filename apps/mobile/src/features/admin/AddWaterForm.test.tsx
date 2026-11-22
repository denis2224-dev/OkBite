import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { AddWaterForm } from './AddWaterForm';
import { ro } from '../../copy/ro';

it('requires brand, name, quantity and source before saving', async () => {
  const save = jest.fn();
  await render(<AddWaterForm onSave={save} />);
  await fireEvent.press(screen.getByText(ro.app.admin.saveWater));
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(ro.app.admin.invalid));
  expect(save).not.toHaveBeenCalled();
});

it('rejects a barcode with an invalid check digit before saving', async () => {
  const save = jest.fn();
  await render(<AddWaterForm onSave={save} />);
  await fireEvent.changeText(screen.getByLabelText(ro.review.brand), 'OM');
  await fireEvent.changeText(screen.getByLabelText(ro.review.name), 'Apă plată');
  await fireEvent.changeText(screen.getByLabelText(ro.review.quantity), '1,5 L');
  await fireEvent.changeText(screen.getByLabelText(ro.app.admin.waterSource), 'apaom.md');
  await fireEvent.changeText(screen.getByLabelText(ro.scan.manualLabel), '4840001000015');
  await fireEvent.press(screen.getByText(ro.app.admin.saveWater));
  await waitFor(() =>
    expect(screen.getByRole('alert')).toHaveTextContent(ro.scan.manualChecksum),
  );
  expect(save).not.toHaveBeenCalled();
});

it('updates live score preview as minerals are entered and submits ranges and classification', async () => {
  const save = jest.fn().mockResolvedValue(undefined);
  await render(<AddWaterForm onSave={save} />);

  expect(screen.getByTestId('water-score-preview')).toHaveTextContent(
    new RegExp(ro.result.scoreUnavailable),
  );

  await fireEvent.changeText(screen.getByLabelText(ro.review.brand), '  OM  ');
  await fireEvent.changeText(screen.getByLabelText(ro.review.name), 'Apă potabilă plată');
  await fireEvent.changeText(screen.getByLabelText(ro.review.quantity), '1,5 L');
  await fireEvent.changeText(screen.getByLabelText(ro.scan.manualLabel), '4840001000014');
  await fireEvent.changeText(screen.getByLabelText(ro.app.admin.waterSource), 'Rusnac-MoldAqua');
  await fireEvent.changeText(
    screen.getByLabelText(ro.app.admin.waterSourceUrl),
    'https://apaom.md/',
  );
  await fireEvent.press(
    screen.getByRole('button', { name: ro.result.water.classifications.drinking }),
  );
  await fireEvent.press(screen.getByRole('button', { name: ro.result.water.carbonation.still }));
  await fireEvent.changeText(screen.getByTestId('water-tdsMgL'), '350-400');
  await fireEvent.changeText(screen.getByTestId('water-ph'), '7,4');

  expect(screen.getByTestId('water-score-preview')).not.toHaveTextContent(
    new RegExp(ro.result.scoreUnavailable),
  );
  expect(screen.getByTestId('water-score-preview')).toHaveTextContent(/\d+\s+din 100/);

  await fireEvent.press(screen.getByText(ro.app.admin.saveWater));
  await waitFor(() =>
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({
        code: '4840001000014',
        brand: 'OM',
        name: 'Apă potabilă plată',
        quantity: '1,5 L',
        status: 'verified',
        source: 'Rusnac-MoldAqua',
        sourceUrl: 'https://apaom.md/',
        water: expect.objectContaining({
          tdsMgL: 375,
          ph: 7.4,
          carbonation: 'still',
          classification: 'drinking',
          ranges: { tdsMgL: { min: 350, max: 400 } },
        }),
      }),
    ),
  );
});

it('surfaces server errors such as duplicate barcodes in an alert', async () => {
  const save = jest.fn().mockRejectedValue(new Error(ro.errors.duplicate));
  await render(<AddWaterForm onSave={save} />);

  await fireEvent.changeText(screen.getByLabelText(ro.review.brand), 'OM');
  await fireEvent.changeText(screen.getByLabelText(ro.review.name), 'Apă potabilă plată');
  await fireEvent.changeText(screen.getByLabelText(ro.review.quantity), '1,5 L');
  await fireEvent.changeText(screen.getByLabelText(ro.app.admin.waterSource), 'Rusnac-MoldAqua');
  await fireEvent.press(screen.getByText(ro.app.admin.saveWater));

  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(ro.errors.duplicate));
});
