export type SellerStatus = "not_applied" | "pending" | "approved" | "rejected"
export type UserRole = "user" | "seller" | "admin"

export interface UserProfile {
  uid: string
  email: string
  displayName?: string
  fullName?: string
  photoURL?: string
  role: UserRole
  sellerStatus: SellerStatus
  createdAt?: any
  updatedAt?: any
}
