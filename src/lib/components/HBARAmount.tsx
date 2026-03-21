import { useEffect, useState } from 'react';

export interface HBARAmountProps {
  /** Amount in HBAR */
  value: number;
  /** Show USD equivalent. Fetches price from CoinGecko. Default: false */
  showUsd?: boolean;
  /** Decimal places for HBAR. Default: 4 */
  decimals?: number;
  /** Show the ℏ symbol. Default: true */
  showSymbol?: boolean;
  /** 'sm' | 'base' | 'lg' | 'xl'. Default: 'base' */
  size?: 'sm' | 'base' | 'lg' | 'xl';
  className?: string;
}

const SIZE_CLASSES = {
  sm:   'text-sm',
  base: 'text-base',
  lg:   'text-lg font-semibold',
  xl:   'text-2xl font-bold',
};

let cachedPrice: number | null = null;
let cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 min

async function fetchHbarPrice(): Promise<number | null> {
  if (cachedPrice && Date.now() - cacheTime < CACHE_TTL) return cachedPrice;
  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=hedera-hashgraph&vs_currencies=usd'
    );
    const data = await res.json();
    const price = data['hedera-hashgraph']?.usd ?? null;
    if (price) { cachedPrice = price; cacheTime = Date.now(); }
    return price;
  } catch {
    return null;
  }
}

/**
 * Display a HBAR amount with optional USD conversion.
 * Automatically fetches the HBAR/USD price from CoinGecko (cached 5 min).
 *
 * @example
 * <HBARAmount value={1234.56} showUsd size="xl" />
 * // → 1,234.5600 ℏ ($247.23)
 */
export function HBARAmount({
  value,
  showUsd = false,
  decimals = 4,
  showSymbol = true,
  size = 'base',
  className = '',
}: HBARAmountProps) {
  const [usdPrice, setUsdPrice] = useState<number | null>(null);

  useEffect(() => {
    if (!showUsd) return;
    void fetchHbarPrice().then(setUsdPrice);
  }, [showUsd]);

  const formatted = value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  const usdValue = usdPrice != null ? value * usdPrice : null;
  const usdFormatted = usdValue?.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <span className={`inline-flex items-baseline gap-1.5 ${SIZE_CLASSES[size]} ${className}`}>
      <span className="font-mono text-slate-100">{formatted}</span>
      {showSymbol && (
        <span className="text-violet-400 font-semibold">ℏ</span>
      )}
      {showUsd && usdFormatted && (
        <span className="text-slate-500 text-sm font-normal">
          ({usdFormatted})
        </span>
      )}
    </span>
  );
}
