import type {
  BuyingGroup,
  ERC1155Token,
  NFTListing,
  Product,
  User,
} from "@/domain"
import type { UsersAction } from "./slices/users"
import type { ProductsAction } from "./slices/products"
import type { GroupsAction } from "./slices/groups"
import type { ReceiptsAction } from "./slices/receipts"

export interface AppState {
  users: User[]
  products: Product[]
  groups: BuyingGroup[]
  tokens: ERC1155Token[]
  listings: NFTListing[]
}

export type AppAction = UsersAction | ProductsAction | GroupsAction | ReceiptsAction
