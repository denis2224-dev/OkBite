import { StyleSheet } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { Caption, Heading, Section, Title } from './Typography';
import { fonts, light, typeScale } from '../theme/tokens';

const styleOf = (text: string) => StyleSheet.flatten(screen.getByText(text).props.style);

it('sizes the serif headings up (Cormorant has a small x-height) and keeps the body scale', () => {
  expect(typeScale).toEqual({
    score: { fontSize: 40, lineHeight: 44 }, display: { fontSize: 34, lineHeight: 40 }, title: { fontSize: 30, lineHeight: 36 },
    section: { fontSize: 22, lineHeight: 28 }, body: { fontSize: 15, lineHeight: 23 }, caption: { fontSize: 13, lineHeight: 19 },
  });
  expect(fonts).toMatchObject({ heading: 'CormorantGaramond_600SemiBold', headingExtra: 'CormorantGaramond_700Bold', body: 'DMSans_400Regular' });
});

it.each([
  ['Heading', Heading, 34, 40],
  ['Title', Title, 30, 36],
  ['Section', Section, 22, 28],
] as const)('%s is a scalable header at %i/%i in the heading font', async (_, Component, fontSize, lineHeight) => {
  await render(<Component>Alergeni</Component>);
  const header = screen.getByRole('header', { name: 'Alergeni' });
  expect(StyleSheet.flatten(header.props.style)).toMatchObject({ fontSize, lineHeight, fontFamily: fonts.heading, color: light.ink });
  expect(header.props.allowFontScaling).toBe(true);
});

it('Caption is muted, scalable 13/19 body text and not a header', async () => {
  await render(<Caption>Notă</Caption>);
  expect(screen.queryByRole('header')).toBeNull();
  expect(styleOf('Notă')).toMatchObject({ fontSize: 13, lineHeight: 19, fontFamily: fonts.body, color: light.muted });
  expect(screen.getByText('Notă').props.allowFontScaling).toBe(true);
});

it('lets a caller override the colour', async () => {
  await render(<Caption style={{ color: light.low }}>x</Caption>);
  expect(styleOf('x').color).toBe(light.low);
});
