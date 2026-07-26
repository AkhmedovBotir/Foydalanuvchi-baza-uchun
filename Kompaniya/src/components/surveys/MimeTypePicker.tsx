import type { ComponentProps } from 'react'
import { CheckboxStringList } from './CheckboxStringList'

type PickerProps = Omit<ComponentProps<typeof CheckboxStringList>, 'label' | 'emptyMessage'> & {
  label?: string
}

export function MimeTypePicker(props: PickerProps) {
  return (
    <CheckboxStringList
      label={props.label ?? 'MIME turlar'}
      emptyMessage="MIME turlar ro'yxati yuklanmadi"
      {...props}
    />
  )
}

export function ExtensionPicker(props: PickerProps) {
  return (
    <CheckboxStringList
      label={props.label ?? 'Kengaytmalar'}
      emptyMessage="Kengaytmalar ro'yxati yuklanmadi"
      {...props}
    />
  )
}
