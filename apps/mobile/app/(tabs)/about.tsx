import { AboutScreen } from '../../src/features/about/AboutScreen';
import { letterTones as tones } from '../../src/theme/letterTones';

export default function AboutPage() {
 return <AboutScreen tierPalette={{ excellent: tones.A.fg, good: tones.B.fg, fair: tones.C.fg, poor: tones.D.fg, bad: tones.E.fg }} />;
}
