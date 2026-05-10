import { notFound, redirect } from "next/navigation"
import { PageShell } from "@/components/ui/page-shell"
import { TitleBlock } from "@/components/ui/title-block"
import { getSession } from "@/modules/auth/session"
import { getManifestForOrg } from "@/modules/manifests/queries"
import { ManifestBuilder } from "@/modules/manifests/ui/manifest-builder"

interface Props {
  params: Promise<{ manifestId: string }>
}

export default async function ManifestBuilderPage({ params }: Props) {
  const { manifestId } = await params
  const session = await getSession()
  if (!session?.user) redirect("/sign-in")
  const orgId = session.session.activeOrganizationId
  if (!orgId) redirect("/onboarding/create-organization")

  const manifest = await getManifestForOrg(orgId, manifestId)
  if (!manifest) notFound()

  return (
    <PageShell>
      <TitleBlock
        coordinate="05 / Admin · Manifest Management"
        title={manifest.name}
        subtitle={manifest.description ?? "Define the fields collected by this manifest template."}
      />
      <div className="mt-6">
        <ManifestBuilder manifest={manifest} />
      </div>
    </PageShell>
  )
}
