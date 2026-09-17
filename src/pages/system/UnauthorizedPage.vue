<template>
  <main class="min-h-screen bg-[var(--app-bg)] px-[var(--page-gutter)] py-8 text-[var(--app-text)]">
    <section class="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-6">
      <p class="text-sm font-semibold text-[var(--app-primary)]">401</p>
      <h1 class="mt-2 text-2xl font-semibold">Access restricted</h1>
      <p class="mt-2 max-w-2xl text-sm leading-6 text-[var(--app-text-secondary)]">
        You have not logged in or this account does not have permission to view this page.
      </p>
      <RouterLink class="mt-5 inline-flex h-10 items-center rounded-md bg-[var(--app-primary)] px-4 text-sm font-semibold text-white" to="/">
        Back to dashboard
      </RouterLink>
    </section>
  </main>
</template>
