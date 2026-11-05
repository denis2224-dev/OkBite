import { Screen, Heading, Body } from '../../src/ui';
import { ro } from '../../src/copy/ro';
import { AdminEntry } from '../../src/features/admin/AdminEntry';
// Minimal C7 entry until R4/A4 supplies the complete information screens.
export default function AboutPage() {
  return (
    <Screen title={ro.nav.about} back>
      <Heading>{ro.legal.aboutLead}</Heading>
      <Body>{ro.legal.aboutBody}</Body>
      <AdminEntry />
    </Screen>
  );
}
