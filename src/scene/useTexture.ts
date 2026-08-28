import { useEffect, useState } from 'react'
import { ClampToEdgeWrapping, RepeatWrapping, SRGBColorSpace, Texture, TextureLoader } from 'three'

export function useOptionalTexture(url: string | null, repeat = true) {
  const [tex, setTex] = useState<Texture | null>(null)

  useEffect(() => {
    if (!url) {
      setTex(null)
      return
    }
    let cancelled = false
    let loaded: Texture | null = null
    const loader = new TextureLoader()
    loader.load(
      url,
      (t) => {
        if (cancelled) {
          t.dispose()
          return
        }
        t.wrapS = repeat ? RepeatWrapping : ClampToEdgeWrapping
        t.wrapT = repeat ? RepeatWrapping : ClampToEdgeWrapping
        t.anisotropy = 8
        t.colorSpace = SRGBColorSpace
        loaded = t
        setTex(t)
      },
      undefined,
      () => {
        if (!cancelled) setTex(null)
      },
    )
    return () => {
      cancelled = true
      loaded?.dispose()
    }
  }, [url, repeat])

  return tex
}
