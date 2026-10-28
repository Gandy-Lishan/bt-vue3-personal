<script setup lang="ts">
import { ArrowRight, CalendarDays, LockKeyhole, LockKeyholeOpen, Star } from '@lucide/vue'
import type { ReportLibraryItem } from '@/entities/report/model/report.types'

withDefaults(defineProps<{
  reports: ReportLibraryItem[]
  compact?: boolean
}>(), {
  compact: false,
})

function formatDate(value: string) {
  const date = new Date(value.length === 10 ? `${value}T00:00:00` : value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}
</script>

<template>
  <div class="report-card-grid" :class="{ 'report-card-grid--compact': compact }">
    <article v-for="report in reports" :key="report.id" class="report-grid-card">
      <div class="report-grid-card__bar" :class="{ 'report-grid-card__bar--public': report.isPublic }">
        <div class="report-grid-card__brand">
          <LockKeyholeOpen v-if="report.isPublic" :size="15" />
          <LockKeyhole v-else :size="15" />
          <span>{{ report.category }}</span>
        </div>
        <Star v-if="report.isFavorite" :size="15" fill="currentColor" aria-label="Favorite report" />
      </div>

      <a :href="report.href" class="report-grid-card__image-link" :aria-label="`Read ${report.title}`">
        <img
          v-if="report.imageUrl"
          :src="report.imageUrl"
          :alt="`${report.title} preview`"
          class="report-grid-card__image"
          loading="lazy"
        />
        <div v-else class="report-grid-card__placeholder">{{ report.category }}</div>
      </a>

      <div class="report-grid-card__content">
        <a :href="report.href" class="report-grid-card__title">{{ report.title }}</a>
        <p class="report-grid-card__description">
          {{ report.excerpt || 'Read the latest data-driven research and market analysis from SentimenTrader.' }}
        </p>

        <div class="report-grid-card__footer">
          <div class="report-grid-card__meta">
            <span><CalendarDays :size="14" />{{ formatDate(report.publishedAt) }}</span>
            <span aria-hidden="true">•</span>
            <span>{{ report.author }}</span>
          </div>
          <a :href="report.href" class="report-grid-card__action">
            Read Report
            <ArrowRight :size="16" />
          </a>
        </div>
      </div>
    </article>
  </div>
</template>

<style scoped>
.report-card-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1.25rem;
  padding: 1rem;
}

.report-grid-card {
  display: flex;
  min-width: 0;
  min-height: 560px;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--color-border);
  border-radius: 1rem;
  background: var(--color-surface);
  box-shadow: 0 12px 30px rgb(15 23 42 / 8%);
  transition:
    transform 180ms ease,
    box-shadow 180ms ease;
}

.report-grid-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 16px 38px rgb(15 23 42 / 12%);
}

.report-grid-card__bar {
  display: flex;
  min-height: 30px;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.3rem 0.9rem;
  color: var(--app-report-bar-text);
  background: var(--app-report-bar-bg);
  font-size: 0.76rem;
  font-weight: 400;
}

.report-grid-card__bar--public {
  color: var(--app-report-public-bar-text);
  background: var(--app-report-public-bar-bg);
}

.report-grid-card__brand {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 0.5rem;
}

.report-grid-card__brand span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.report-grid-card__image-link {
  display: block;
  height: 245px;
  flex: none;
  overflow: hidden;
  border-bottom: 1px solid var(--color-border);
  background: #f8fafc;
}

.report-grid-card__image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: fill;
  transition: transform 220ms ease;
}

.report-grid-card:hover .report-grid-card__image {
  transform: scale(1.015);
}

.report-grid-card__placeholder {
  display: grid;
  width: 100%;
  height: 100%;
  place-items: center;
  padding: 1rem;
  color: var(--color-text-muted);
  background:
    linear-gradient(135deg, rgb(37 99 235 / 8%), transparent 55%),
    var(--color-surface-subtle);
  font-size: 0.9rem;
  font-weight: 700;
}

.report-grid-card__content {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  padding: 1.15rem;
}

.report-grid-card__title {
  display: -webkit-box;
  overflow: hidden;
  color: var(--color-text);
  font-size: 1.18rem;
  font-weight: 750;
  line-height: 1.35;
  text-decoration: none;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
}

.report-grid-card__title:hover {
  color: var(--color-primary);
}

.report-grid-card__description {
  display: -webkit-box;
  overflow: hidden;
  margin: 0.85rem 0 0;
  color: var(--color-text-secondary);
  font-size: 0.9rem;
  line-height: 1.58;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 4;
}

.report-grid-card__footer {
  margin-top: auto;
  padding-top: 1.15rem;
}

.report-grid-card__meta {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 0.55rem;
  margin-bottom: 0.8rem;
  color: var(--color-text-muted);
  font-size: 0.76rem;
}

.report-grid-card__meta span {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  gap: 0.35rem;
}

.report-grid-card__meta span:last-child {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.report-grid-card__action {
  display: flex;
  width: 100%;
  min-height: 38px;
  align-items: center;
  justify-content: center;
  gap: 0.7rem;
  border-radius: 0.65rem;
  color: #fff;
  background: linear-gradient(135deg, var(--app-primary), var(--app-primary-hover));
  font-size: 0.78rem;
  font-weight: 700;
  text-decoration: none;
  box-shadow: 0 8px 18px rgb(28 104 235 / 24%);
  transition: filter 150ms ease, transform 150ms ease;
}

.report-grid-card__action:hover {
  filter: brightness(1.08);
  transform: translateX(2px);
}

.report-card-grid--compact {
  flex: 1;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  grid-template-rows: repeat(2, minmax(0, 1fr));
  gap: 0.65rem;
  height: 100%;
  padding: 0.75rem 1rem 1rem;
}

.report-card-grid--compact .report-grid-card {
  height: 100%;
  min-height: 0;
  border-radius: 0.65rem;
  box-shadow: 0 5px 16px rgb(15 23 42 / 7%);
}

.report-card-grid--compact .report-grid-card__bar {
  min-height: 25px;
  padding: 0.22rem 0.6rem;
  font-size: 0.62rem;
}

.report-card-grid--compact .report-grid-card__image-link {
  height: 132px;
}

.report-card-grid--compact .report-grid-card__content {
  padding: 0.7rem;
}

.report-card-grid--compact .report-grid-card__title {
  font-size: 0.82rem;
  line-height: 1.3;
  -webkit-line-clamp: 2;
}

.report-card-grid--compact .report-grid-card__description {
  margin-top: 0.45rem;
  font-size: 0.68rem;
  line-height: 1.4;
  -webkit-line-clamp: 2;
}

.report-card-grid--compact .report-grid-card__footer {
  padding-top: 0.65rem;
}

.report-card-grid--compact .report-grid-card__meta {
  gap: 0.35rem;
  margin-bottom: 0.55rem;
  font-size: 0.6rem;
}

.report-card-grid--compact .report-grid-card__action {
  min-height: 31px;
  border-radius: 0.45rem;
  font-size: 0.66rem;
}

@media (max-width: 1100px) {
  .report-card-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 639px) {
  .report-card-grid {
    grid-template-columns: minmax(0, 1fr);
    gap: 1rem;
    padding: 0.75rem;
  }

  .report-grid-card {
    min-height: 520px;
  }

  .report-grid-card__image-link {
    height: 220px;
  }
}
</style>
