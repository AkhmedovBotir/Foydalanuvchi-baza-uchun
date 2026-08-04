import { useEffect, useState } from 'react'
import { getToken } from '../../api/client'

type Props = {
  path: string
  alt?: string
  className?: string
}

export function AuthImage({ path, alt = '', className }: Props) {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    let revoked: string | null = null
    let cancelled = false
    const token = getToken()
    const full = path.startsWith('/api') ? path : `/api/v1${path.replace(/^\/api\/v1/, '')}`
    void fetch(full.startsWith('/api') ? full : path, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((res) => {
        if (!res.ok) throw new Error('img')
        return res.blob()
      })
      .then((blob) => {
        if (cancelled) return
        const objectUrl = URL.createObjectURL(blob)
        revoked = objectUrl
        setUrl(objectUrl)
      })
      .catch(() => {
        if (!cancelled) setUrl(null)
      })
    return () => {
      cancelled = true
      if (revoked) URL.revokeObjectURL(revoked)
    }
  }, [path])

  if (!url) return <div className={`animate-pulse bg-slate-100 ${className ?? ''}`} />
  return <img src={url} alt={alt} className={className} />
}
