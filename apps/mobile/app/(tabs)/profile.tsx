// N10 owns ProfileScreen and the onboarding store; do not create a second store here.
import { Body, Screen } from '../../src/ui';
import { ro } from '../../src/copy/ro';
export default function ProfileTab() {
 return <Screen title={ro.nav.profile} back={false}><Body>{ro.profile.pending}</Body></Screen>;
}
