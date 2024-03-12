import {msg} from '@lingui/macro'
import {useLingui} from '@lingui/react'
import {useNavigation} from '@react-navigation/native'
import React from 'react'

import {web} from '#/alf'
import * as Dialog from '#/components/Dialog'
import {NavigationProp} from '#/lib/routes/types'
import {isInvalidHandle} from '#/lib/strings/handles'
import {enforceLen} from '#/lib/strings/helpers'
import {
  usePreferencesQuery,
  useRemoveMutedWordMutation,
  useUpsertMutedWordsMutation,
} from '#/state/queries/preferences'
import {EventStopper} from '#/view/com/util/EventStopper'
import {NativeDropdown} from '#/view/com/util/forms/NativeDropdown'

export function useTagMenuControl(): Dialog.DialogControlProps {
  return {
    id: '',
    // @ts-ignore
    ref: null,
    open: () => {
      throw new Error(`TagMenu controls are only available on native platforms`)
    },
    close: () => {
      throw new Error(`TagMenu controls are only available on native platforms`)
    },
  }
}

export function TagMenu({
  children,
  tag,
  authorHandle,
}: React.PropsWithChildren<{
  /**
   * This should be the sanitized tag value from the facet itself, not the
   * "display" value with a leading `#`.
   */
  tag: string
  authorHandle?: string
}>) {
  const {_} = useLingui()
  const navigation = useNavigation<NavigationProp>()
  const {data: preferences} = usePreferencesQuery()
  const {mutateAsync: upsertMutedWord, variables: optimisticUpsert} =
    useUpsertMutedWordsMutation()
  const {mutateAsync: removeMutedWord, variables: optimisticRemove} =
    useRemoveMutedWordMutation()
  const isMuted = Boolean(
    (preferences?.mutedWords?.find(
      m => m.value === tag && m.targets.includes('tag'),
    ) ??
      optimisticUpsert?.find(
        m => m.value === tag && m.targets.includes('tag'),
      )) &&
      !(optimisticRemove?.value === tag),
  )
  const truncatedTag = '#' + enforceLen(tag, 15, true, 'middle')

  const dropdownItems = React.useMemo(() => {
    return [
      {
        label: _(msg`See ${truncatedTag} posts`),
        onPress() {
          navigation.push('Hashtag', {
            tag: encodeURIComponent(tag),
          })
        },
        testID: 'tagMenuSearch',
        icon: {
          ios: {
            name: 'magnifyingglass',
          },
          android: '',
          web: 'magnifying-glass',
        },
      },
      authorHandle &&
        !isInvalidHandle(authorHandle) && {
          label: _(msg`See ${truncatedTag} posts by user`),
          onPress() {
            navigation.push('Hashtag', {
              tag: encodeURIComponent(tag),
              author: authorHandle,
            })
          },
          testID: 'tagMenuSeachByUser',
          icon: {
            ios: {
              name: 'magnifyingglass',
            },
            android: '',
            web: ['far', 'user'],
          },
        },
      preferences && {
        label: 'separator',
      },
      preferences && {
        label: isMuted
          ? _(msg`Unmute ${truncatedTag}`)
          : _(msg`Mute ${truncatedTag}`),
        onPress() {
          if (isMuted) {
            removeMutedWord({value: tag, targets: ['tag']})
          } else {
            upsertMutedWord([{value: tag, targets: ['tag']}])
          }
        },
        testID: 'tagMenuMute',
        icon: {
          ios: {
            name: 'speaker.slash',
          },
          android: 'ic_menu_sort_alphabetically',
          web: isMuted ? 'eye' : ['far', 'eye-slash'],
        },
      },
    ].filter(Boolean)
  }, [
    _,
    authorHandle,
    isMuted,
    navigation,
    preferences,
    tag,
    truncatedTag,
    upsertMutedWord,
    removeMutedWord,
  ])

  return (
    <EventStopper>
      <NativeDropdown
        accessibilityLabel={_(msg`Click here to open tag menu for ${tag}`)}
        accessibilityHint=""
        // @ts-ignore
        items={dropdownItems}
        triggerStyle={web({
          textAlign: 'left',
        })}>
        {children}
      </NativeDropdown>
    </EventStopper>
  )
}
