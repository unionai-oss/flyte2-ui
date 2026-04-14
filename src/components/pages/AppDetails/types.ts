/**
 * © Copyright Union Systems Inc 2026. All rights reserved.
 */

export type ProjectDomainParams = {
  domain: string
  project: string
}

export type AppDetailsParams = ProjectDomainParams & {
  appId: string
}
