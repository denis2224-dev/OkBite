import { useState } from 'react';
import { Linking, View } from 'react-native';
import { PressableOpacity as Pressable } from '../../../src/shared/PressableOpacity';
import { useLocalSearchParams } from 'expo-router';
import { AllergenChip, Badge, Body, Button, Card, Heading, Screen, useToast } from '../../../src/ui';
import { ro } from '../../../src/copy/ro';
import { useProduct } from '../../../src/features/product/useProduct';
import { SourceCard } from '../../../src/features/product/SourceCard';
const groups = ['base', 'fat', 'taste', 'add', 'cult', null] as const;

export default function Ingredients() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, loading, error } = useProduct(id);
  const [expanded, setExpanded] = useState<string>();
  const toast = useToast();
  const product = data?.product;
  return <Screen title={ro.ingredients.title} back>
    {loading && <Body accessibilityLiveRegion="polite">{ro.app.loading}</Body>}
    {error && <Body accessibilityLiveRegion="polite">{error.message}</Body>}
    {product?.status === 'hidden' && <Body>{ro.result.notFound}</Body>}
    {product && product.status !== 'hidden' && <>
      <Body>{product.name} · {product.brand}</Body>
      {product.status === 'unverified' && <Badge tone="unverified">{ro.result.unverified}</Badge>}
      <Card><Body>{ro.result.allergens}</Body>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{product.allergens.map(name => <AllergenChip key={name} name={name} />)}</View>
        {!product.allergens.length && <Body>{ro.result.noAllergens}</Body>}
        {!!product.mayContain.length && <><Body>{ro.result.mayContain}</Body><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {product.mayContain.map(name => <AllergenChip key={name} name={name} />)}</View></>}
        <Body>{ro.result.allergyNote}</Body>
      </Card>
      {groups.map(group => {
        const items = product.ingredients.map((ingredient, index) => ({ ingredient, index })).filter(item => item.ingredient.group === group);
        return items.length ? <View key={group ?? 'unknown'} style={{ gap: 8 }}>
          <Heading style={{ fontSize: 18 }}>{group ? ro.ingredients[group] : ro.ingredients.explanationSoon}</Heading>
          {items.map(({ ingredient, index }) => {
            const key = `${id}:${index}`, open = expanded === key;
            const source = ingredient.source && /^https?:\/\//i.test(ingredient.source) ? ingredient.source : null;
            return <Card key={key}>
              <Pressable accessibilityRole="button" accessibilityLabel={ingredient.name} accessibilityState={{ expanded: open }}
                onPress={() => setExpanded(open ? undefined : key)} style={{ minHeight: 48, justifyContent: 'center' }}>
                <Body>{ingredient.name}</Body>
                {ingredient.allergen && <AllergenChip name={ingredient.allergen} />}
              </Pressable>
              {open && (ingredient.slug && ingredient.explanation && source ? <>
                <Body>{ingredient.role}</Body><Body>{ingredient.explanation}</Body>
                <Button variant="ghost" onPress={() => { void Linking.openURL(source).catch(() => toast(ro.errors.generic)); }}>{ro.ingredients.source}</Button>
              </> : <Body>{ro.ingredients.explanationSoon}</Body>)}
            </Card>;
          })}
        </View> : null;
      })}
      <SourceCard product={product} />
    </>}
  </Screen>;
}
