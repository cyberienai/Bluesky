import 'react-native-url-polyfill/auto'
import 'lib/sentry' // must be near top
import 'view/icons'

import {msg} from '@lingui/macro'
import {useLingui} from '@lingui/react'
import {QueryClientProvider} from '@tanstack/react-query'
import * as SplashScreen from 'expo-splash-screen'
import {StatusBar} from 'expo-status-bar'
import {useIntentHandler} from 'lib/hooks/useIntentHandler'
import * as notifications from 'lib/notifications/notifications'
import {queryClient} from 'lib/react-query'
import {s} from 'lib/styles'
import {ThemeProvider} from 'lib/ThemeContext'
import {isAndroid} from 'platform/detection'
import React, {useEffect, useState} from 'react'
import {GestureHandlerRootView} from 'react-native-gesture-handler'
import {RootSiblingParent} from 'react-native-root-siblings'
import {
  initialWindowMetrics,
  SafeAreaProvider,
} from 'react-native-safe-area-context'
import {Provider as DialogStateProvider} from 'state/dialogs'
import {Provider as InvitesStateProvider} from 'state/invites'
import {Provider as LightboxStateProvider} from 'state/lightbox'
import {Provider as ModalStateProvider} from 'state/modals'
import {Provider as MutedThreadsProvider} from 'state/muted-threads'
import {Provider as PrefsStateProvider} from 'state/preferences'
import {Provider as UnreadNotifsProvider} from 'state/queries/notifications/unread'
import {
  Provider as SessionProvider,
  useSession,
  useSessionApi,
} from 'state/session'
import {Provider as ShellStateProvider} from 'state/shell'
import {Provider as LoggedOutViewProvider} from 'state/shell/logged-out'
import {Provider as SelectedFeedProvider} from 'state/shell/selected-feed'
import {TestCtrls} from 'view/com/testing/TestCtrls'
import * as Toast from 'view/com/util/Toast'
import {Shell} from 'view/shell'

import {ThemeProvider as Alf} from '#/alf'
import {useColorModeTheme} from '#/alf/util/useColorModeTheme'
import {Provider as PortalProvider} from '#/components/Portal'
import {Provider as StatsigProvider} from '#/lib/statsig/statsig'
import {Splash} from '#/Splash'
import {init as initPersistedState} from '#/state/persisted'
import * as persisted from '#/state/persisted'

import I18nProvider from './locale/i18nProvider'
import {listenSessionDropped} from './state/events'

SplashScreen.preventAutoHideAsync()

function InnerApp() {
  const {isInitialLoad, currentAccount} = useSession()
  const {resumeSession} = useSessionApi()
  const theme = useColorModeTheme()
  const {_} = useLingui()
  useIntentHandler()

  // init
  useEffect(() => {
    notifications.init(queryClient)
    listenSessionDropped(() => {
      Toast.show(_(msg`Sorry! Your session expired. Please log in again.`))
    })

    const account = persisted.get('session').currentAccount
    resumeSession(account)
  }, [resumeSession, _])

  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      {isAndroid && <StatusBar />}
      <Alf theme={theme}>
        <Splash isReady={!isInitialLoad}>
          <React.Fragment
            // Resets the entire tree below when it changes:
            key={currentAccount?.did}>
            <StatsigProvider>
              <LoggedOutViewProvider>
                <SelectedFeedProvider>
                  <UnreadNotifsProvider>
                    <ThemeProvider theme={theme}>
                      {/* All components should be within this provider */}
                      <RootSiblingParent>
                        <GestureHandlerRootView style={s.h100pct}>
                          <TestCtrls />
                          <Shell />
                        </GestureHandlerRootView>
                      </RootSiblingParent>
                    </ThemeProvider>
                  </UnreadNotifsProvider>
                </SelectedFeedProvider>
              </LoggedOutViewProvider>
            </StatsigProvider>
          </React.Fragment>
        </Splash>
      </Alf>
    </SafeAreaProvider>
  )
}

function App() {
  const [isReady, setReady] = useState(false)

  React.useEffect(() => {
    initPersistedState().then(() => setReady(true))
  }, [])

  if (!isReady) {
    return null
  }

  /*
   * NOTE: only nothing here can depend on other data or session state, since
   * that is set up in the InnerApp component above.
   */
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <ShellStateProvider>
          <PrefsStateProvider>
            <MutedThreadsProvider>
              <InvitesStateProvider>
                <ModalStateProvider>
                  <DialogStateProvider>
                    <LightboxStateProvider>
                      <I18nProvider>
                        <PortalProvider>
                          <InnerApp />
                        </PortalProvider>
                      </I18nProvider>
                    </LightboxStateProvider>
                  </DialogStateProvider>
                </ModalStateProvider>
              </InvitesStateProvider>
            </MutedThreadsProvider>
          </PrefsStateProvider>
        </ShellStateProvider>
      </SessionProvider>
    </QueryClientProvider>
  )
}

export default App
