import { useState } from "react"

import { Button, EmptyState, Modal, Page, PageHeader } from "@/shared/ui"

import { useNavigation } from "@/app/navigation"

import { useCurrentUser } from "@/features/auth"

import { useGroupActions, useMyGroups } from "../hooks/useGroups"

import MyGroupCard from "../components/MyGroupCard"

import GroupForm from "../components/GroupForm"

export default function MyGroupsPage() {
  const user = useCurrentUser()

  const { navigate } = useNavigation()

  const myGroups = useMyGroups()

  const { createGroup } = useGroupActions()

  const [isCreateOpen, setCreateOpen] = useState(false)

  return (
    <>
      <Page width="lg">
        <PageHeader
          title="Mis Panales"
          description="Los Panales que fundaste o donde vuelas con otras Abejas."
          actions={
            <Button onClick={() => setCreateOpen(true)}>Fundar un Panal</Button>
          }
        />

        {myGroups.length === 0 ? (
          <EmptyState
            title="Aún no tienes Panales"
            description="Toda colmena empieza con una Abeja: funda el primero o únete a uno abierto."
            action={
              <Button
                variant="secondary"
                onClick={() => navigate("marketplace-groups")}
              >
                Explorar Panales
              </Button>
            }
          />
        ) : (
          <div className="flex flex-col gap-4">
            {myGroups.map((g) => (
              <MyGroupCard
                key={g.id}
                group={g}
                userId={user.id}
                onClick={() => navigate("marketplace-groups")}
              />
            ))}
          </div>
        )}
      </Page>

      {isCreateOpen && (
        <Modal
          title="Fundar un Panal"
          description="Crea un Panal nuevo para reunir a otras Abejas y comprar al mayor."
          size="lg"
          onClose={() => setCreateOpen(false)}
        >
          <GroupForm
            type="local"
            success={false}
            onCancel={() => setCreateOpen(false)}
            onSubmit={(input) => {
              createGroup(input)

              setCreateOpen(false)
            }}
          />
        </Modal>
      )}
    </>
  )
}
