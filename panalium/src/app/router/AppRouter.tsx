import { useNavigation } from "@/app/navigation"
import { ROUTES } from "./routes"

/** Renders the page registered for the current view. */
export default function AppRouter() {
  const { view } = useNavigation()
  const Page = ROUTES[view]
  return <Page key={view} />
}
