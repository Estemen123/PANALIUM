import { Card, Page, PageHeader } from "@/shared/ui"
import { useAppState } from "@/store"
import UserRow from "../components/UserRow"

export default function AdminUsersPage() {
  const { users } = useAppState()
  return (
    <Page width="lg">
      <PageHeader
        title="Abejas"
        description={`${users.length} Abejas registradas en la colmena.`}
      />
      <Card className="divide-y divide-border">
        {users.map((u) => (
          <UserRow key={u.id} user={u} />
        ))}
      </Card>
    </Page>
  )
}
