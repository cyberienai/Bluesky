import {
  AppBskyActorDefs,
  AppBskyFeedPost,
  AtUri,
  RichText as RichTextAPI,
} from '@atproto/api'
import {FontAwesomeIcon} from '@fortawesome/react-native-fontawesome'
import {msg} from '@lingui/macro'
import {useLingui} from '@lingui/react'
import Clipboard from '@react-native-clipboard/clipboard'
import {useNavigation} from '@react-navigation/native'
import {getCurrentRoute} from 'lib/routes/helpers'
import {shareUrl} from 'lib/sharing'
import {toShareUrl} from 'lib/strings/url-helpers'
import {useTheme} from 'lib/ThemeContext'
import React, {memo} from 'react'
import {Pressable, PressableProps, StyleProp, ViewStyle} from 'react-native'

import {atoms as a, useTheme as useAlf} from '#/alf'
import {useGlobalDialogsControlContext} from '#/components/dialogs/Context'
import {ArrowOutOfBox_Stroke2_Corner0_Rounded as Share} from '#/components/icons/ArrowOutOfBox'
import {BubbleQuestion_Stroke2_Corner0_Rounded as Translate} from '#/components/icons/Bubble'
import {CircleInfo_Stroke2_Corner0_Rounded as CircleInfo} from '#/components/icons/CircleInfo'
import {Clipboard_Stroke2_Corner2_Rounded as ClipboardIcon} from '#/components/icons/Clipboard'
import {EyeSlash_Stroke2_Corner0_Rounded as EyeSlash} from '#/components/icons/EyeSlash'
import {Filter_Stroke2_Corner0_Rounded as Filter} from '#/components/icons/Filter'
import {Mute_Stroke2_Corner0_Rounded as Mute} from '#/components/icons/Mute'
import {SpeakerVolumeFull_Stroke2_Corner0_Rounded as Unmute} from '#/components/icons/Speaker'
import {Trash_Stroke2_Corner0_Rounded as Trash} from '#/components/icons/Trash'
import {Warning_Stroke2_Corner0_Rounded as Warning} from '#/components/icons/Warning'
import * as Menu from '#/components/Menu'
import {makeProfileLink} from '#/lib/routes/links'
import {CommonNavigatorParams} from '#/lib/routes/types'
import {richTextToString} from '#/lib/strings/rich-text-helpers'
import {getTranslatorLink} from '#/locale/helpers'
import {logger} from '#/logger'
import {isWeb} from '#/platform/detection'
import {useModalControls} from '#/state/modals'
import {useMutedThreads, useToggleThreadMute} from '#/state/muted-threads'
import {useLanguagePrefs} from '#/state/preferences'
import {useHiddenPosts, useHiddenPostsApi} from '#/state/preferences'
import {useOpenLink} from '#/state/preferences/in-app-browser'
import {usePostDeleteMutation} from '#/state/queries/post'
import {useSession} from '#/state/session'

import {EventStopper} from '../EventStopper'
import * as Toast from '../Toast'

