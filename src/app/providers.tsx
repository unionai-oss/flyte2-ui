'use client'


/**
 * © Copyright Union Systems Inc 2026. All rights reserved.
 */
import { LoginPanel } from '@/components/LoginPanel'
import { finalTransport, isLocalDev, queryClient } from '@/lib/apiUtils'
import { AuthStatusProvider } from '@/providers/authStatus'
import { NotificationsProvider } from '@/providers/notifications'
import { TransportProvider } from '@connectrpc/connect-query'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { ThemeProvider } from 'next-themes'
import { NuqsAdapter } from 'nuqs/adapters/next/app'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
      <ThemeProvider
        attribute="class"
        disableTransitionOnChange
        themes={['flyte']}
        defaultTheme="flyte"
        forcedTheme="flyte"
      >
        <TransportProvider transport={finalTransport}>
          <QueryClientProvider client={queryClient}>
            <AuthStatusProvider>
              <NuqsAdapter>
                <NotificationsProvider>
                  {children}
                  {isLocalDev && (
                    <ReactQueryDevtools
                      initialIsOpen={false}
                      buttonPosition="bottom-right"
                    />
                  )}
                  <LoginPanel />
                </NotificationsProvider>
              </NuqsAdapter>
            </AuthStatusProvider>
          </QueryClientProvider>
        </TransportProvider>
      </ThemeProvider>
  )
}
