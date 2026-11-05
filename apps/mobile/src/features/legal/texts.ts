import { ro } from '../../copy/ro';

export const texts = {
  about: { title: ro.nav.about, lead: ro.legal.aboutLead, sections: [{ title: ro.legal.aboutLead, body: ro.legal.aboutBody }, ...ro.legal.aboutSections] },
  privacy: { title: ro.nav.privacy, lead: ro.legal.privacyLead, sections: ro.legal.privacySections },
  terms: { title: ro.nav.terms, lead: ro.legal.termsLead, sections: ro.legal.termsSections },
  method: { title: ro.nav.method, lead: ro.legal.methodLead, sections: ro.legal.methodSections },
} as const;
export type LegalKind = keyof typeof texts;
