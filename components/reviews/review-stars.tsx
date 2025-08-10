import { Star } from "lucide-react"

type Props = {
  rating: number
  count: number
  size?: number
  showCount?: boolean
}

export default function ReviewStars({ rating, count, size = 16, showCount = true }: Props) {
  if (count === 0) return null

  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center">
        <Star className={`text-yellow-400 fill-yellow-400`} style={{ width: size, height: size }} />
        <span className="text-xs font-medium text-neutral-300 ml-1">{rating.toFixed(1)}</span>
      </div>
      {showCount && <span className="text-xs text-neutral-500">({count})</span>}
    </div>
  )
}
