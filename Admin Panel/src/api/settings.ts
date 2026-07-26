import { apiRequest } from './client'
import type { SurveyLinkSetting, UpdateSurveyLinkPayload } from './types'

export function getSurveyLinkBase() {
  return apiRequest<SurveyLinkSetting>('/settings/survey-link-base')
}

export function updateSurveyLinkBase(payload: UpdateSurveyLinkPayload) {
  return apiRequest<SurveyLinkSetting>('/settings/survey-link-base', {
    method: 'PUT',
    body: payload,
  })
}