let PostDropdownBtn = ({
  testID,
  postAuthor,
  postCid,
  postUri,
  record,
  richText,
  style,
  showAppealLabelItem,
  hitSlop,
}: {
  testID: string
  postAuthor: AppBskyActorDefs.ProfileViewBasic
  postCid: string
  postUri: string
  record: AppBskyFeedPost.Record
  richText: RichTextAPI
  style?: StyleProp<ViewStyle>
  showAppealLabelItem?: boolean
  hitSlop?: PressableProps['hitSlop']
}): React.ReactNode => {
  const {hasSession, currentAccount} = useSession()
  const theme = useTheme()
  const alf = useAlf()
  const {_} = useLingui()
  const defaultCtrlColor = theme.palette.default.postCtrl
  const {openModal} = useModalControls()
  const langPrefs = useLanguagePrefs()
  const mutedThreads = useMutedThreads()
  const toggleThreadMute = useToggleThreadMute()
  const postDeleteMutation = usePostDeleteMutation()
  const hiddenPosts = useHiddenPosts()
  const {hidePost} = useHiddenPostsApi()
  const openLink = useOpenLink()
  const navigation = useNavigation()
  const {mutedWordsDialogControl} = useGlobalDialogsControlContext()

  const rootUri = record.reply?.root?.uri || postUri
  const isThreadMuted = mutedThreads.includes(rootUri)
  const isPostHidden = hiddenPosts && hiddenPosts.includes(postUri)
  const isAuthor = postAuthor.did === currentAccount?.did
  const href = React.useMemo(() => {
    const urip = new AtUri(postUri)
    return makeProfileLink(postAuthor, 'post', urip.rkey)
  }, [postUri, postAuthor])

  const translatorUrl = getTranslatorLink(
    record.text,
    langPrefs.primaryLanguage,
  )

  const onDeletePost = React.useCallback(() => {
    postDeleteMutation.mutateAsync({uri: postUri}).then(
      () => {
        Toast.show(_(msg`Post deleted`))

        const route = getCurrentRoute(navigation.getState())
        if (route.name === 'PostThread') {
          const params = route.params as CommonNavigatorParams['PostThread']
          if (
            currentAccount &&
            isAuthor &&
            (params.name === currentAccount.handle ||
              params.name === currentAccount.did)
          ) {
            const currentHref = makeProfileLink(postAuthor, 'post', params.rkey)
            if (currentHref === href && navigation.canGoBack()) {
              navigation.goBack()
            }
          }
        }
      },
      e => {
        logger.error('Failed to delete post', {message: e})
        Toast.show(_(msg`Failed to delete post, please try again`))
      },
    )
  }, [
    navigation,
    postUri,
    postDeleteMutation,
    postAuthor,
    currentAccount,
    isAuthor,
    href,
    _,
  ])

  const onToggleThreadMute = React.useCallback(() => {
    try {
      const muted = toggleThreadMute(rootUri)
      if (muted) {
        Toast.show(
          _(msg`You will no longer receive notifications for this thread`),
        )
      } else {
        Toast.show(_(msg`You will now receive notifications for this thread`))
      }
    } catch (e) {
      logger.error('Failed to toggle thread mute', {message: e})
    }
  }, [rootUri, toggleThreadMute, _])

  const onCopyPostText = React.useCallback(() => {
    const str = richTextToString(richText, true)

    Clipboard.setString(str)
    Toast.show(_(msg`Copied to clipboard`))
  }, [_, richText])

  const onOpenTranslate = React.useCallback(() => {
    openLink(translatorUrl)
  }, [openLink, translatorUrl])

  const onHidePost = React.useCallback(() => {
    hidePost({uri: postUri})
  }, [postUri, hidePost])

  return (
    <EventStopper onKeyDown={false}>
      <Menu.Root>
        <Menu.Trigger label={_(msg`Open post options menu`)}>
          {({props, state}) => {
            return (
              <Pressable
                {...props}
                hitSlop={hitSlop}
                testID={testID}
                style={[
                  style,
                  a.rounded_full,
                  (state.hovered || state.pressed) && [
                    alf.atoms.bg_contrast_50,
                  ],
                ]}>
                <FontAwesomeIcon
                  icon="ellipsis"
                  size={20}
                  color={defaultCtrlColor}
                  style={{pointerEvents: 'none'}}
                />
              </Pressable>
            )
          }}
        </Menu.Trigger>

        <Menu.Outer>
          <Menu.Group>
            <Menu.Item
              testID="postDropdownTranslateBtn"
              label={_(msg`Translate`)}
              onPress={onOpenTranslate}>
              <Menu.ItemText>{_(msg`Translate`)}</Menu.ItemText>
              <Menu.ItemIcon icon={Translate} position="right" />
            </Menu.Item>

            <Menu.Item
              testID="postDropdownCopyTextBtn"
              label={_(msg`Copy post text`)}
              onPress={onCopyPostText}>
              <Menu.ItemText>{_(msg`Copy post text`)}</Menu.ItemText>
              <Menu.ItemIcon icon={ClipboardIcon} position="right" />
            </Menu.Item>

            <Menu.Item
              testID="postDropdownShareBtn"
              label={isWeb ? _(msg`Copy link to post`) : _(msg`Share`)}
              onPress={() => {
                const url = toShareUrl(href)
                shareUrl(url)
              }}>
              <Menu.ItemText>
                {isWeb ? _(msg`Copy link to post`) : _(msg`Share`)}
              </Menu.ItemText>
              <Menu.ItemIcon icon={Share} position="right" />
            </Menu.Item>
          </Menu.Group>

          {hasSession && (
            <>
              <Menu.Divider />

              <Menu.Group>
                <Menu.Item
                  testID="postDropdownMuteThreadBtn"
                  label={
                    isThreadMuted ? _(msg`Unmute thread`) : _(msg`Mute thread`)
                  }
                  onPress={onToggleThreadMute}>
                  <Menu.ItemText>
                    {isThreadMuted
                      ? _(msg`Unmute thread`)
                      : _(msg`Mute thread`)}
                  </Menu.ItemText>
                  <Menu.ItemIcon
                    icon={isThreadMuted ? Unmute : Mute}
                    position="right"
                  />
                </Menu.Item>

                <Menu.Item
                  testID="postDropdownMuteWordsBtn"
                  label={_(msg`Mute words & tags`)}
                  onPress={() => mutedWordsDialogControl.open()}>
                  <Menu.ItemText>{_(msg`Mute words & tags`)}</Menu.ItemText>
                  <Menu.ItemIcon icon={Filter} position="right" />
                </Menu.Item>

                {!isAuthor && !isPostHidden && (
                  <Menu.Item
                    testID="postDropdownHideBtn"
                    label={_(msg`Hide post`)}
                    onPress={() => {
                      openModal({
                        name: 'confirm',
                        title: _(msg`Hide this post?`),
                        message: _(
                          msg`This will hide this post from your feeds.`,
                        ),
                        onPressConfirm: onHidePost,
                      })
                    }}>
                    <Menu.ItemText>{_(msg`Hide post`)}</Menu.ItemText>
                    <Menu.ItemIcon icon={EyeSlash} position="right" />
                  </Menu.Item>
                )}
              </Menu.Group>
            </>
          )}

          <Menu.Divider />

          <Menu.Group>
            {!isAuthor && (
              <Menu.Item
                testID="postDropdownReportBtn"
                label={_(msg`Report post`)}
                onPress={() => {
                  openModal({
                    name: 'report',
                    uri: postUri,
                    cid: postCid,
                  })
                }}>
                <Menu.ItemText>{_(msg`Report post`)}</Menu.ItemText>
                <Menu.ItemIcon icon={Warning} position="right" />
              </Menu.Item>
            )}

            {isAuthor && (
              <Menu.Item
                testID="postDropdownDeleteBtn"
                label={_(msg`Delete post`)}
                onPress={() => {
                  openModal({
                    name: 'confirm',
                    title: _(msg`Delete this post?`),
                    message: _(msg`Are you sure? This cannot be undone.`),
                    onPressConfirm: onDeletePost,
                  })
                }}>
                <Menu.ItemText>{_(msg`Delete post`)}</Menu.ItemText>
                <Menu.ItemIcon icon={Trash} position="right" />
              </Menu.Item>
            )}

            {showAppealLabelItem && (
              <>
                <Menu.Divider />

                <Menu.Item
                  testID="postDropdownAppealBtn"
                  label={_(msg`Appeal content warning`)}
                  onPress={() => {
                    openModal({
                      name: 'appeal-label',
                      uri: postUri,
                      cid: postCid,
                    })
                  }}>
                  <Menu.ItemText>
                    {_(msg`Appeal content warning`)}
                  </Menu.ItemText>
                  <Menu.ItemIcon icon={CircleInfo} position="right" />
                </Menu.Item>
              </>
            )}
          </Menu.Group>
        </Menu.Outer>
      </Menu.Root>
    </EventStopper>
  )
}

PostDropdownBtn = memo(PostDropdownBtn)
export {PostDropdownBtn}
