/**
 * © Copyright Union Systems Inc 2026. All rights reserved.
 */

/** Union.ai Flyte v2 user guide (base path for topic links below). */
const UNION_AI_FLYTE_USER_GUIDE_BASE =
  'https://www.union.ai/docs/v2/flyte/user-guide'

/** Primary docs entry (same destination as the legacy BYOC user guide URL). */
export const FLYTE_DOCS_HOME_URL = UNION_AI_FLYTE_USER_GUIDE_BASE

/** Flyte 2 section in the docs (linked from in-app documentation nav). */
export const FLYTE_DOCS_FLYTE2_URL = `${UNION_AI_FLYTE_USER_GUIDE_BASE}/flyte-2/`

/** Task reports / live output in the UI. */
export const FLYTE_DOCS_REPORTS_URL = `${UNION_AI_FLYTE_USER_GUIDE_BASE}/task-programming/reports/`

/** Flyte Apps (intro). */
export const FLYTE_DOCS_APPS_URL = `${UNION_AI_FLYTE_USER_GUIDE_BASE}/core-concepts/introducing-apps/`

/** `flyte deploy` and Flyte CLI reference. */
export const FLYTE_DOCS_FLYTE_CLI_DEPLOY_URL =
  'https://www.union.ai/docs/v2/byoc/api-reference/flyte-cli/#flyte-deploy'

/** Licensed edition / upgrade CTA. */
export const FLYTE_LICENSED_EDITION_INFO_URL = 'https://www.union.ai/pricing'

/** Support contact (e.g. 404 page). */
export const SUPPORT_CONTACT_MAILTO_URL = 'mailto:support@union.ai'

/** @deprecated Use FLYTE_DOCS_HOME_URL */
export const DOCS_BYOC_USER_GUIDE_URL = FLYTE_DOCS_HOME_URL

/** Canonical public repository for this UI (OSS distribution). */
export const FLYTE2_UI_REPO_URL = 'https://github.com/unionai-oss/flyte2-ui'

/** Union License full text in the canonical repository (same file is shipped as `UNION-LICENSE.txt` in this tree). */
export const FLYTE2_UI_LICENSE_URL =
  'https://github.com/unionai-oss/flyte2-ui/blob/main/UNION-LICENSE.txt'
