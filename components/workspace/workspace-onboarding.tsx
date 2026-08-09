import { OrganizationList } from "@clerk/nextjs";

export function WorkspaceOnboarding() {
  return (
    <main className="min-h-[calc(100vh-12rem)] bg-slate-50 px-4 py-10 sm:px-6 sm:py-16">
      <div className="mx-auto w-full max-w-5xl">
        <header className="mb-8 text-center sm:mb-10">
          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-950 text-sm font-bold tracking-tight text-white shadow-sm">
            PG
          </div>
          <p className="text-sm font-semibold tracking-tight text-slate-950">
            PlaywrightGen
          </p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            Create or join a workspace
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-base leading-7 text-slate-600">
            A workspace represents your team or organization and keeps its
            projects separate. Create a new workspace or choose one you already
            belong to.
          </p>
        </header>

        <section aria-labelledby="workspace-options-heading">
          <h2 id="workspace-options-heading" className="sr-only">
            Workspace options
          </h2>
          <div className="mx-auto flex w-full justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-sm sm:p-5">
            <OrganizationList
              afterCreateOrganizationUrl="/workspace"
              afterSelectOrganizationUrl="/workspace"
              hidePersonal
              appearance={{
                elements: {
                  rootBox: "w-full max-w-3xl",
                  cardBox: "w-full shadow-none",
                  card: "w-full shadow-none",
                },
              }}
            />
          </div>
        </section>

        <p className="mt-6 text-center text-sm leading-6 text-slate-500">
          Workspace access is managed securely through your PlaywrightGen
          account.
        </p>
      </div>
    </main>
  );
}
