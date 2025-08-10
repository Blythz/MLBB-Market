import type { Timestamp } from "firebase/firestore"

export type ListingStatus = "active" | "sold"

export type Listing = {
  id: string
  title: string
  description: string
  price: number
  imageUrls: string[] // primary image is imageUrls[0]
  userId: string
  status?: ListingStatus
  createdAt?: Timestamp | null
  updatedAt?: Timestamp | null
  soldAt?: Timestamp | null
}
