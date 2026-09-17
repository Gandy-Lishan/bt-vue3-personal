<script setup lang="ts">
const currentYear = new Date().getFullYear()
const logoUrl = 'https://cdn.prod.website-files.com/650486dd4239644e595569c1/650486dd4239644e59556a01_ST%20Logo.png'

const productLinks = ['Dashboard', 'Indicators', 'BacktestEdge', 'Smart Scanner']
const resourceLinks = ['Tutorials', 'Help Center', 'Methodology', 'Status', 'BacktestEdge Tutorial']
const legalLinks = ['General Disclaimer', 'Privacy Policy', 'Terms']
</script>

<template>
  <footer class="mt-8 bg-[var(--chrome-bg)] px-[var(--page-gutter)] py-8 text-[14px] font-normal text-white shadow-[0_-10px_30px_rgba(5,16,31,0.12)]">
    <div class="grid gap-8 border-b border-[var(--chrome-border-muted)] pb-6 lg:grid-cols-[1.55fr_0.75fr_0.8fr_0.7fr_1.15fr]">
      <div>
        <RouterLink class="mb-5 flex items-center" to="/">
          <img :src="logoUrl" alt="SentimenTrader logo" width="175" height="35" class="h-[35px] w-[175px] object-contain" />
        </RouterLink>
        <p class="max-w-[320px] text-[14px] font-normal leading-6 text-[var(--chrome-text-muted)]">
          Independent investment research focused on market sentiment and risk.
        </p>
      </div>

      <div>
        <h3 class="mb-3 text-[14px] font-normal text-[var(--chrome-heading)]">Product</h3>
        <ul class="space-y-2">
          <li v-for="link in productLinks" :key="link">
            <RouterLink class="text-[14px] font-normal text-[var(--chrome-text-muted)] hover:text-white" to="/indicators">{{ link }}</RouterLink>
          </li>
        </ul>
      </div>

      <div>
        <h3 class="mb-3 text-[14px] font-normal text-[var(--chrome-heading)]">Resources</h3>
        <ul class="space-y-2">
          <li v-for="link in resourceLinks" :key="link">
            <RouterLink class="text-[14px] font-normal text-[var(--chrome-text-muted)] hover:text-white" to="/doc/guide/0">{{ link }}</RouterLink>
          </li>
        </ul>
      </div>

      <div>
        <h3 class="mb-3 text-[14px] font-normal text-[var(--chrome-heading)]">Legal</h3>
        <ul class="space-y-2">
          <li v-for="link in legalLinks" :key="link">
            <RouterLink class="text-[14px] font-normal text-[var(--chrome-text-muted)] hover:text-white" to="/doc/disclaimer">{{ link }}</RouterLink>
          </li>
        </ul>
      </div>

      <div class="border-[var(--chrome-border-muted)] lg:border-l lg:pl-8">
        <h3 class="mb-4 text-[14px] font-normal text-white">Stay connected</h3>
        <ul class="mb-5 flex items-center gap-3">
          <li>
            <a class="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--chrome-field-border)] bg-[var(--chrome-menu-bg-alt)] text-[14px] font-normal hover:border-[var(--chrome-accent)] hover:text-[var(--chrome-accent)]" href="https://facebook.com/sentimentrader" target="_blank" rel="noopener noreferrer">f</a>
          </li>
          <li>
            <a class="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--chrome-field-border)] bg-[var(--chrome-menu-bg-alt)] text-[14px] font-normal hover:border-[var(--chrome-accent)] hover:text-[var(--chrome-accent)]" href="https://www.linkedin.com/company/sentimentrader" target="_blank" rel="noopener noreferrer">in</a>
          </li>
          <li>
            <a class="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--chrome-field-border)] bg-[var(--chrome-menu-bg-alt)] text-[14px] font-normal hover:border-[var(--chrome-accent)] hover:text-[var(--chrome-accent)]" href="https://youtube.com/sentimentrader" target="_blank" rel="noopener noreferrer">yt</a>
          </li>
          <li>
            <a class="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--chrome-field-border)] bg-[var(--chrome-menu-bg-alt)] text-[14px] font-normal hover:border-[var(--chrome-accent)] hover:text-[var(--chrome-accent)]" href="https://twitter.com/sentimentrader" target="_blank" rel="noopener noreferrer">x</a>
          </li>
        </ul>
        <a class="inline-flex h-10 w-full max-w-[220px] items-center justify-center rounded-md border border-[var(--chrome-accent)] text-[14px] font-normal text-[var(--chrome-heading)] hover:bg-[var(--chrome-active-bg)]" href="https://users.sentimentrader.com/users/account/support/" target="_blank" rel="noopener noreferrer">
          Contact Support
        </a>
      </div>
    </div>

    <div class="flex flex-col gap-3 pt-4 text-[14px] font-normal text-[var(--chrome-text-muted)] md:flex-row md:items-center md:justify-between">
      <p>© 2001 - {{ currentYear }} Sundial Capital Research, Inc. All rights reserved.</p>
      <p>Investment research, not investment advice.</p>
    </div>
  </footer>
</template>
