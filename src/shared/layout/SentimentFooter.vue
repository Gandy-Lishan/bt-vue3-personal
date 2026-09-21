<script setup lang="ts">
import { computed } from 'vue'
import { useTheme } from '@/shared/theme/theme'
import SocialBrandIcon from '@/shared/ui/SocialBrandIcon.vue'
import { socialLinks } from '@/shared/ui/socialIcons'

interface FooterLink {
  label: string
  href?: string
  to?: string
}

const currentYear = new Date().getFullYear()
const { isDarkTheme } = useTheme()
const lightLogoUrl = 'https://cdn.prod.website-files.com/650486dd4239644e595569c1/650486dd4239644e59556a01_ST%20Logo.png'
const logoUrl = computed(() => (isDarkTheme.value ? '/avatar-sentimen-dark.png' : lightLogoUrl))

const productLinks: FooterLink[] = [
  { label: 'Dashboard', to: '/' },
  { label: 'Indicators', to: '/indicators' },
  { label: 'BacktestEdge', to: '/backtests' },
  { label: 'Smart Scanner', to: '/scannerai' },
]

const resourceLinks: FooterLink[] = [
  { label: 'Tutorials', href: 'https://users.sentimentrader.com/users/walkthrough_videos/' },
  { label: 'Help Center', href: 'https://users.sentimentrader.com/users/knowledge_base/' },
  { label: 'Methodology', href: 'https://www.sentimentrader.com/methodology/' },
  { label: 'Status', href: 'http://status.sentimentrader.com/' },
  { label: 'BacktestEdge Tutorial', href: 'https://users.sentimentrader.com/users/backtest_videos/' },
]

const legalLinks: FooterLink[] = [
  { label: 'General Disclaimer', href: 'https://sentimentrader.com/terms' },
  { label: 'Privacy Policy', href: 'https://sentimentrader.com/privacy' },
  { label: 'Terms', href: 'https://sentimentrader.com/terms' },
]

const bottomLinks: FooterLink[] = [
  { label: 'Privacy Policy', href: 'https://sentimentrader.com/privacy' },
  { label: 'Disclaimer', href: 'https://sentimentrader.com/terms' },
  { label: 'Status Page', href: 'http://status.sentimentrader.com/' },
]
</script>

