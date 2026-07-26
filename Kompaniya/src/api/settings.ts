import { apiRequest } from './client'
import type { SurveyLinkBaseSetting, UpdateSurveyLinkBasePayload } from './types'

export function getSurveyLinkBase() {
  return apiRequest<SurveyLinkBaseSetting>('/settings/survey-link-base')
}

export function updateSurveyLinkBase(payload: UpdateSurveyLinkBasePayload) {
  return apiRequest<SurveyLinkBaseSetting>('/settings/survey-link-base', {
    method: 'PUT',
    body: payload,
  })
}
