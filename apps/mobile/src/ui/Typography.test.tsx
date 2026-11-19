import { StyleSheet } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { Caption, Heading, Section, Title } from './Typography';
import { fonts, light, typeScale } from '../theme/tokens';

const styleOf = (text: string) => StyleSheet.flatten(screen.getByText(text).props.style);

it('uses the CALM type scale in Inter only', () => {
  expect(typeScale).toEqual({
    score: { fontSize: 38, lineHeight: 44 }, display: { fontSize: 30, lineHeight: 36 }, title: { fontSize: 20, lineHeight: 26 },
    section: { fontSize: 19, lineHeight: 25 }, body: { fontSize: 16, lineHeight: 24 }, caption: { fontSize: 13, lineHeight: 18 },
  });
  for (const face of Object.values(fonts)) expect(face).toMatch(/^Inter_/);
});

it.each([
  ['Heading', Heading, 30, 36],
  ['Title', Title, 20, 26],
  ['Section', Section, 19, 25],
] as const)('%s is a scalable header at %i/%i in the heading font', async (_, Component, fontSize, lineHeight) => {
  await render(<Component>Alergeni</Component>);
  const header = screen.getByRole('header', { name: 'Alergeni' });
  expect(StyleSheet.flatten(header.props.style)).toMatchObject({ fontSize, lineHeight, fontFamily: fonts.heading, color: light.ink });
  expect(header.props.allowFontScaling).toBe(true);
});

it('Caption is muted, scalable 13/19 body text and not a header', async () => {
  await render(<Caption>Notă</Caption>);
  expect(screen.queryByRole('header')).toBeNull();
  expect(styleOf('Notă')).toMatchObject({ fontSize: 13, lineHeight: 18, fontFamily: fonts.body, color: light.muted });
  expect(screen.getByText('Notă').props.allowFontScaling).toBe(true);
});

it('lets a caller override the colour', async () => {
  await render(<Caption style={{ color: light.low }}>x</Caption>);
  expect(styleOf('x').color).toBe(light.low);
});
