import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { emptyWaterProfile, type WaterSubmission } from '@okbite/shared';
import { ro } from '../../copy/ro';
import { WaterSubmissionsList } from './WaterSubmissionsList';

const submission: WaterSubmission = {
  id: '11111111-1111-4111-8111-111111111111',
  productId: '22222222-2222-4222-8222-222222222222',
  productName: 'OM Apă Plată',
  productBrand: 'OM',
  productQuantity: '1,5 L',
  currentWater: { ...emptyWaterProfile(), tdsMgL: 375, ranges: { tdsMgL: { min: 350, max: 400 } } },
  proposedWater: { tdsMgL: 490, no3MgL: 0 },
  photoPath: '22222222-2222-4222-8222-222222222222/nutrition-abc.jpg',
  photoUrl: 'https://example.supabase.co/storage/v1/object/public/products/22222222-2222-4222-8222-222222222222/nutrition-abc.jpg',
  kind: 'conflict',
  status: 'pending',
  createdAt: '2026-11-17',
};

describe('WaterSubmissionsList', () => {
  it('displays current vs proposed water readings including ranges and zeroes and resolves via moderator actions', async () => {
    const onResolve = jest.fn(async () => {});
    await render(<WaterSubmissionsList items={[submission]} onResolve={onResolve} />);

    expect(screen.getByText(/OM · OM Apă Plată/)).toBeTruthy();
    expect(screen.getByText(new RegExp(ro.app.admin.waterKinds.conflict))).toBeTruthy();
    expect(screen.getByText(/350–400 mg\/l/)).toBeTruthy();
    expect(screen.getByText(/490 mg\/l/)).toBeTruthy();
    expect(screen.getByText(/: 0 mg\/l/)).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: ro.app.admin.acceptSubmission }));
    await waitFor(() => expect(onResolve).toHaveBeenCalledWith(submission.id, 'accept'));

    await fireEvent.press(screen.getByRole('button', { name: ro.app.admin.rejectSubmission }));
    await waitFor(() => expect(onResolve).toHaveBeenCalledWith(submission.id, 'reject'));
  });
});
