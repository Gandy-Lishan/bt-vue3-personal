<template>
  <main class="min-h-screen bg-[var(--app-bg)] px-[var(--page-gutter)] py-5 text-[var(--app-text)]">
    <section class="w-full">
      <RouterLink class="text-sm font-medium text-[var(--app-positive)] hover:text-[var(--app-primary)]" to="/">
        Back to dashboard
      </RouterLink>
      <div class="mt-5 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-5 shadow-sm">
        <h1 class="text-2xl font-semibold text-[var(--app-text)]">Backtests</h1>
        <p class="mt-2 max-w-2xl text-sm text-[var(--app-text-secondary)]">
          This route is ready for the migrated strategy builder, result browser, and execution history.
        </p>
      </div>
    </section>
  </main>
</template>
