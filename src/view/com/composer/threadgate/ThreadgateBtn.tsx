import {
  FontAwesomeIcon,
  FontAwesomeIconStyle,
} from '@fortawesome/react-native-fontawesome'
import {msg} from '@lingui/macro'
import {useLingui} from '@lingui/react'
import {useAnalytics} from 'lib/analytics/analytics'
import {HITSLOP_10} from 'lib/constants'
import {usePalette} from 'lib/hooks/usePalette'
import React from 'react'
import {Keyboard, StyleSheet, TouchableOpacity} from 'react-native'

import {isNative} from '#/platform/detection'
import {useModalControls} from '#/state/modals'
import {ThreadgateSetting} from '#/state/queries/threadgate'

export function ThreadgateBtn({
  threadgate,
  onChange,
}: {
  threadgate: ThreadgateSetting[]
  onChange: (v: ThreadgateSetting[]) => void
}) {
  const pal = usePalette('default')
  const {track} = useAnalytics()
  const {_} = useLingui()
  const {openModal} = useModalControls()

  const onPress = () => {
    track('Composer:ThreadgateOpened')
    if (isNative && Keyboard.isVisible()) {
      Keyboard.dismiss()
    }
    openModal({
      name: 'threadgate',
      settings: threadgate,
      onChange,
    })
  }

  return (
    <TouchableOpacity
      testID="openReplyGateButton"
      onPress={onPress}
      style={styles.button}
      hitSlop={HITSLOP_10}
      accessibilityRole="button"
      accessibilityLabel={_(msg`Who can reply`)}
      accessibilityHint="">
      <FontAwesomeIcon
        icon={['far', 'comments']}
        style={pal.link as FontAwesomeIconStyle}
        size={24}
      />
      {threadgate.length ? (
        <FontAwesomeIcon
          icon="check"
          size={16}
          style={pal.link as FontAwesomeIconStyle}
        />
      ) : null}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    gap: 4,
  },
})
