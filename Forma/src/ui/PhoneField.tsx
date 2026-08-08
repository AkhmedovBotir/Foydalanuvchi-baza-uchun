import {
  Box,
  InputAdornment,
  TextField,
  type TextFieldProps,
} from '@mui/material'
import { formatUzPhoneMask, toUzPhoneE164 } from '../lib/phone'

export type PhoneFieldProps = Omit<TextFieldProps, 'value' | 'onChange' | 'type'> & {
  value: string
  onChange: (value: string) => void
}

export function PhoneField({
  value,
  onChange,
  label,
  placeholder = '90 123 45 67',
  fullWidth = true,
  slotProps,
  ...rest
}: PhoneFieldProps) {
  const display = formatUzPhoneMask(value || '')

  return (
    <TextField
      {...rest}
      fullWidth={fullWidth}
      label={label}
      value={display}
      placeholder={placeholder}
      type="tel"
      autoComplete="tel-national"
      onChange={(e) => onChange(toUzPhoneE164(e.target.value))}
      slotProps={{
        ...slotProps,
        input: {
          ...slotProps?.input,
          startAdornment: (
            <InputAdornment position="start" sx={{ mr: 0.5 }}>
              <Box
                component="span"
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  pr: 1.25,
                  mr: 0.25,
                  borderRight: '1px solid',
                  borderColor: 'divider',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  color: 'text.secondary',
                  letterSpacing: '0.02em',
                  userSelect: 'none',
                }}
              >
                +998
              </Box>
            </InputAdornment>
          ),
        },
        htmlInput: {
          ...slotProps?.htmlInput,
          inputMode: 'numeric',
          maxLength: 12,
          'aria-label': typeof label === 'string' && label ? label : 'Telefon raqam',
        },
      }}
    />
  )
}
