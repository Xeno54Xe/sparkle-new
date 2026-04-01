"use client"

import { useState } from "react"
import { getStockLogoUrl, hasLogo } from "@/lib/stock-logos"
import { cn } from "@/lib/utils"

interface StockLogoProps {
  symbol: string
  size?: number
  className?: string
  isPositive?: boolean
}

export function StockLogo({ symbol, size = 40, className, isPositive = true }: StockLogoProps) {
  const [imgError, setImgError] = useState(false)
  const logoUrl = getStockLogoUrl(symbol)
  const showImg = logoUrl && !imgError

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-lg overflow-hidden",
        !showImg && (isPositive ? "bg-primary/20 text-primary" : "bg-destructive/20 text-destructive"),
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
        <span className="font-bold" style={{ fontSize: size * 0.3 }}>
          {symbol.slice(0, 2)}
        </span>
      )}
    </div>
  )
}
