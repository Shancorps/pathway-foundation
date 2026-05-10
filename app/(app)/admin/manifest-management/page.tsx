import { redirect } from "next/navigation"
import { PageShell } from "@/components/ui/page-shell"
import { TitleBlock } from "@/components/ui/title-block"
import { hasPermission } from "@/modules/auth/permissions"
import { getSession } from "@/modules/auth/session"
import { listManifestsForOrg } from "@/modules/manifests/queries"
import { ManifestList } from "@/modules/manifests/ui/manifest-list"

export default async function ManifestManagementPage() {
  const session = await getSession()
  if (!session?.user) redirect("/sign-in")
  const orgId = session.session.activeOrganizationId
  if (!orgId) redirect("/onboarding/create-organization")

  const canBuild = await hasPermission(orgId, session.user.id, "canBuildManifests")
  if (!canBuild) redirect("/dashboard")

  const items = await listManifestsForOrg(orgId)

  return (
    <PageShell>
      <TitleBlock
        coordinate="05 / Admin · Manifest Management"
        title="Manifests"
        subtitle="Capture structured team input. Manifest templates collect data on rails."
      />
      <div className="mt-10">
        <ManifestList manifests={items} />
      </div>
    </PageShell>
  )
}
