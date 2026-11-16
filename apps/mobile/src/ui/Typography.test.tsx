import { StyleSheet } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { Caption, Heading, Section, Title } from './Typography';
import { fonts, light, typeScale } from '../theme/tokens';

const styleOf = (text: string) => StyleSheet.flatten(screen.getByText(text).props.style);

it('steps the scale by about 1.2 from caption to display, with the score numeral above it', () => {
  expect(typeScale).toEqual({
    score: { fontSize: 40, lineHeight: 44 }, display: { fontSize: 26, lineHeight: 32 }, title: { fontSize: 22, lineHeight: 28 },
    section: { fontSize: 18, lineHeight: 24 }, body: { fontSize: 15, lineHeight: 23 }, caption: { fontSize: 13, lineHeight: 19 },
  });
  expect(fonts.headingExtra).toBe('BricolageGrotesque_800ExtraBold');
});

it.each([
  ['Heading', Heading, 26, 32],
  ['Title', Title, 22, 28],
  ['Section', Section, 18, 24],
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
