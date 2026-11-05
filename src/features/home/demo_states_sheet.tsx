import { Modal, View, Pressable, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Body, Heading, Button, Icon } from '../../shared/widgets';
import { useDemoState, demoActions, resolveDemoCode } from '../../shared/state/app_state';
import { useTheme } from '../../core/theme/app_theme';
import { ro } from '../../core/constants/strings_ro';
import { useToast } from '../../shared/widgets/toast';
export function DemoStatesSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const state = useDemoState(),
    { colors } = useTheme(),
    toast = useToast(),
    d = ro.app.design;
  function shortcut(code: string, online = false) {
    const result = resolveDemoCode(code, online);
    onClose();
    if (result.screen === 'result' && result.entry) {
      toast(d.cached);
      router.push(`/product/${result.entry.product.id}`);
    } else
      router.push(
        `/preview?step=${result.screen}&code=${code}&id=${result.entry?.product.id ?? ''}`,
      );
  }
  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: colors.scrim,
          justifyContent: 'flex-end',
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={ro.app.close}
          onPress={onClose}
          style={{ flex: 1 }}
        />
        <View
          accessibilityViewIsModal
          style={{
            backgroundColor: colors.ground,
            width: '100%',
            maxWidth: 390,
            alignSelf: 'center',
            maxHeight: '90%',
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
          }}
        >
          <ScrollView
            style={{ flexGrow: 0 }}
            contentContainerStyle={{ padding: 18, gap: 14 }}
            keyboardShouldPersistTaps="handled"
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Heading style={{ fontSize: 21, flex: 1 }}>{d.demoTitle}</Heading>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={ro.app.close}
                onPress={onClose}
                style={{
                  width: 44,
                  height: 44,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name="close" color={colors.ink} />
              </Pressable>
            </View>
            <Body style={{ fontSize: 14, color: colors.muted }}>{d.demoDescription}</Body>
            {(
              [
                ['offline', ro.offline.title, d.offlineDetail],
                ['camDenied', d.cameraTitle, d.cameraDetail],
                ['ocrUnclear', d.ocrTitle, d.ocrDetail],
              ] as const
            ).map(([key, title, description]) => (
              <Pressable
                key={key}
                accessibilityRole="switch"
                accessibilityLabel={title}
                accessibilityState={{ checked: state[key] }}
                onPress={() => demoActions.setFlag(key, !state[key])}
                style={{
                  minHeight: 58,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  borderBottomWidth: 1,
                  borderBottomColor: '#E8E1D3',
                  paddingBottom: 10,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Body style={{ fontWeight: '700' }}>{title}</Body>
                  <Body style={{ fontSize: 12, lineHeight: 17, color: colors.muted }}>
                    {description}
                  </Body>
                </View>
                <View
                  style={{
                    width: 44,
                    height: 26,
                    borderRadius: 13,
                    padding: 3,
                    backgroundColor: state[key] ? '#2E6B45' : '#B9B2A3',
                  }}
                >
                  <View
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      backgroundColor: '#FFFFFF',
                      transform: [{ translateX: state[key] ? 18 : 0 }],
                    }}
                  />
                </View>
              </Pressable>
            ))}
            <Body
              style={{
                fontSize: 12,
                fontWeight: '800',
                textTransform: 'uppercase',
                letterSpacing: 0.7,
              }}
            >
              {d.shortcuts}
            </Body>
            <Button variant="secondary" onPress={() => shortcut('4841234567890')}>
              {d.notFoundTitle}
            </Button>
            <Button
              variant="secondary"
              onPress={() => shortcut('4840001000055', true)}
            >{`${ro.result.insufficient} (suc de mere)`}</Button>
            <Button
              variant="secondary"
              onPress={() => {
                demoActions.restoreHistory();
                onClose();
                toast(d.restored);
              }}
            >
              {d.restore}
            </Button>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
