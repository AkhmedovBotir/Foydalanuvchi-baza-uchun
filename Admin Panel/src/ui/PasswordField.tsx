import { useState } from 'react'
import {
  IconButton,
  InputAdornment,
  TextField,
  type TextFieldProps,
} from '@mui/material'
import {
  VisibilityOffRounded,
  VisibilityRounded,
} from '@mui/icons-material'

export type PasswordFieldProps = Omit<TextFieldProps, 'value' | 'onChange' | 'type'> & {
  value: string
  onChange: (value: string) => void
}

export function PasswordField({
  value,
  onChange,
  label = 'Parol',
  fullWidth = true,
  slotProps,
  ...rest
}: PasswordFieldProps) {
  const [show, setShow] = useState(false)
  const inputSlot =
    slotProps && typeof slotProps === 'object' && 'input' in slotProps
      ? (slotProps.input as object | undefined)
      : undefined

  return (
    <TextField
      {...rest}
      fullWidth={fullWidth}
      label={label}
      type={show ? 'text' : 'password'}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      autoComplete={rest.autoComplete ?? 'new-password'}
      slotProps={{
        ...slotProps,
        input: {
          ...inputSlot,
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                edge="end"
                onClick={() => setShow((v) => !v)}
                onMouseDown={(e) => e.preventDefault()}
                aria-label={show ? 'Parolni yashirish' : 'Parolni ko‘rsatish'}
                size="small"
                tabIndex={-1}
              >
                {show ? (
                  <VisibilityOffRounded fontSize="small" />
                ) : (
                  <VisibilityRounded fontSize="small" />
                )}
              </IconButton>
            </InputAdornment>
          ),
        },
      }}
    />
  )
}
