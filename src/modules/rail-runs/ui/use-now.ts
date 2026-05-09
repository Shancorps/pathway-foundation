"use client"

import { useEffect, useState } from "react"

/**
 * Returns the current epoch ms, re-rendering at the given interval. Centralizes
 * the impure Date.now() call so consumers stay pure-render compliant.
 */
export function useNow(intervalMs = 30_000): number {
   
  const [now, setNow] = useState<number>(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => {
       
      setNow(Date.now())
    }, intervalMs)
    return () => {
      clearInterval(id)
    }
  }, [intervalMs])
  return now
}
