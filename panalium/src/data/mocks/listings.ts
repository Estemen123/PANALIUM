import type { NFTListing } from "@/domain"

const TWS_IMAGE =
  "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&h=400&fit=crop&auto=format"

/** Secondary-market listings of ERC-1155 receipts. */
export const MOCK_LISTINGS: NFTListing[] = [
  {
    id: "lst1",
    tokenId: "g3",
    groupId: "g3",
    groupName: "Auriculares Bluetooth TWS",
    productImage: TWS_IMAGE,
    sellerId: "u1",
    sellerName: "Carlos Mendoza",
    amount: 15,
    askPrice: 9.5,
    askCurrency: "USDC",
    listingStatus: "active",
    createdAt: "2026-09-09",
    supplierETA: "2026-10-24",
  },
  {
    id: "lst2",
    tokenId: "g3",
    groupId: "g3",
    groupName: "Auriculares Bluetooth TWS",
    productImage: TWS_IMAGE,
    sellerId: "u1",
    sellerName: "Carlos Mendoza",
    amount: 25,
    askPrice: 88000,
    askCurrency: "BS",
    listingStatus: "active",
    createdAt: "2026-09-10",
    supplierETA: "2026-10-24",
  },
]
