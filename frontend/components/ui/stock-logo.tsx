"use client"

import { useState } from "react"
import { getStockLogoUrl } from "@/lib/stock-logos"
import { cn } from "@/lib/utils"

interface StockLogoProps {
  symbol: string
  size?: number
  className?: string
  /** Extra classes for the text initials shown when no logo is available */
  fallbackClassName?: string
  isPositive?: boolean
}

export function StockLogo({ symbol, size = 40, className, fallbackClassName, isPositive = true }: StockLogoProps) {
  const [imgError, setImgError] = useState(false)
  const logoUrl = getStockLogoUrl(symbol)
  const showImg = logoUrl && !imgError

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-lg overflow-hidden",
        !showImg && (isPositive ? "bg-up/20 text-up" : "bg-down/20 text-down"),
        showImg && "bg-white",
        className
      )}
      style={{ width: size, height: size }}
    >
      {showImg ? (
        <img
          src={logoUrl}
          alt={symbol}
          width={size - 8}
          height={size - 8}
          className="object-contain"
          onError={() => setImgError(true)}
          style={{ width: size - 8, height: size - 8 }}
        />
      ) : (
        <span className={cn("font-bold", fallbackClassName)} style={{ fontSize: size * 0.3 }}>
          {symbol.slice(0, 2)}
        </span>
      )}
    </div>
  )
}
