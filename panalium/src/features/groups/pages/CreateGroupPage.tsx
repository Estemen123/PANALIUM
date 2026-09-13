import { Page, PageHeader } from "@/shared/ui"
import { useTimedFlag } from "@/shared/hooks"
import { useNavigation } from "@/app/navigation"
import type { GroupType } from "@/domain"
import { useGroupActions } from "../hooks/useGroups"
import GroupForm from "../components/GroupForm"

const REDIRECT_MS = 1500

interface HeaderCopy {
  title: string
  description: string
}

const HEADERS: Record<GroupType, HeaderCopy> = {
  local: {
    title: "Fundar un Panal",
    description: "Reúne Abejas para comprar un producto nacional al mayor.",
  },
  international: {
    title: "Panal de importación",
    description:
      "Organiza una compra internacional desde Alibaba u otras plataformas.",
  },
}

/** Página compartida para fundar Panales locales y de importación. */
export default function CreateGroupPage({ type }: { type: GroupType }) {
  const { navigate } = useNavigation()
  const { createGroup } = useGroupActions()
  const [success, showSuccess] = useTimedFlag(REDIRECT_MS, () =>
    navigate("my-groups"),
  )
  const header = HEADERS[type]

  return (
    <Page width="sm">
      <PageHeader title={header.title} description={header.description} />
      <GroupForm
        key={type}
        type={type}
        success={success}
        onCancel={() => navigate("dashboard")}
        onSubmit={async (input) => {
          await createGroup(input)
          showSuccess()
        }}
      />
    </Page>
  )
}

export function CreateLocalGroupPage() {
  return <CreateGroupPage type="local" />
}

export function CreateIntlGroupPage() {
  return <CreateGroupPage type="international" />
}
