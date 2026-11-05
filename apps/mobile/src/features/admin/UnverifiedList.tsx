import { View } from 'react-native';
import { Body, Button } from '../../ui';
import { ro } from '../../copy/ro';
export type UnverifiedItem = { id: string; name: string; brand: string };
export function UnverifiedList({
  items,
  onOpen,
}: {
  items: UnverifiedItem[];
  onOpen: (id: string) => void;
}) {
  return (
    <View style={{ gap: 12 }}>
      {items.length ? (
        items.map((item) => (
          <Button
            key={item.id}
            variant="secondary"
            onPress={() => onOpen(item.id)}
          >{`${item.brand} · ${item.name}`}</Button>
        ))
      ) : (
        <Body>{ro.app.admin.emptyProducts}</Body>
      )}
    </View>
  );
}
