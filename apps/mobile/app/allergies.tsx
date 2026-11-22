import { Redirect } from 'expo-router';

/** The Alergii tab is gone; old links to /allergies open the allergen preferences page. */
export default function AllergiesRedirect() {
  return <Redirect href="/preferences/allergens" />;
}