<template>
  <footer class="mt-8 bg-[var(--chrome-bg)] text-[0.82rem] font-normal text-[var(--chrome-text)] shadow-[0_-8px_24px_rgba(5,16,31,0.12)]">
    <div class="px-[var(--page-gutter)]">
      <div class="grid gap-y-5 py-6 lg:grid-cols-[1.33fr_0.92fr_1.07fr_0.91fr_1.09fr] lg:pb-7 lg:pt-8">
        <div class="pr-7 lg:pt-2">
          <RouterLink class="mb-4 flex w-fit items-center" to="/">
            <img :src="logoUrl" alt="SentimenTrader logo" width="168" height="34" class="h-auto w-[158px] max-w-full object-contain sm:w-[168px]" />
          </RouterLink>
          <p class="max-w-[320px] leading-5 text-[var(--chrome-text-muted)]">
            Navigating Capital Markets with Human Intuition and Machine-Driven Technology Solutions
          </p>
        </div>

        <nav class="border-[var(--chrome-border-muted)] pr-7 lg:border-l lg:pl-8" aria-label="Footer product links">
          <h3 class="mb-2.5 text-[0.86rem] font-semibold text-[var(--chrome-heading)]">Product</h3>
          <ul class="space-y-1.5 leading-5">
            <li v-for="link in productLinks" :key="link.label">
              <RouterLink class="text-[var(--chrome-text-muted)] transition hover:text-[var(--chrome-accent)]" :to="link.to ?? '/'">{{ link.label }}</RouterLink>
            </li>
          </ul>
        </nav>

        <nav class="border-[var(--chrome-border-muted)] pr-7 lg:border-l lg:pl-8" aria-label="Footer resource links">
          <h3 class="mb-2.5 text-[0.86rem] font-semibold text-[var(--chrome-heading)]">Resources</h3>
          <ul class="space-y-1.5 leading-5">
            <li v-for="link in resourceLinks" :key="link.label">
              <a class="text-[var(--chrome-text-muted)] transition hover:text-[var(--chrome-accent)]" :href="link.href" target="_blank" rel="noopener noreferrer">
                {{ link.label }}
              </a>
            </li>
          </ul>
        </nav>

        <nav class="border-[var(--chrome-border-muted)] pr-7 lg:border-l lg:pl-8" aria-label="Footer legal links">
          <h3 class="mb-2.5 text-[0.86rem] font-semibold text-[var(--chrome-heading)]">Legal</h3>
          <ul class="space-y-1.5 leading-5">
            <li v-for="link in legalLinks" :key="link.label">
              <a class="text-[var(--chrome-text-muted)] transition hover:text-[var(--chrome-accent)]" :href="link.href" target="_blank" rel="noopener noreferrer">
                {{ link.label }}
              </a>
            </li>
          </ul>
        </nav>

        <section class="border-[var(--chrome-border-muted)] lg:border-l lg:pl-8" aria-labelledby="footer-social-heading">
          <h3 id="footer-social-heading" class="mb-4 text-[0.86rem] font-semibold text-[var(--chrome-heading)]">Stay connected</h3>
          <ul class="mb-4 flex flex-wrap items-center gap-3">
            <li v-for="link in socialLinks" :key="link.name">
              <a
                class="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--chrome-field-border)] text-[var(--chrome-text)] transition hover:border-[var(--chrome-accent)] hover:text-[var(--chrome-accent)]"
                :href="link.href"
                target="_blank"
                rel="noopener noreferrer"
                :title="link.label"
                :aria-label="link.label"
              >
                <SocialBrandIcon :name="link.name" :size="15" />
              </a>
            </li>
          </ul>
          <a
            class="inline-flex h-8 w-full max-w-[240px] items-center justify-center rounded-md border border-[var(--chrome-accent)] px-4 text-[0.82rem] font-medium text-[var(--chrome-accent)] transition hover:bg-[var(--chrome-active-bg)]"
            href="https://users.sentimentrader.com/users/account/support/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Contact Support
          </a>
        </section>
      </div>

      <div class="grid gap-5 border-y border-[var(--chrome-border-muted)] py-5 lg:grid-cols-[2fr_1fr] lg:py-5">
        <section class="lg:pr-10" aria-labelledby="footer-about-heading">
          <h2 id="footer-about-heading" class="mb-2 text-[1.05rem] font-normal text-[var(--chrome-text)]">About us</h2>
          <div class="max-w-[980px] space-y-2 leading-[1.4] text-[var(--chrome-text-muted)]">
            <p>
              Sundial Capital Research is an independent investment research firm dedicated to the application
              of mass psychology to the financial markets. Sundial publishes the SentimenTrader.com website.
            </p>
            <p>
              Our focus is not market timing per se, but rather risk management. That may be a distinction without
              a difference, but it's how we approach the markets. We study signs that suggest it is time to raise or lower
              market exposure as a function of risk relative to probable reward. It is all about risk-adjusted expectations
              given existing evidence.
            </p>
          </div>
        </section>

        <section class="border-[var(--chrome-border-muted)] lg:border-l lg:pl-10" aria-labelledby="footer-contact-heading">
          <h2 id="footer-contact-heading" class="mb-2.5 text-[1.05rem] font-normal text-[var(--chrome-text)]">Contact information</h2>
          <address class="space-y-1.5 leading-5 text-[var(--chrome-text-muted)] not-italic">
            <p>Sundial Capital Research</p>
            <p>12527 Central Avenue NE, Suite 165</p>
            <p>Blaine, MN 55434</p>
            <a class="text-[var(--chrome-accent)] transition hover:text-[var(--chrome-text)]" href="mailto:admin@sentimentrader.com">
              admin@sentimentrader.com
            </a>
          </address>
        </section>
      </div>

      <div class="flex flex-col gap-2 py-4 text-[0.78rem] text-[var(--chrome-text-muted)] lg:flex-row lg:items-center lg:justify-between">
        <p class="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span>© 2001 - {{ currentYear }} Sundial Capital Research, Inc. All rights reserved.</span>
          <template v-for="(link, index) in bottomLinks" :key="link.label">
            <span v-if="index > 0" class="text-[var(--chrome-field-border)]" aria-hidden="true">|</span>
            <a class="text-[var(--chrome-accent)] transition hover:text-[var(--chrome-text)]" :href="link.href" target="_blank" rel="noopener noreferrer">
              {{ link.label }}
            </a>
          </template>
        </p>
        <p>Investment research, not investment advice.</p>
      </div>
    </div>
  </footer>
</template>
