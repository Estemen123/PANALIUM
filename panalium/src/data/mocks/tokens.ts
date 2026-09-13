import type { ERC1155Token } from "@/domain"

const TWS_IMAGE =
  "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&h=400&fit=crop&auto=format"

/** ERC-1155 receipt tokens minted after the supplier payment was confirmed. */
export const MOCK_TOKENS: ERC1155Token[] = [
  {
    id: "tok1",
    tokenId: "g3",
    groupId: "g3",
    groupName: "Auriculares Bluetooth TWS",
    productImage: TWS_IMAGE,
    ownerId: "u5",
    amount: 60,
    mintedAt: "2026-09-07",
    status: "held",
    supplierETA: "2026-10-24",
  },
  {
    id: "tok2",
    tokenId: "g3",
    groupId: "g3",
    groupName: "Auriculares Bluetooth TWS",
    productImage: TWS_IMAGE,
    ownerId: "u1",
    amount: 40,
    mintedAt: "2026-09-07",
    status: "listed",
    supplierETA: "2026-10-24",
  },
  {
    id: "tok3",
    tokenId: "g3",
    groupId: "g3",
    groupName: "Auriculares Bluetooth TWS",
    productImage: TWS_IMAGE,
    ownerId: "u4",
    amount: 20,
    mintedAt: "2026-09-07",
    status: "held",
    supplierETA: "2026-10-24",
  },
]
