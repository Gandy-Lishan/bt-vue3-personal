<script setup lang="ts">
import { ArrowRight, CalendarDays, LockKeyhole, LockKeyholeOpen, Star, UsersRound } from '@lucide/vue'
import type { ReportLibraryItem } from '@/entities/report/model/report.types'

defineProps<{ reports: ReportLibraryItem[] }>()

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
  <div class="report-list" role="list">
    <article
      v-for="report in reports"
      :key="report.id"
      class="report-card"
      role="listitem"
    >
      <a :href="report.href" class="report-card__image-link" :aria-label="`Read ${report.title}`">
        <img
          v-if="report.imageUrl"
          :src="report.imageUrl"
          :alt="`${report.title} preview`"
          class="report-card__image"
          loading="lazy"
        />
        <div v-else class="report-card__image-placeholder"><span>{{ report.category }}</span></div>
      </a>

      <div class="report-card__right">
        <div class="report-card__bar" :class="{ 'report-card__bar--public': report.isPublic }">
          <div class="report-card__brand">
            <LockKeyholeOpen v-if="report.isPublic" :size="14" />
            <LockKeyhole v-else :size="14" />
            <span>{{ report.category }}</span>
            <Star v-if="report.isFavorite" :size="14" fill="currentColor" aria-label="Favorite report" />
          </div>
          <div class="report-card__access">
            <UsersRound :size="14" />
            {{ report.isPublic ? 'Public' : 'Members' }}
          </div>
        </div>

        <div class="report-card__body">
          <div class="report-card__content">
            <a :href="report.href" class="report-card__title">{{ report.title }}</a>
            <p class="report-card__description">{{ report.excerpt || 'Read the latest data-driven research and market analysis from SentimenTrader.' }}</p>
            <div class="report-card__meta">
              <span class="report-card__date"><CalendarDays :size="14" />{{ formatDate(report.publishedAt) }}</span>
              <span aria-hidden="true">•</span>
              <span>{{ report.author }}</span>
            </div>
          </div>

          <a :href="report.href" class="report-card__action">
            Read report
            <ArrowRight :size="16" />
          </a>
        </div>
      </div>
    </article>
  </div>
</template>

<style scoped>
.report-list {
  display: grid;
  gap: 1rem;
  padding: 1rem;
}

.report-card {
  display: grid;
  grid-template-columns: 267px minmax(0, 1fr);
  height: 200px;
  overflow: hidden;
  border: 1px solid var(--app-border);
  border-radius: 1rem;
  background: var(--app-surface);
  box-shadow: 0 10px 28px rgb(15 35 75 / 8%);
  transition: border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease;
}

.report-card:hover {
  border-color: color-mix(in srgb, var(--app-primary) 38%, var(--app-border));
  box-shadow: 0 16px 34px rgb(15 35 75 / 13%);
  transform: translateY(-2px);
}

.report-card__bar {
  display: flex;
  min-height: 27px;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.3rem 0.85rem;
  background: linear-gradient(110deg, #ffbc16, #ffc833);
  color: #071539;
  font-size: 0.7rem;
  font-weight: 400;
}

.report-card__bar--public {
  background: linear-gradient(110deg, #b8ebcd, #d8f5e3);
  color: #075d35;
}

.report-card__brand,
.report-card__access,
.report-card__date {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
}

.report-card__right {
  display: grid;
  min-width: 0;
  grid-template-rows: auto minmax(0, 1fr);
}

.report-card__body {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: stretch;
  gap: 1rem;
  padding: 0.8rem 0.9rem;
}

.report-card__image-link {
  display: block;
  width: 267px;
  height: 200px;
  overflow: hidden;
  border-right: 1px solid var(--app-border-muted);
  background: var(--app-surface-soft);
}

.report-card__image {
  width: 100%;
  height: 100%;
  object-fit: fill;
  object-position: center;
  transition: transform 220ms ease;
}

.report-card:hover .report-card__image {
  transform: scale(1.018);
}

.report-card__image-placeholder {
  display: flex;
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--app-primary-soft), var(--app-surface-soft));
  color: var(--app-primary);
  font-size: 0.8rem;
  font-weight: 800;
}

.report-card__content {
  display: flex;
  min-width: 0;
  min-height: 0;
  flex-direction: column;
}

.report-card__title {
  flex: none;
  display: -webkit-box;
  height: 2.5em;
  overflow: hidden;
  color: var(--app-text);
  font-size: clamp(1rem, 1.35vw, 1.25rem);
  font-weight: 850;
  line-height: 1.24;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.report-card__title:hover {
  color: var(--app-primary);
}

.report-card__description {
  flex: 1 1 auto;
  display: -webkit-box;
  overflow: hidden;
  margin-top: 0.5rem;
  color: var(--app-text-muted);
  font-size: 0.84rem;
  line-height: 1.45;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
}

.report-card__meta {
  flex: none;
  display: flex;
  flex-wrap: wrap;
  height: 1.5em;
  align-items: center;
  gap: 0.8rem;
  margin-top: 0.65rem;
  color: var(--app-text-muted);
  font-size: 0.72rem;
  font-weight: 400;
}

.report-card__action {
  display: inline-flex;
  min-width: 116px;
  min-height: 38px;
  align-items: center;
  justify-content: center;
  gap: 0.7rem;
  align-self: end;
  border-radius: 0.65rem;
  background: linear-gradient(135deg, var(--app-primary), var(--app-primary-hover));
  padding: 0.55rem 0.8rem;
  color: #fff;
  font-size: 0.78rem;
  font-weight: 800;
  box-shadow: 0 8px 18px rgb(28 104 235 / 24%);
  transition: filter 150ms ease, transform 150ms ease;
}

.report-card__action:hover {
  filter: brightness(1.08);
  transform: translateX(2px);
}

@media (max-width: 900px) {
  .report-card {
    grid-template-columns: 220px minmax(0, 1fr);
  }

  .report-card__image-link {
    width: 220px;
  }
}

@media (max-width: 639px) {
  .report-list {
    gap: 0.85rem;
    padding: 0.75rem;
  }

  .report-card {
    display: block;
    height: auto;
    border-radius: 0.8rem;
  }

  .report-card__bar {
    min-height: 27px;
    padding: 0.3rem 0.7rem;
    font-size: 0.68rem;
  }

  .report-card__access {
    gap: 0.35rem;
  }

  .report-card__body {
    grid-template-columns: minmax(0, 1fr);
    gap: 0.8rem;
    padding: 0.85rem;
  }

  .report-card__image-link {
    width: 100%;
    height: 200px;
    border-right: 0;
    border-bottom: 1px solid var(--app-border-muted);
  }

  .report-card__title {
    font-size: 1.08rem;
  }

  .report-card__description {
    margin-top: 0.55rem;
    font-size: 0.85rem;
    -webkit-line-clamp: 3;
  }

  .report-card__meta {
    margin-top: 0.75rem;
    gap: 0.55rem;
  }

  .report-card__action {
    width: 100%;
    min-height: 38px;
  }
}
</style>
