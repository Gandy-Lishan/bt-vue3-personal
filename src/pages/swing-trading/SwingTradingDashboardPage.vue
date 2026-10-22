<template>
  <main class="swing-strategy-dashboard">
    <section ref="heroPanel" class="hero-panel">
      <div class="hero-copy">
        <div class="hero-badges">
          <span class="status-badge muted">Quantitative Trading System</span>
          <span class="status-badge active">Active</span>
        </div>
        <div class="hero-title-row">
          <h1>
            Swing Trading Strategy Dashboard
            <span v-if="dashboardDateInline">{{ dashboardDateInline }}</span>
          </h1>
        </div>
        <p>
          Choose from 10 systematic swing trading strategies (typical holding period: 5–21 trading days). After market close, the system scans the market (<a class="hero-text-link" href="/scannerai" target="_blank" rel="noopener noreferrer"><strong>click to view Sentimentrader Smart Stock Scanner</strong></a>), identifies qualified stocks, calculates strategy position sizing, and generates trading actions for the next market open.
        </p>
        <!-- <div class="hero-note">
          <span>Signals are auto-generated; trades are <strong>not</strong> auto-executed.</span>
        </div> -->
        <div class="hero-note hero-schedule">
          <span><strong>Trading Action Generation:</strong> After-Hours (11:00 PM ET)</span>
          <span class="hero-separator">·</span>
          <span><strong>Trading Action Execution:</strong> Next Market Open (9:30 AM ET)</span>
        </div>
        <div class="hero-disclaimer">
          <p><strong>For informational purposes only.</strong> All performance shown is based on paper  trading, not actual live trading.</p>
          <p>Past performance does not guarantee future results. All investments carry risk, including loss of principal.</p>
        </div>
      </div>
      <div class="hero-actions">
        <button type="button" class="hero-button primary" @click="scrollToTomorrowActions">
          <span>Tomorrow's Actions</span>
        </button>
        <button type="button" class="hero-button secondary" @click="guideVisible = true">
          <span>Quick Start Guide</span>
        </button>
      </div>
    </section>

    <section class="dashboard-panel strategy-selection">
      <div class="panel-heading">
        <div>
          <h2>Select Trading Strategy</h2>
        </div>
        <div class="panel-actions">
          <button
            type="button"
            class="utility-button"
            @click="openStrategyTutorialVideo"
          >
            <span>Tutorial Video</span>
          </button>
          <button type="button" class="utility-button" @click="compareExpanded = !compareExpanded">
            <span>Compare Strategies</span>
            <i
              class="fa fa-angle-down compare-chevron"
              :class="{ 'is-open': compareExpanded }"
              aria-hidden="true"
            ></i>
          </button>
        </div>
      </div>

      <div class="strategy-grid">
        <button
          v-for="strategy in strategies"
          :key="strategy.id"
          type="button"
          class="strategy-card"
          :class="{ selected: strategy.id === currentStrategyId }"
          @click="selectStrategy(strategy.id)"
        >
          <span v-if="strategy.id === currentStrategyId" class="floating-badge current">Current</span>
          <!-- <span class="strategy-prefix" :class="`tone-${strategy.tone}`">{{ strategy.prefix }}</span> -->
          <strong>{{ strategy.fullName }}</strong>
          <span>
            <span :class="getSignedValueClass(strategy.totalReturn)">Total Return {{ strategy.totalReturn }}</span> <br/>
            <span :class="getSignedValueClass(strategy.maxDrawdown)">Max Drawdown {{ strategy.maxDrawdown }}</span> <br/>
            <span>Win Rate {{ strategy.winRate }}</span> <br/>
            <span :class="getSignedValueClass(strategy.dailyReturn)">Daily Return {{ strategy.dailyReturn || '--' }}</span>
        </span>
        </button>
      </div>

      <div v-show="compareExpanded" class="compare-table-wrap">
        <table class="data-table compare-table">
          <thead>
            <tr>
              <th
                v-for="column in compareColumns"
                :key="column.key"
                :aria-sort="getCompareSortAria(column.key)"
              >
                <button
                  type="button"
                  class="table-sort-button"
                  :class="{ active: compareSort.key === column.key }"
                  @click="sortCompareTable(column.key)"
                >
                  <span>{{ column.label }}</span>
                  <span
                    v-if="column.tooltip"
                    class="tooltip table-header-help"
                    @click.stop
                  >
                    ?
                    <span class="tooltip-text" v-html="column.tooltip"  ></span>
                  </span>
                  <component :is="getCompareSortIcon(column.key)" :size="13" aria-hidden="true" />
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="strategy in sortedStrategies"
              :key="`compare-${strategy.id}`"
              :class="{ highlighted: strategy.id === currentStrategyId }"
            >
              <td class="strong-cell">{{ strategy.fullName }}</td>
              <!-- <td>{{ strategy.prefix }}</td> -->
              <td :class="getSignedValueClass(strategy.totalReturn)">{{ strategy.totalReturn }}</td>
              <td :class="getSignedValueClass(strategy.alpha)">{{ strategy.alpha }}</td>
              <td>{{ strategy.winRate }}</td>
              <td :class="getSignedValueClass(strategy.maxDrawdown)">{{ strategy.maxDrawdown }}</td>
              <td>{{ strategy.sharpeRatio }}</td>
              <td>{{ strategy.description }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section v-if="activeStrategyTitle" ref="activeStrategyBar" class="active-strategy-bar">
      <div class="active-strategy-title">
        <span class="pulse-dot"></span>
        <span class="bar-label">Active Strategy:</span>
        <h2>
          {{ activeStrategyTitle }}
          <span v-if="dashboardDateInline">{{ dashboardDateInline }}</span>
        </h2>
      </div>
      <button type="button" class="cash-calculator-trigger active-strategy-setup-button" @click="openShareCalculator">
        New Follower Setup
      </button>
    </section>

    <section
      ref="strategyMetrics"
      class="metric-grid"
      :class="{ 'has-note-card': capitalNoteText }"
    >
      <div v-if="capitalNoteText" class="metric-card note-card">
        <div class="metric-heading">
          <span>Starting Capital</span>
        </div>
        <strong>{{ capitalNoteInitialCapital }}</strong>
        <span v-if="capitalNoteTradingStartedText" class="metric-subtle note-start-date">{{ capitalNoteTradingStartedText }}</span>
      </div>

      <button type="button" class="metric-card asset-card clickable" @click="openPerformanceAnalysis">
        <div class="metric-heading">
          <span>Current Value</span>
          <span
            v-if="hasDisplayValue(currentStrategy.dailyReturn)"
            class="metric-heading-daily-return"
            :class="getSignedValueClass(currentStrategy.dailyReturn)"
          >
            <i
              v-if="getDailyReturnDirectionIcon(currentStrategy.dailyReturn)"
              class="fa"
              :class="getDailyReturnDirectionIcon(currentStrategy.dailyReturn)"
              aria-hidden="true"
            ></i>
            <span>{{ currentStrategy.dailyReturn }}</span>
          </span>
        </div>
        <div class="metric-content">
          <div>
            <strong>{{ currentStrategy.assets }}</strong>
            <span class="metric-change positive-cell">
              {{ currentStrategy.change }}
            </span>
          </div>
          <svg class="sparkline" viewBox="0 0 120 44" preserveAspectRatio="none" aria-hidden="true">
            <polyline :points="getSparklinePoints(currentStrategy.trend)" />
          </svg>
        </div>
      </button>

      <div class="metric-card">
        <div class="metric-heading">
          <span>Cash Available</span>
        </div>
        <strong>{{ currentStrategy.cash }}</strong>
        <span v-if="currentStrategy.cashPct" class="metric-subtle">{{ currentStrategy.cashPct }} of Current Value</span>
      </div>

      <div class="metric-card">
        <div class="metric-heading">
          <span>Current Holdings</span>
        </div>
        <strong>{{ formatCountWithUnit(currentStrategy.positions, 'Positions') }}</strong>
        <span v-if="holdingStatusText" class="metric-warning" :class="{ clean: currentStrategy.sellSignals === 0 }">
          {{ holdingStatusText }}
        </span>
      </div>

      <div class="metric-card">
        <div class="metric-heading">
          <span>Trade Win Rate</span>
        </div>
        <strong>{{ currentStrategy.winRate }}</strong>
        <div class="metric-row">
          <span v-if="hasDisplayValue(currentStrategy.trades)" class="tooltip">
            <span class="trade-count">Total Trades: {{ currentStrategy.trades }}</span>
            <span class="tooltip-text">
              Statistical significance metric. Values greater than 2 indicate stable strategy performance
              relative to random trading.
            </span>
          </span>
        </div>
      </div>

    </section>

    <section ref="tomorrowAction" class="tomorrow-panel">
      <div class="tomorrow-heading">
        <div>
          <div class="section-title-line">
            <h2>{{ tomorrowActionsTitle }}</h2>
          </div>
          <p>Execute at market open (9:30 AM EST). Positions calculated using strategy capital allocation rules.</p>
        </div>
      </div>

      <div class="action-grid">
        <div class="action-column">
          <div class="action-heading">
            <span class="action-pill buy">BUY</span>
            <h3>{{ buyActions.length }} Stocks</h3>
          </div>
          <div v-if="buyActions.length" class="action-list">
            <article v-for="action in buyActions" :key="`buy-${action.symbol}`" class="action-item">
              <div class="action-topline">
                <strong>{{ action.symbol }}</strong>
                <span class="cash-badge buy">{{ action.cashRatio }} of Available Cash</span>
              </div>
              <dl class="action-fields">
                <div>
                  <dt>Entry Price:</dt>
                  <dd>{{ action.entryPrice }}</dd>
                </div>
                <div>
                  <dt>Profit Target:</dt>
                  <dd class="positive-cell">{{ action.profitTarget }}</dd>
                </div>
                <div>
                  <dt>Stop Loss:</dt>
                  <dd class="negative-cell">{{ action.stopLoss }}</dd>
                </div>
                <div>
                  <dt>Max Holding Period:</dt>
                  <dd>{{ action.timeInMarket }}</dd>
                </div>
              </dl>
              <div class="position-reference">
                <span>Position (Reference):</span>
                <strong>{{ currentStrategy.cash }} × {{ action.cashRatio }} ÷ {{ action.entryPrice }} = {{ action.shares }} Shares</strong>
                <em>Your Position: Your Cash × Position % ÷ Price = Shares</em>
              </div>
            </article>
          </div>
          <div v-else class="empty-state">No buy actions</div>
        </div>

        <div class="action-column">
          <div class="action-heading">
            <span class="action-pill sell">SELL</span>
            <h3>{{ sellActions.length }} Stocks</h3>
          </div>
          <div v-if="sellActions.length" class="action-list">
            <article v-for="action in sellActions" :key="`sell-${action.symbol}`" class="action-item sell-item">
              <div class="action-topline">
                <strong>{{ action.symbol }}</strong>
                <span class="cash-badge sell">{{ action.reason === 'Profit Target' || action.reason === 'Stop Loss' ? `${action.reason} Met` : action.reason }}</span>
              </div>
              <dl class="action-fields compact">
                <div>
                  <dt>Entry Price:</dt>
                  <dd>{{ action.entryPrice }}</dd>
                </div>
                <div>
                  <dt>Current Price:</dt>
                  <dd>{{ action.currentPrice }}</dd>
                </div>
                <div>
                  <dt>Holding Period:</dt>
                  <dd>{{ action.holdingPeriod }}</dd>
                </div>
                <div>
                  <dt>P&amp;L:</dt>
                  <dd :class="{ 'negative-cell': isNegative(action.profitPct), 'positive-cell': !isNegative(action.profitPct) }">
                    {{ action.profitPct }}
                  </dd>
                </div>
              </dl>
            </article>
          </div>
          <div v-else class="empty-state">No sell actions</div>
        </div>
      </div>
      <div class="position-guide">
        <div>
          <h3>Position Sizing Guide for Followers</h3>
          <p>
            <strong>Important:</strong> Your available capital may differ from the strategy.
            Use the <strong>% of Available Cash</strong> ratios above to calculate your own position size.
          </p>
          <div class="formula-box">
            <strong>Formula:</strong> Your Available Cash × % Ratio = Your Position Value<br>
            <strong>Example:</strong> Your Available Cash × Cash Ratio = Your Position Value
          </div>
        </div>
      </div>
    </section>

    <section ref="dataTabsPanel" class="data-tabs-panel">
      <nav class="tabs-nav">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          type="button"
          class="tab-button"
          :class="{ active: activeTab === tab.key }"
          @click="activeTab = tab.key"
        >
          <span>{{ tab.label }}</span>
        </button>
      </nav>

      <div v-if="activeTab === 'overview'" class="tab-content">
        <div class="table-wrap">
          <table class="data-table holdings-table">
            <thead>
              <tr>
                <th
                  v-for="column in holdingsColumns"
                  :key="column.key"
                  :aria-sort="getHoldingSortAria(column.key)"
                >
                  <button
                    type="button"
                    class="table-sort-button"
                    :class="{ active: isHoldingSortActive(column.key) }"
                    @click="sortHoldingTable(column.key)"
                  >
                    <span>{{ column.label }}</span>
                    <component :is="getHoldingSortIcon(column.key)" :size="13" aria-hidden="true" />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!holdingRows.length">
                <td :colspan="holdingsColumns.length" class="empty-cell">No Data</td>
              </tr>
              <template v-for="row in sortedHoldingRows" :key="`holding-group-${getHoldingRowKey(row)}`">
                <tr
                  :class="{ 'action-required': isHoldingSellTomorrowRow(row) }"
                >
                  <td class="holding-status-cell">
                    <button
                      type="button"
                      class="expand-row-button"
                      :class="{ expanded: isHoldingExpanded(row) }"
                      :aria-expanded="String(isHoldingExpanded(row))"
                      :aria-label="`${isHoldingExpanded(row) ? 'Collapse' : 'Expand'} ${row.symbol} indicator links`"
                      @click="toggleHoldingDetails(row)"
                    >
                      <i class="fa" :class="isHoldingExpanded(row) ? 'fa-chevron-down' : 'fa-chevron-right'" aria-hidden="true"></i>
                    </button>
                    <span class="status-chip" :class="{ warning: isHoldingSellTomorrowRow(row) }">
                      {{ getHoldingStatusLabel(row) }}
                    </span>
                  </td>
                  <td class="strong-cell"><a :href="`/market/sec/${row.symbol}/chart`" target="_blank" rel="noopener noreferrer">{{ row.symbol }}</a></td>
                  <td class="muted-cell">{{ row.entryDate }}</td>
                  <td>{{ row.entryPrice }}</td>
                  <td>{{ row.currentPrice }}</td>
                  <td>{{ row.profitTargetPrice }}</td>
                  <td>{{ row.stopLossPrice }}</td>
                  <td :class="{ 'negative-cell': isNegative(row.profitPct), 'positive-cell': !isNegative(row.profitPct) }">
                    {{ row.profitPct }} 
                  </td>
                  <td>{{ row.shares }}</td>
                  <td>{{ row.positionPct }}</td>
                  <td class="muted-cell">
                    <span class="signal-with-help">
                      {{ getSignalLabel(row.signal) }}
                      <span class="tooltip signal-tooltip">
                        <i class="fa fa-question-circle" aria-hidden="true"></i>
                        <span class="tooltip-text" v-html="getSignalDescription(row.signal)"></span>
                      </span>
                    </span>
                  </td>
                </tr>
                <tr
                  v-if="isHoldingExpanded(row)"
                  class="holding-details-row"
                >
                  <td :colspan="holdingsColumns.length">
                    <div class="holding-details-links">
                      <a
                        v-for="detail in getHoldingDetailLinks(row)"
                        :key="detail.key"
                        class="holding-detail-link"
                        :href="detail.href"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <span>{{ detail.label }}:</span>
                        <strong>{{ detail.value }}</strong>
                      </a>
                    </div>
                  </td>
                </tr>
              </template>
              <tr v-if="holdingRows.length" class="holding-total-row">
                <td :colspan="holdingsColumns.length" class="holding-summary-cell">
                  <div class="holding-summary-highlight">
                    <span class="holding-summary-metric">
                      <span class="holding-summary-label">Available Cash:</span>
                      <strong>{{ holdingAvailableCashPct }}</strong>
                    </span>
                    <span class="holding-summary-divider">|</span>
                    <span class="holding-summary-metric">
                      <span class="holding-summary-label">Total Position:</span>
                      <strong>{{ holdingPositionTotalPct }}</strong>
                    </span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div v-else-if="activeTab === 'performance'" class="tab-content">
        <div class="performance-stat-grid">
          <div v-for="stat in performanceStats" :key="stat.label" class="performance-stat">
            <span>{{ stat.label }}</span>
            <strong :class="getPerformanceStatValueClass(stat)">
              {{ stat.value }}
            </strong>
          </div>
        </div>

        <div class="charts-stack">
          <article class="chart-block">
            <div class="chart-header">
              <h3>Cumulative Return % Comparison (Strategy vs Benchmark SPY)</h3>
              <div v-if="hasChartRangeSelector('cumulative')" class="chart-range-presets" aria-label="Cumulative return quick date range">
                <button
                  v-for="preset in cumulativeChartRangePresets"
                  :key="`cum-range-preset-${preset.key}`"
                  type="button"
                  class="chart-range-preset-button"
                  :class="{ active: preset.active }"
                  :aria-pressed="preset.active ? 'true' : 'false'"
                  @click="applyChartRangePreset('cumulative', preset)"
                >
                  {{ preset.label }}
                </button>
              </div>
            </div>
            <div v-if="hasChartRangeSelector('cumulative')" ref="cumulativeRangeControl" class="chart-range-control">
              <div class="chart-range-slider" aria-label="Visible cumulative return chart range">
                <svg class="chart-range-preview" viewBox="0 0 1000 56" preserveAspectRatio="none" aria-hidden="true">
                  <rect class="chart-range-preview-bg" x="0" y="0" width="1000" height="56" />
                  <g v-for="tick in cumulativeChartPreview.ticks" :key="`cum-range-tick-${tick.index}`">
                    <line class="chart-range-preview-tick" :x1="tick.x" y1="0" :x2="tick.x" y2="50" />
                  </g>
                  <polyline class="chart-range-preview-line" :points="cumulativeChartPreview.points" />
                </svg>
                <span
                  v-for="tick in cumulativeChartPreview.ticks"
                  :key="`cum-range-label-${tick.index}`"
                  class="chart-range-preview-label"
                  :class="`chart-range-preview-label-${tick.anchor}`"
                  :style="{ left: tick.left }"
                >{{ tick.label }}</span>
                <span class="chart-range-track"></span>
                <span class="chart-range-selection" :style="getChartRangeSelectionStyle('cumulative')"></span>
                <span class="chart-range-handle chart-range-handle-start" :style="getChartRangeHandleStyle('cumulative', 'start')"></span>
                <span class="chart-range-handle chart-range-handle-end" :style="getChartRangeHandleStyle('cumulative', 'end')"></span>
                <input
                  type="range"
                  class="chart-range-input chart-range-input-start"
                  min="0"
                  :max="getChartRangeMaxIndex('cumulative')"
                  :value="getPendingChartRange('cumulative').start"
                  aria-label="Cumulative return range start"
                  @input="updateChartRangeStart('cumulative', $event)"
                >
                <input
                  type="range"
                  class="chart-range-input chart-range-input-end"
                  min="0"
                  :max="getChartRangeMaxIndex('cumulative')"
                  :value="getPendingChartRange('cumulative').end"
                  aria-label="Cumulative return range end"
                  @input="updateChartRangeEnd('cumulative', $event)"
                >
              </div>
            </div>
            <svg
              class="line-chart cumulative-return-chart"
              viewBox="0 0 1000 320"
              preserveAspectRatio="none"
              aria-hidden="true"
              @mousemove="handleCumulativeChartHover"
              @mouseleave="clearCumulativeChartHover"
            >
              <g v-for="tick in cumulativeChartRender.yTicks" :key="`cum-tick-${tick.index}`">
                <line class="grid-line" x1="58" :y1="tick.y" x2="980" :y2="tick.y" />
                <text class="axis-label y-label" x="48" :y="tick.y + 4">{{ tick.label }}</text>
              </g>
              <g v-for="tick in cumulativeChartRender.dateTicks" :key="`cum-date-${tick.index}`">
                <line class="grid-line x-grid-line" :x1="tick.x" y1="30" :x2="tick.x" y2="274" />
                <text class="axis-label x-label" :class="`x-label-${tick.anchor}`" :x="tick.x" y="296">{{ tick.label }}</text>
              </g>
              <line class="axis-line" x1="58" y1="274" x2="980" y2="274" />
              <polyline class="benchmark-line" :points="cumulativeChartRender.benchmarkPoints" />
              <polyline class="strategy-line" :points="cumulativeChartRender.strategyPoints" />
              <g v-if="cumulativeChartTooltip.visible" class="chart-hover-layer">
                <line
                  class="chart-hover-line"
                  :x1="cumulativeChartTooltip.x"
                  y1="30"
                  :x2="cumulativeChartTooltip.x"
                  y2="274"
                />
                <circle class="chart-hover-dot benchmark-dot" :cx="cumulativeChartTooltip.x" :cy="cumulativeChartTooltip.benchmarkY" r="5" />
                <circle class="chart-hover-dot strategy-dot" :cx="cumulativeChartTooltip.x" :cy="cumulativeChartTooltip.strategyY" r="5" />
                <g :transform="`translate(${cumulativeChartTooltip.boxX}, ${cumulativeChartTooltip.boxY})`">
                  <rect class="chart-tooltip-box" width="218" height="76" rx="6" />
                  <text class="chart-tooltip-date" x="12" y="20">{{ cumulativeChartTooltip.date }}</text>
                  <text class="chart-tooltip-label benchmark-tooltip-label" x="12" y="44">Benchmark: {{ cumulativeChartTooltip.benchmark }}</text>
                  <text class="chart-tooltip-label strategy-tooltip-label" x="12" y="64">Strategy: {{ cumulativeChartTooltip.strategy }}</text>
                </g>
              </g>
              <rect class="chart-hover-capture" x="58" y="30" width="922" height="244" />
            </svg>
            <div class="chart-legend">
              <span><i class="legend-swatch benchmark"></i>Benchmark (SPY)</span>
              <span><i class="legend-swatch strategy"></i>Strategy</span>
            </div>
          </article>

          <article class="chart-block">
            <div class="chart-header">
              <h3>Drawdown % Comparison (Strategy vs Benchmark SPY)</h3>
              <div v-if="hasChartRangeSelector('drawdown')" class="chart-range-presets" aria-label="Drawdown quick date range">
                <button
                  v-for="preset in drawdownChartRangePresets"
                  :key="`dd-range-preset-${preset.key}`"
                  type="button"
                  class="chart-range-preset-button"
                  :class="{ active: preset.active }"
                  :aria-pressed="preset.active ? 'true' : 'false'"
                  @click="applyChartRangePreset('drawdown', preset)"
                >
                  {{ preset.label }}
                </button>
              </div>
            </div>
            <div v-if="hasChartRangeSelector('drawdown')" ref="drawdownRangeControl" class="chart-range-control">
              <div class="chart-range-slider" aria-label="Visible drawdown chart range">
                <svg class="chart-range-preview" viewBox="0 0 1000 56" preserveAspectRatio="none" aria-hidden="true">
                  <rect class="chart-range-preview-bg" x="0" y="0" width="1000" height="56" />
                  <g v-for="tick in drawdownChartPreview.ticks" :key="`dd-range-tick-${tick.index}`">
                    <line class="chart-range-preview-tick" :x1="tick.x" y1="0" :x2="tick.x" y2="50" />
                  </g>
                  <polyline class="chart-range-preview-line" :points="drawdownChartPreview.points" />
                </svg>
                <span
                  v-for="tick in drawdownChartPreview.ticks"
                  :key="`dd-range-label-${tick.index}`"
                  class="chart-range-preview-label"
                  :class="`chart-range-preview-label-${tick.anchor}`"
                  :style="{ left: tick.left }"
                >{{ tick.label }}</span>
                <span class="chart-range-track"></span>
                <span class="chart-range-selection" :style="getChartRangeSelectionStyle('drawdown')"></span>
                <span class="chart-range-handle chart-range-handle-start" :style="getChartRangeHandleStyle('drawdown', 'start')"></span>
                <span class="chart-range-handle chart-range-handle-end" :style="getChartRangeHandleStyle('drawdown', 'end')"></span>
                <input
                  type="range"
                  class="chart-range-input chart-range-input-start"
                  min="0"
                  :max="getChartRangeMaxIndex('drawdown')"
                  :value="getPendingChartRange('drawdown').start"
                  aria-label="Drawdown range start"
                  @input="updateChartRangeStart('drawdown', $event)"
                >
                <input
                  type="range"
                  class="chart-range-input chart-range-input-end"
                  min="0"
                  :max="getChartRangeMaxIndex('drawdown')"
                  :value="getPendingChartRange('drawdown').end"
                  aria-label="Drawdown range end"
                  @input="updateChartRangeEnd('drawdown', $event)"
                >
              </div>
            </div>
            <svg
              class="line-chart drawdown-chart"
              viewBox="0 0 1000 320"
              preserveAspectRatio="none"
              aria-hidden="true"
              @mousemove="handleDrawdownChartHover"
              @mouseleave="clearDrawdownChartHover"
            >
              <g v-for="tick in drawdownChartRender.yTicks" :key="`dd-tick-${tick.index}`">
                <line class="grid-line" x1="58" :y1="tick.y" x2="980" :y2="tick.y" />
                <text class="axis-label y-label" x="48" :y="tick.y + 4">{{ tick.label }}</text>
              </g>
              <g v-for="tick in drawdownChartRender.dateTicks" :key="`dd-date-${tick.index}`">
                <line class="grid-line x-grid-line" :x1="tick.x" y1="30" :x2="tick.x" y2="274" />
                <text class="axis-label x-label" :class="`x-label-${tick.anchor}`" :x="tick.x" y="296">{{ tick.label }}</text>
              </g>
              <line class="axis-line" x1="58" y1="274" x2="980" y2="274" />
              <polyline class="benchmark-line" :points="drawdownChartRender.benchmarkPoints" />
              <polyline class="drawdown-line" :points="drawdownChartRender.strategyPoints" />
              <g v-if="drawdownChartTooltip.visible" class="chart-hover-layer">
                <line
                  class="chart-hover-line"
                  :x1="drawdownChartTooltip.x"
                  y1="30"
                  :x2="drawdownChartTooltip.x"
                  y2="274"
                />
                <circle class="chart-hover-dot benchmark-dot" :cx="drawdownChartTooltip.x" :cy="drawdownChartTooltip.benchmarkY" r="5" />
                <circle class="chart-hover-dot drawdown-dot" :cx="drawdownChartTooltip.x" :cy="drawdownChartTooltip.strategyY" r="5" />
                <g :transform="`translate(${drawdownChartTooltip.boxX}, ${drawdownChartTooltip.boxY})`">
                  <rect class="chart-tooltip-box" width="218" height="76" rx="6" />
                  <text class="chart-tooltip-date" x="12" y="20">{{ drawdownChartTooltip.date }}</text>
                  <text class="chart-tooltip-label benchmark-tooltip-label" x="12" y="44">Benchmark: {{ drawdownChartTooltip.benchmark }}</text>
                  <text class="chart-tooltip-label drawdown-tooltip-label" x="12" y="64">Strategy: {{ drawdownChartTooltip.strategy }}</text>
                </g>
              </g>
              <rect class="chart-hover-capture" x="58" y="30" width="922" height="244" />
            </svg>
            <div class="chart-legend">
              <span><i class="legend-swatch benchmark"></i>Benchmark Drawdown</span>
              <span><i class="legend-swatch drawdown"></i>Strategy Drawdown</span>
            </div>
          </article>

          <article class="chart-block">
            <h3>Monthly Returns % Comparison (Strategy vs Benchmark SPY)</h3>
            <div class="monthly-chart">
              <table class="monthly-return-table">
                <thead>
                  <tr>
                    <th class="monthly-year-heading">Year</th>
                    <th v-for="column in monthlyReturnColumns" :key="column.key">{{ column.label }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="!monthlyReturns.length">
                    <td :colspan="monthlyReturnColumns.length + 1" class="empty-cell">No Data</td>
                  </tr>
                  <tr v-for="row in monthlyReturns" :key="`monthly-return-${row.year}`">
                    <th class="monthly-year-cell">{{ row.year }}</th>
                    <td
                      v-for="cell in row.cells"
                      :key="`${row.year}-${cell.key}`"
                      class="monthly-return-cell"
                      :class="{ 'monthly-return-cell-split': cell.hasBenchmarkValue }"
                      :style="getMonthlyReturnCellStyle(cell)"
                      :title="getMonthlyReturnTooltip(row, cell)"
                    >
                      <div v-if="cell.hasBenchmarkValue" class="monthly-return-split">
                        <span class="monthly-return-value monthly-return-strategy">{{ cell.strategyDisplay }}</span>
                        <span class="monthly-return-value monthly-return-benchmark">{{ cell.benchmarkDisplay }}</span>
                      </div>
                      <span v-else class="monthly-return-single">{{ cell.strategyDisplay }}</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </article>
        </div>
      </div>

      <div v-else-if="activeTab === 'history'" class="tab-content">
        <div class="history-toolbar">
          <button
            type="button"
            class="history-download-button"
            :disabled="!historyRows.length"
            @click="downloadTradeHistory"
          >
            <i class="fa fa-download" aria-hidden="true"></i>
            <span>Download Trade History</span>
          </button>
        </div>
        <div class="table-wrap">
          <table class="data-table history-table">
            <thead>
              <tr>
                <th
                  v-for="column in historyColumns"
                  :key="column.key"
                  :aria-sort="getHistorySortAria(column.key)"
                >
                  <button
                    type="button"
                    class="table-sort-button"
                    :class="{ active: historySort.key === column.key }"
                    @click="sortHistoryTable(column.key)"
                  >
                    <span v-html="column.label"></span>
                    <component :is="getHistorySortIcon(column.key)" :size="13" aria-hidden="true" />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!historyRows.length">
                <td :colspan="historyColumns.length" class="empty-cell">No Data</td>
              </tr>
              <tr v-for="row in visibleHistoryRows" :key="`history-${row.index}-${row.symbol}-${row.entryDate}`">
                <td>{{ row.index }}</td>
                <td class="strong-cell">{{ row.symbol }}</td>
                <td class="muted-cell">{{ row.entryDate }}</td>
                <td>{{ row.entryPrice }}</td>
                <td class="muted-cell">{{ row.exitDate }}</td>
                <td>{{ row.exitPrice }}</td>
                <td :class="{ 'negative-cell': isNegative(row.returnPct), 'positive-cell': !isNegative(row.returnPct) }">
                  {{ row.returnPct }}
                </td>
                <td>{{ row.exitReason }}</td>
                <td>{{ row.shares }}</td>
                <td :class="{ 'negative-cell': isNegative(row.realizedPnl), 'positive-cell': !isNegative(row.realizedPnl) }">
                  {{ row.realizedPnl }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <IndicatorPagination
          v-if="historyRows.length > historyPageSize"
          class="pagination-row"
          :page="historyPage"
          :page-count="historyPageCount"
          :total="historyRows.length"
          item-label="trades"
          @change="goToHistoryPage"
        />
      </div>

      <div v-else class="tab-content">
        <div class="parameter-grid">
          <section v-for="section in parameterSections" :key="section.title" class="parameter-section">
            <h3>{{ section.title }}</h3>
            <dl>
              <div v-for="item in section.items" :key="`${section.title}-${item.label}`">
                <dt>{{ item.label }}
                <span
                    v-if="item.tooltipText"
                    class="tooltip table-header-help"
                    @click.stop
                  >
                    ?
                    <span class="tooltip-text" v-html="item.tooltipText"  ></span>
                  </span>
                </dt>
                <dd>
                  <!-- 如果是 Signal List 字段，渲染为 Tag 列表 -->
                  <div v-if="item.label === 'Signal List:'">
                    <span 
                      v-for="(signal, idx) in parseSignalList(item.value)" 
                      :key="idx" 
                    >
                      <span class="signal-tag signal-text signal-tag-list">{{ getSignalLabel(signal) }}</span>
                    </span>
                  </div>

                  <!-- 其他普通参数正常显示 -->
                  <template v-else>
                    {{ item.value }}
                  </template>
                </dd>
              </div>
            </dl>
          </section>
        </div>
        <div v-if="parameterSections.length" class="follower-note">
          <h4>Important Notes for Followers</h4>
          <ul>
            <li v-if="capitalNoteText">{{ capitalNoteText }}</li>
            <li>Your available capital may differ - use % ratios for position sizing.</li>
            <li>Signals are generated daily after market close (11:00 PM EST).</li>
            <li>Execute trades at next market open (9:30 AM EST).</li>
            <li>Position sizing formula: Your Available Cash × % Ratio = Your Position Value.</li>
            <li>All stock selections are sourced from Smart Stock Scanner. Click the link to jump to <a href="/scannerai" target="_blank" rel="noopener noreferrer">Smart Stock Scanner</a></li>
          </ul>
        </div>
      </div>
    </section>

    <footer class="dashboard-footer">
      <p v-if="dashboardFooterText">{{ dashboardFooterText }}</p>
      <p>Risk & Investment Disclaimer:  SentimenTrader provides quantitative strategies and market research for informational purposes only and does not provide investment advice or recommendations to buy or sell any security. All investment decisions are made solely by the user. Trading involves risk, including possible loss of principal, and past performance does not guarantee future results. Signals are generated automatically; trades are not executed automatically.</p>
    </footer>

    <div
      v-if="guideVisible"
      class="guide-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="guide-title"
      @click.self="guideVisible = false"
    >
      <div class="guide-panel">
        <header class="guide-header">
          <h2 id="guide-title">
            Quick Start Guide
          </h2>
          <button type="button" class="icon-button" aria-label="Close guide" @click="guideVisible = false">
            <i class="fa fa-times" aria-hidden="true"></i>
          </button>
        </header>
        <div class="guide-steps">
          <article v-for="step in guideSteps" :key="step.title" class="guide-step">
            <span>{{ step.index }}</span>
            <div>
              <h3>{{ step.title }}</h3>
              <p>{{ step.copy }}</p>
            </div>
          </article>
        </div>

        <div class="faq-section">
          <h3 class="faq-title">Common Questions</h3>
          <details v-for="(item, index) in faqItems" :key="index" class="faq-item">
            <summary class="faq-question">{{ item.question }}</summary>
            <div class="faq-answer">{{ item.answer }}</div>
          </details>
        </div>

        <button type="button" class="guide-confirm" @click="guideVisible = false">Got It, Let's Start</button>
      </div>
    </div>

    <div
      v-if="shareCalculatorVisible"
      class="guide-modal share-calculator-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-calculator-title"
      @click.self="closeShareCalculator"
    >
      <div class="guide-panel share-calculator-panel">
        <header class="guide-header">
          <div>
            <h2 id="share-calculator-title">New Follower Setup</h2>
            <h4 class="share-calculator-subtitle"><span>Strategy:</span> {{ activeStrategyTitle }}</h4>
            <p>Enter the amount you want to allocate to calculate whole-share quantities from current holdings and today's buy actions.</p>
            <p>To follow this strategy, allocate your investments according to the proportions below.</p>
          </div>
          <button type="button" class="icon-button" aria-label="Close share calculator" @click="closeShareCalculator">
            <i class="fa fa-times" aria-hidden="true"></i>
          </button>
        </header>
        <form class="share-calculator-form" @submit.prevent="calculateShareAllocation">
          <label for="share-calculator-cash">Amount Allocated to This Strategy</label>
          <div class="share-calculator-input-row">
            <input
              id="share-calculator-cash"
              v-model.trim="shareCalculatorCashInput"
              type="number"
              min="0"
              step="0.01"
              placeholder="Enter allocation amount"
              @input="resetShareCalculatorResults"
            >
            <button type="submit" :disabled="!hasShareCalculatorCash">Calculate Shares</button>
          </div>
        </form>
        <p v-if="shareCalculatorHasResults" class="share-calculator-result">
          Allocation: {{ formattedShareCalculatorCash }}
        </p>
        <div v-if="shareCalculatorHasResults" class="share-calculator-table-wrap">
          <AppDataTable
            class="share-calculator-table"
            :columns="shareCalculatorColumns"
            :rows="shareCalculatorRows"
            empty-message="No Data"
            :sort-key="shareCalculatorSort.key"
            :sort-direction="shareCalculatorSort.direction"
            @sort="sortShareCalculatorTable"
          />
          <div v-if="shareCalculatorRows.length" class="share-calculator-total-row">
            <span>Total Amount:</span>
            <strong>{{ shareCalculatorTotalAmount }}</strong>
          </div>
          <div class="share-calculator-actions">
            <button
              type="button"
              class="save-email-button"
              :disabled="saveEmailSetupDisabled"
              @click="openEmailSetupConfirm"
            >
              <i
                aria-hidden="true"
                class="fa"
                :class="isSavingSubscription || isPreparingEmailSetupConfirmation ? 'fa-spinner fa-spin' : 'fa-envelope-o'"
              ></i>
              {{ saveEmailButtonLabel }}
            </button>
            <p class="save-email-note">
              Saving this setup records that you are following this strategy with the allocation shown above. It does not execute any trades. SentimenTrader does not provide investment advice; you are solely responsible for your investment decisions and any resulting gains or losses.
            </p>
          </div>
        </div>
        <p v-else class="share-calculator-empty">Enter an allocation amount and calculate shares before saving the email setup.</p>
      </div>
    </div>

    <div
      v-if="emailSetupConfirmVisible"
      class="guide-modal email-setup-confirm-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="email-setup-confirm-title"
      @click.self="closeEmailSetupConfirm"
    >
      <div class="guide-panel email-setup-confirm-panel">
        <header class="guide-header">
          <div> 
            <h2 id="email-setup-confirm-title">Confirm Email Setup</h2>
            <p>Please confirm these details before sending the setup email.</p>
          </div>
          <button type="button" class="icon-button" aria-label="Close email setup confirmation" @click="closeEmailSetupConfirm">
            <i class="fa fa-times" aria-hidden="true"></i>
          </button>
        </header>

        <dl class="email-setup-summary">
          <div>
            <dt><label for="email-setup-confirm-email">Email</label></dt>
            <dd>
              <input
                id="email-setup-confirm-email"
                v-model.trim="emailSetupConfirmEmailInput"
                class="email-setup-email-input"
                type="email"
                autocomplete="email"
                placeholder="Enter email address"
              >
            </dd>
          </div>
          <div>
            <dt>Strategy</dt>
            <dd>{{ emailSetupConfirmStrategyTitle }}</dd>
          </div>
          <div>
            <dt>Amount</dt>
            <dd>{{ emailSetupConfirmAmount }}</dd>
          </div>
        </dl>

        <label class="email-setup-confirm-check">
          <input v-model="emailSetupConfirmChecked" type="checkbox">
          <span>I understand that once I follow this strategy, I need to check the website tomorrow and log in after each trading day to review the trading actions for the next trading day.</span>
        </label>

        <div class="email-setup-confirm-actions">
          <button
            type="button"
            class="email-setup-cancel-button"
            :disabled="isSavingSubscription"
            @click="closeEmailSetupConfirm"
          >
            Cancel
          </button>
          <button
            type="button"
            class="save-email-button email-setup-confirm-primary"
            :disabled="!canConfirmEmailSetup"
            @click="confirmEmailSetupAndSend"
          >
            <i
              aria-hidden="true"
              class="fa"
              :class="isSavingSubscription || isPreparingEmailSetupConfirmation ? 'fa-spinner fa-spin' : 'fa-envelope-o'"
            ></i>
            {{ emailSetupConfirmPrimaryLabel }}
          </button>
        </div>
      </div>
    </div>
  </main>
</template>

<script>
import { ArrowDown, ArrowUp, ArrowUpDown } from '@lucide/vue'
import {
  confirmSwingAiSubscription,
  getSwingAiSubscription,
  getSwingTradingDashboard,
  getSwingTradingStrategyDetail,
} from '@/entities/swing-trading/api/swing-trading.api'
import { getCookieData } from '@/shared/auth/permission'
import { getSwingSignalDescription, getSwingSignalLabel } from '@/entities/swing-trading/model/swing-signal-descriptions'
import IndicatorPagination from '@/pages/indicators/ui/IndicatorPagination.vue'
import AppDataTable from '@/shared/ui/AppDataTable.vue'

const ENABLE_SWING_TRADING_API = true
const DEFAULT_SWING_AI_SUBSCRIPTION_ALLOCATION = '1000000.00'
const SWING_AI_SUBSCRIPTION_ALLOCATION_STORAGE_KEY = 'swingAiSubscriptionAllocationByStrategy'
const SWING_AI_SUBSCRIPTION_REFRESH_DELAY_MS = 5000
const SPARKLINE_TREND_POINTS = 20
const CHART_RANGE_DEBOUNCE_MS = 140
const CHART_RANGE_PREVIEW_WIDTH = 1000
const CHART_RANGE_PREVIEW_HEIGHT = 56
const CHART_RANGE_PRESETS = [
  { key: '3m', label: '3m', months: 3 },
  { key: '6m', label: '6m', months: 6 },
  { key: '1y', label: '1Y', months: 12 },
  { key: '2y', label: '2Y', months: 24 },
  { key: '3y', label: '3Y', months: 36 },
]

const tabs = [
  { key: 'overview', label: 'Holdings Overview' },
  { key: 'performance', label: 'Performance Analysis' },
  { key: 'history', label: 'Trade History' },
  { key: 'settings', label: 'Strategy Parameters' },
]

const holdingsColumns = [
  { key: 'status', label: 'Status', type: 'text' },
  { key: 'symbol', label: 'Symbol', type: 'text' },
  { key: 'entryDate', label: 'Entry Date', type: 'date' },
  { key: 'entryPrice', label: 'Entry Price', type: 'number' },
  { key: 'currentPrice', label: 'Current Price', type: 'number' },
  { key: 'profitTargetPrice', label: 'Profit Target Price', type: 'number' },
  { key: 'stopLossPrice', label: 'Stop Loss Price', type: 'number' },
  { key: 'profitPct', label: 'P&L %', type: 'percent' },
  { key: 'shares', label: 'Shares', type: 'number' },
  { key: 'positionPct', label: 'Position %', type: 'percent' },
  { key: 'signal', label: 'Signal Type', type: 'text' },
]

const historyColumns = [
  { key: 'index', label: '#', type: 'number' },
  { key: 'symbol', label: 'Symbol', type: 'text' },
  { key: 'entryDate', label: 'Entry Date', type: 'date' },
  { key: 'entryPrice', label: 'Entry<br/>Price', type: 'number' },
  { key: 'exitDate', label: 'Exit Date', type: 'date' },
  { key: 'exitPrice', label: 'Exit<br/>Price', type: 'number' },
  { key: 'returnPct', label: 'Return %', type: 'percent' },
  { key: 'exitReason', label: 'Exit Reason', type: 'text' },
  { key: 'shares', label: 'Shares', type: 'number' },
  { key: 'realizedPnl', label: 'Realized P&L', type: 'number' },
]

const shareCalculatorColumns = [
  { key: 'ticker', label: 'Ticker', type: 'text', sortable: true },
  { key: 'currentPrice', label: 'Current Price', type: 'number', sortable: true },
  { key: 'shares', label: 'YOUR CALCULATED SHARES', type: 'number', sortable: true },
  { key: 'amount', label: 'Amount', type: 'number', align: 'right', sortable: true },
]

const fallbackStrategies = [
  {
    id: '1',
    prefix: 'High Yield',
    name: 'Rounding Bottom Multi-Factor',
    totalReturn: '+15.4%',
    alpha: '+10.0%',
    winRate: '53.2%',
    maxDrawdown: '-9.9%',
    sharpeRatio: 'High',
    description: 'Rounding bottom and multi-factor confirmation strategy.',
    assets: '$2,490,367',
    change: '+$339,367 (+15.4%)',
    cash: '$470,294',
    cashPct: '18.8%',
    positions: 12,
    sellSignals: 2,
    zScore: '2.8',
    stdDev: '9.9',
    medianReturn: '+3.2%',
    benchmarkReturn: '+5.4%',
    trades: 142,
    tone: 'blue',
    trend: [20, 22, 19, 24, 28, 25, 30, 32, 29, 35],
  },
  {
    id: '2',
    prefix: 'Stable',
    name: 'Low Drawdown Risk Control',
    totalReturn: '+11.2%',
    alpha: '+5.8%',
    winRate: '62.5%',
    maxDrawdown: '-4.5%',
    sharpeRatio: 'Very High',
    description: 'Lower volatility strategy focused on tighter risk control.',
    assets: '$1,890,200',
    change: '+$190,200 (+11.2%)',
    cash: '$850,000',
    cashPct: '45.0%',
    positions: 6,
    sellSignals: 0,
    zScore: '3.2',
    stdDev: '4.5',
    medianReturn: '+2.4%',
    benchmarkReturn: '+5.4%',
    trades: 85,
    tone: 'green',
    trend: [10, 11, 12, 11.5, 13, 14, 13.5, 15, 16, 15.5],
  },
  {
    id: '3',
    prefix: 'Aggressive',
    name: 'Optimal Risk-Reward Breakout',
    totalReturn: '+18.7%',
    alpha: '+13.3%',
    winRate: '48.9%',
    maxDrawdown: '-12.1%',
    sharpeRatio: 'Medium',
    description: 'Breakout strategy optimized for higher upside and wider risk.',
    assets: '$3,100,500',
    change: '+$500,500 (+18.7%)',
    cash: '$120,000',
    cashPct: '3.8%',
    positions: 15,
    sellSignals: 4,
    zScore: '2.1',
    stdDev: '12.1',
    medianReturn: '+3.9%',
    benchmarkReturn: '+5.4%',
    trades: 210,
    tone: 'amber',
    trend: [15, 12, 18, 14, 22, 19, 25, 20, 28, 30],
  },
  {
    id: '4',
    prefix: 'Reversal',
    name: 'High Profit Factor Reversal',
    totalReturn: '+14.1%',
    alpha: '+8.7%',
    winRate: '55.4%',
    maxDrawdown: '-7.8%',
    sharpeRatio: 'High',
    description: 'Reversal strategy with stronger profit factor emphasis.',
    assets: '$2,150,000',
    change: '+$280,000 (+14.1%)',
    cash: '$350,000',
    cashPct: '16.3%',
    positions: 8,
    sellSignals: 1,
    zScore: '2.6',
    stdDev: '7.8',
    medianReturn: '+3.0%',
    benchmarkReturn: '+5.4%',
    trades: 115,
    tone: 'violet',
    trend: [12, 10, 15, 13, 18, 16, 20, 18, 22, 24],
  },
  {
    id: '5',
    prefix: 'Balanced',
    name: 'Sharpe Ratio Balanced Resonance',
    totalReturn: '+13.8%',
    alpha: '+8.4%',
    winRate: '58.1%',
    maxDrawdown: '-6.2%',
    sharpeRatio: 'Very High',
    description: 'Balanced strategy ranked by Sharpe and risk-adjusted behavior.',
    assets: '$2,050,000',
    change: '+$250,000 (+13.8%)',
    cash: '$450,000',
    cashPct: '21.9%',
    positions: 10,
    sellSignals: 2,
    zScore: '3.0',
    stdDev: '6.2',
    medianReturn: '+2.9%',
    benchmarkReturn: '+5.4%',
    trades: 130,
    tone: 'blue',
    trend: [18, 19, 18.5, 20, 21, 20.5, 22, 23, 22.5, 24],
  },
  {
    id: '6',
    prefix: 'Statistical Arb',
    name: 'Z-Score Deviation Reversal Capture',
    totalReturn: '+16.2%',
    alpha: '+10.8%',
    winRate: '51.8%',
    maxDrawdown: '-10.4%',
    sharpeRatio: 'High',
    description: 'Deviation capture strategy keyed to Z-Score extremes.',
    assets: '$2,650,000',
    change: '+$380,000 (+16.2%)',
    cash: '$280,000',
    cashPct: '10.5%',
    positions: 14,
    sellSignals: 3,
    zScore: '2.5',
    stdDev: '10.4',
    medianReturn: '+3.4%',
    benchmarkReturn: '+5.4%',
    trades: 175,
    tone: 'rose',
    trend: [22, 20, 25, 23, 28, 26, 31, 29, 34, 32],
  },
  {
    id: '7',
    prefix: 'High Frequency',
    name: 'High Win Rate Frequency Trading',
    totalReturn: '+12.5%',
    alpha: '+7.1%',
    winRate: '65.2%',
    maxDrawdown: '-5.1%',
    sharpeRatio: 'Very High',
    description: 'Higher trade frequency strategy with stronger win-rate profile.',
    assets: '$1,950,000',
    change: '+$210,000 (+12.5%)',
    cash: '$650,000',
    cashPct: '33.3%',
    positions: 5,
    sellSignals: 0,
    zScore: '3.5',
    stdDev: '5.1',
    medianReturn: '+1.8%',
    benchmarkReturn: '+5.4%',
    trades: 320,
    tone: 'green',
    trend: [8, 9, 8.5, 9.5, 10, 9.5, 10.5, 11, 10.5, 11.5],
  },
  {
    id: '8',
    prefix: 'Momentum',
    name: 'MACD Histogram Gap Resonance',
    totalReturn: '+14.9%',
    alpha: '+9.5%',
    winRate: '54.6%',
    maxDrawdown: '-8.5%',
    sharpeRatio: 'High',
    description: 'Momentum continuation strategy centered on MACD histogram gap.',
    assets: '$2,350,000',
    change: '+$310,000 (+14.9%)',
    cash: '$380,000',
    cashPct: '16.1%',
    positions: 11,
    sellSignals: 1,
    zScore: '2.7',
    stdDev: '8.5',
    medianReturn: '+3.1%',
    benchmarkReturn: '+5.4%',
    trades: 155,
    tone: 'indigo',
    trend: [16, 18, 17, 20, 19, 22, 21, 24, 23, 26],
  },
  {
    id: '9',
    prefix: 'Cycle Breakout',
    name: 'Dual Weekly Cycle Breakout',
    totalReturn: '+21.3%',
    alpha: '+15.9%',
    winRate: '45.8%',
    maxDrawdown: '-14.2%',
    sharpeRatio: 'Low',
    description: 'Higher-return cycle breakout strategy with larger drawdowns.',
    assets: '$3,650,000',
    change: '+$680,000 (+21.3%)',
    cash: '$80,000',
    cashPct: '2.1%',
    positions: 18,
    sellSignals: 5,
    zScore: '1.9',
    stdDev: '14.2',
    medianReturn: '+4.5%',
    benchmarkReturn: '+5.4%',
    trades: 245,
    tone: 'orange',
    trend: [25, 20, 30, 25, 35, 30, 40, 35, 45, 50],
  },
  {
    id: '10',
    prefix: 'Pattern Recognition',
    name: 'Minimal Pattern High Yield',
    totalReturn: '+10.4%',
    alpha: '+5.0%',
    winRate: '59.5%',
    maxDrawdown: '-5.8%',
    sharpeRatio: 'High',
    description: 'Compact pattern-recognition strategy with fewer inputs.',
    assets: '$1,750,000',
    change: '+$160,000 (+10.4%)',
    cash: '$750,000',
    cashPct: '42.8%',
    positions: 7,
    sellSignals: 1,
    zScore: '2.9',
    stdDev: '5.8',
    medianReturn: '+2.1%',
    benchmarkReturn: '+5.4%',
    trades: 105,
    tone: 'teal',
    trend: [14, 15, 14.5, 16, 15.5, 17, 16.5, 18, 17.5, 19],
  },
]

const fallbackDetail = {
  actionDate: '2026-08-12',
  lastUpdated: '2026-08-11 11:00 PM EST (Post-Market Close)',
  backtestStart: '2023-01-03',
  initialCapital: '$1,000,000',
  sortingMetric: 'Sharpe Ratio',
  profitTargetRange: '8% - 20%',
  stopLossRange: '6% - 16%',
  timeInMarketRange: '5 - 21 Bars',
  topPicks: '3 Stocks',
  allocation: '66%',
  dailyTotalPosition: '66% per day',
  signalGeneration: 'Post-Market Close',
  execution: 'Next Market Open',
  actions: {
    buy: [
      {
        symbol: 'AROC',
        cashRatio: '32.34%',
        entryPrice: '$32.99',
        profitTarget: '$36.95 (+12%)',
        stopLoss: '$31.01 (-6%)',
        timeInMarket: '21 bars',
        shares: '4,610',
        amount: '$152,084',
      },
      {
        symbol: 'EZPW',
        cashRatio: '33.66%',
        entryPrice: '$26.97',
        profitTarget: '$29.13 (+8%)',
        stopLoss: '$24.27 (-10%)',
        timeInMarket: '21 bars',
        shares: '5,869',
        amount: '$158,287',
      },
    ],
    sell: [
      {
        symbol: 'ASTE',
        reason: 'Time Is Up',
        entryPrice: '$43.62',
        currentPrice: '$42.94',
        holdingPeriod: '1 day',
        profitPct: '-1.6%',
      },
      {
        symbol: 'RMBS',
        reason: 'Time Is Up',
        entryPrice: '$101.55',
        currentPrice: '$96.42',
        holdingPeriod: '6 days',
        profitPct: '-5.0%',
      },
    ],
  },
  holdings: [
    {
      symbol: 'ASTE',
      entryDate: '2026-08-11',
      entryPrice: '$43.62',
      currentPrice: '$42.94',
      profitPct: '-1.6%',
      positionPct: '6.6%',
      signal: 'Descending Channel',
      status: 'Sell Tomorrow',
    },
    {
      symbol: 'MPC',
      entryDate: '2026-08-11',
      entryPrice: '$319.00',
      currentPrice: '$336.42',
      profitPct: '+5.5%',
      positionPct: '6.6%',
      signal: 'MA',
      status: 'Holding',
    },
    {
      symbol: 'CRUS',
      entryDate: '2026-08-11',  
      entryPrice: '$123.58',
      currentPrice: '$121.99',
      profitPct: '-1.3%',
      positionPct: '6.6%',
      signal: 'Descending Channel',
      status: 'Holding',
    },
    {
      symbol: 'RMBS',
      entryDate: '2026-08-05',
      entryPrice: '$101.55',
      currentPrice: '$96.42',
      profitPct: '-5.0%',
      positionPct: '6.6%',
      signal: 'MA',
      status: 'Sell Tomorrow',
    },
    {
      symbol: 'JBL',
      entryDate: '2026-08-05',
      entryPrice: '$337.39',
      currentPrice: '$356.61',
      profitPct: '+5.7%',
      positionPct: '6.6%',
      signal: 'MAGap',
      status: 'Holding',
    },
  ],
  history: [
    {
      index: 1,
      symbol: 'AROC',
      entryDate: '2026-07-15',
      entryPrice: '$29.54',
      exitDate: '2026-08-04',
      exitPrice: '$33.32',
      shares: '--',
      returnPct: '+12.8%',
      realizedPnl: '--',
      exitReason: 'Profit Target',
    },
    {
      index: 2,
      symbol: 'JBL',
      entryDate: '2026-07-08',
      entryPrice: '$315.18',
      exitDate: '2026-07-29',
      exitPrice: '$336.90',
      shares: '--',
      returnPct: '+6.9%',
      realizedPnl: '--',
      exitReason: 'Time Out',
    },
    {
      index: 3,
      symbol: 'RMBS',
      entryDate: '2026-06-24',
      entryPrice: '$98.80',
      exitDate: '2026-07-09',
      exitPrice: '$91.64',
      shares: '--',
      returnPct: '-7.2%',
      realizedPnl: '--',
      exitReason: 'Stop Loss',
    },
  ],
  charts: {
    cumulative: {
      imageUrl: '',
      min: -10,
      max: 30,
      ticks: [30, 20, 10, 0, -10],
      benchmark: [0, 1.2, 0.4, 2.1, 3.8, 2.9, 5.4, 4.7, 5.8, 5.4],
      strategy: [0, 2.4, 1.8, 5.2, 7.4, 9.8, 11.6, 10.9, 13.8, 15.4],
    },
    drawdown: {
      imageUrl: '',
      min: -16,
      max: 0,
      ticks: [0, -4, -8, -12, -16],
      benchmark: [0, -0.8, -2.4, -1.1, -0.6, -3.8, -2.2, -5.4, -3.7, -4.2],
      strategy: [0, -1.2, -4.7, -2.4, -1.8, -6.4, -3.2, -9.9, -5.1, -2.8],
    },
  },
  monthlyReturns: [
    { label: 'Jan', value: '+2.1%' },
    { label: 'Feb', value: '-1.2%' },
    { label: 'Mar', value: '+4.6%' },
    { label: 'Apr', value: '+3.2%' },
    { label: 'May', value: '-0.8%' },
    { label: 'Jun', value: '+5.7%' },
    { label: 'Jul', value: '+1.8%' },
    { label: 'Aug', value: '+0.9%' },
  ],
}

const guideSteps = [
  {
    index: 1,
    title: 'Choose a Strategy',
    copy: 'Compare strategy type,total return, maxdrawdown, win rate, andother performance metricsto find the strategy thatbest fits your goals.',
  },
  {
    index: 2,
    title: 'Allocate Capital',
    copy: 'Enter the amount you want to allocate to the strategy using the New Follower Setup calculator.',
  },
  {
    index: 3,
    title: 'Set Up Your Portfolio',
    copy: 'Use the calculator to determine how many shares to buy for each current strategy position, based on your allocated capital.',
  },
  {
    index: 4,
    title: 'Follow Daily Signals',
    copy: "Check Tomorrow's Actions after market close each day. Execute any required buy or sell trades at the next market open.",
  },
]

const faqItems = [
  {
    question: 'How do I choose between the 10 strategies?',
    answer: 'Compare the key metrics shown on each strategy card: Total Return, Max Drawdown, and Win Rate. Lower risk strategies have smaller drawdowns but may return less. Higher risk strategies may offer higher returns but with more volatility.'
  },
  {
    question: 'What do Total Return and Max Drawdown mean?',
    answer: 'Max Drawdown is the largest peak-to-trough decline the strategy has experienced — it shows the worst-case loss scenario. Total Return is the total percentage gain since the strategy started.',
  },
  {
    question: "If I start following a strategy today, do I need to buy all of its current holdings?",
    answer: "Yes. Use the New Follower Setup calculator to see all current strategy positions and calculate how many shares to buy for your capital amount. This ensures your portfolio matches the strategy from day one.",
  },
  {
    question: 'How does the system calculate how many shares I should buy?',
    answer: "The calculator uses the strategy's position weight for each stock. For example, if the strategy allocates 6.6% of its portfolio to a stock and you have $100,000 allocated, you would invest $6,600 in that stock, divided by the current share price.",
  },
  {
    question: 'When are trading actions generated, and when should I execute them?',
    answer: 'Trading actions are generated automatically after market close at 11:00 PM ET. You should execute any required trades at the next market open (9:30 AM ET). Trades are NOT executed automatically — you must place them yourself.',
  },
  {
    question: 'Does Sentimentrader automatically execute trades for me?',
    answer: 'No. Sentimentrader generates the trading actions and calculates position sizes, but all trades must be executed manually by you. You are responsible for placing buy and sell orders in your own brokerage account.',
  },
  {
    question: 'What happens if I choose to follow more than one strategy?',
    answer: 'You can allocate capital to multiple strategies. Each strategy operates independently with its own positions and actions. Make sure your total allocation across all strategies does not exceed your available capital.',
  },
]

const monthlyReturnColumns = [
  { key: '1', label: '1' },
  { key: '2', label: '2' },
  { key: '3', label: '3' },
  { key: '4', label: '4' },
  { key: '5', label: '5' },
  { key: '6', label: '6' },
  { key: '7', label: '7' },
  { key: '8', label: '8' },
  { key: '9', label: '9' },
  { key: '10', label: '10' },
  { key: '11', label: '11' },
  { key: '12', label: '12' },
  { key: 'YTD', label: 'YTD' },
]

const compareColumns = [
  { key: 'name', label: 'Strategy Name', type: 'text' },
  // { key: 'prefix', label: 'Type', type: 'text' },
  { key: 'totalReturn', label: 'Total Return', type: 'number' },
  { key: 'alpha', label: 'Alpha', type: 'number', tooltip: "The strategy's return minus SPY's<br/> return over the same period." },
  { key: 'winRate', label: 'Win Rate', type: 'number' },
  { key: 'maxDrawdown', label: 'Max Drawdown', type: 'number' },
  { key: 'sharpeRatio', label: 'Sharpe Ratio', type: 'rank' },
  { key: 'description', label: 'Description', type: 'text' },
]

const clone = value => JSON.parse(JSON.stringify(value))
const lineChartHoverStates = new WeakMap()

const getLineChartHoverState = vm => {
  if (!lineChartHoverStates.has(vm)) {
    lineChartHoverStates.set(vm, {
      frame: null,
      frameIsTimeout: false,
      pending: null,
    })
  }

  return lineChartHoverStates.get(vm)
}

export default {
  name: 'SwingTradingDashboard',
  components: { AppDataTable, IndicatorPagination },
  data() {
    return {
      tabs,
      compareColumns,
      holdingsColumns,
      historyColumns,
      shareCalculatorColumns,
      guideSteps,
      faqItems,
      strategies: [],
      strategyDetails: {},
      currentStrategyId: '',
      activeTab: 'overview',
      compareExpanded: false,
      guideVisible: false,
      shareCalculatorVisible: false,
      shareCalculatorCashInput: DEFAULT_SWING_AI_SUBSCRIPTION_ALLOCATION,
      shareCalculatorCashTouched: false,
      shareCalculatorCalculatedCash: null,
      emailSetupConfirmVisible: false,
      emailSetupConfirmChecked: false,
      emailSetupConfirmStrategyId: '',
      emailSetupConfirmAllocationAmount: '',
      emailSetupConfirmEmailInput: '',
      isPreparingEmailSetupConfirmation: false,
      isLoadingSubscription: false,
      isSavingSubscription: false,
      subscriptionData: null,
      subscriptionLoadError: '',
      subscriptionSaveStatus: '',
      subscriptionEmailRetryAvailable: false,
      subscriptionRefreshTimer: null,
      isLoadingDashboard: false,
      isLoadingDetail: false,
      detailRequestSerial: 0,
      apiReady: false,
      dashboardDate: '',
      historyPage: 1,
      historyPageSize: 12,
      historyPageInput: '',
      expandedHoldingRows: {},
      compareSort: {
        key: '',
        direction: 'asc',
      },
      holdingSort: {
        key: 'entryDate',
        direction: 'desc',
      },
      holdingSortTouched: false,
      historySort: {
        key: 'entryDate',
        direction: 'desc',
      },
      shareCalculatorSort: {
        key: 'shares',
        direction: 'desc',
      },
      performanceChartRanges: {
        cumulative: {
          start: null,
          end: null,
        },
        drawdown: {
          start: null,
          end: null,
        },
      },
      pendingPerformanceChartRanges: {},
      activeChartRangePresetKeys: {
        cumulative: '',
        drawdown: '',
      },
      chartRangeDebounceTimers: {},
      chartRangePresets: CHART_RANGE_PRESETS,
      cumulativeChartTooltip: {
        visible: false,
        index: -1,
        x: 58,
        benchmarkY: 274,
        strategyY: 274,
        boxX: 72,
        boxY: 40,
        date: '',
        benchmark: '',
        strategy: '',
      },
      drawdownChartTooltip: {
        visible: false,
        index: -1,
        x: 58,
        benchmarkY: 274,
        strategyY: 274,
        boxX: 72,
        boxY: 40,
        date: '',
        benchmark: '',
        strategy: '',
      },
    }
  },
  computed: {
    sortedStrategies() {
      const strategies = Array.isArray(this.strategies) ? this.strategies : []
      const sortKey = this.compareSort && this.compareSort.key
      if (!sortKey) return strategies

      const direction = this.compareSort.direction === 'desc' ? -1 : 1
      return strategies
        .map((strategy, index) => ({ strategy, index }))
        .sort((left, right) => {
          const result = this.compareStrategyValues(left.strategy, right.strategy, sortKey)
          return result === 0 ? left.index - right.index : result * direction
        })
        .map(item => item.strategy)
    },
    currentStrategy() {
      return this.strategies.find(strategy => strategy.id === this.currentStrategyId) || this.strategies[0] || {}
    },
    currentDetail() {
      return this.strategyDetails[this.currentStrategyId] || this.buildEmptyDetail(this.currentStrategy)
    },
    activeStrategyTitle() {
      if (!this.currentStrategy || !this.currentStrategy.id) return ''
      return this.currentStrategy.fullName || this.currentStrategy.name || ''
    },
    tomorrowActionsTitle() {
      return this.currentDetail.actionDate
        ? `Tomorrow's Actions (${this.currentDetail.actionDate} Market Open)`
        : "Tomorrow's Actions"
    },
    capitalNoteText() {
      const initialCapital = this.capitalNoteInitialCapital
      const backtestStart = this.capitalNoteTradingStartDate
      if (initialCapital && backtestStart) {
        return `Strategy incepted on ${backtestStart}, with an starting capital allocation of ${initialCapital}.`
      }
      if (initialCapital) return `Strategy incepted with an starting capital allocation of ${initialCapital}.`
      if (backtestStart) return `Strategy incepted on ${backtestStart}.`
      return ''
    },
    capitalNoteInitialCapital() {
      const rawInitialCapital = this.currentDetail.initialCapital || '$1,000,000'
      return this.formatMoneyValue(rawInitialCapital, rawInitialCapital)
    },
    capitalNoteTradingStartDate() {
      return this.formatCapitalNoteDate(this.currentDetail.backtestStart || 'Jan 3, 2023')
    },
    capitalNoteTradingStartedText() {
      return 'Trading Start: Jan 3, 2023'
    },
    dashboardDateInline() {
      return this.dashboardDate ? `(${this.dashboardDate})` : ''
    },
    holdingStatusText() {
      const sellSignals = this.getNumberValue(this.currentStrategy.sellSignals)
      if (sellSignals === null) return ''
      if (sellSignals > 0) return `${sellSignals} to Sell Tomorrow`
      return this.hasDisplayValue(this.currentStrategy.positions) ? 'All holding' : ''
    },    
    dashboardFooterText() {
      const parts = []
      if (this.currentDetail.lastUpdated) parts.push(`Last Updated: ${this.currentDetail.lastUpdated}`)
      if (this.currentDetail.backtestStart) parts.push(`Trading Start: ${this.currentDetail.backtestStart}`)
      return parts.join(' | ')
    },
    buyActions() {
      const detailActions = this.currentDetail.actions || {}
      if (Array.isArray(detailActions.buy) && detailActions.buy.length) return detailActions.buy
      return this.buildBuyActionsFromStrategy(this.currentStrategy)
    },
    sellActions() {
      const detailActions = this.currentDetail.actions || {}
      return Array.isArray(detailActions.sell) ? detailActions.sell : []
    },
    holdingRows() {
      return Array.isArray(this.currentDetail.holdings) ? this.currentDetail.holdings : []
    },
    hasHoldingSellTomorrowRows() {
      return this.holdingRows.some(row => this.isHoldingSellTomorrowRow(row))
    },
    holdingAvailableCashPct() {
      const cashPct = this.currentStrategy && this.currentStrategy.cashPct
      return cashPct || '--'
    },
    holdingPositionTotalPct() {
      const cashPct = this.getPercentNumber(this.holdingAvailableCashPct)
      if (cashPct !== null) return `${this.formatCompactNumber(Math.max(0, 100 - cashPct))}%`

      const values = this.holdingRows
        .map(row => this.getPercentNumber(row && row.positionPct))
        .filter(value => value !== null)
      if (!values.length) return '--'

      const total = values.reduce((sum, value) => sum + value, 0)
      return `${this.formatCompactNumber(total)}%`
    },
    shareCalculatorCash() {
      const input = String(this.shareCalculatorCashInput || '').trim()
      const cash = this.getNumberValue(input || DEFAULT_SWING_AI_SUBSCRIPTION_ALLOCATION)
      return cash !== null && cash > 0 ? cash : null
    },
    hasShareCalculatorCash() {
      return this.shareCalculatorCash !== null
    },
    shareCalculatorHasResults() {
      return this.shareCalculatorCalculatedCash !== null
    },
    formattedShareCalculatorCash() {
      return this.shareCalculatorHasResults ? this.formatMoneyValue(this.shareCalculatorCalculatedCash, '$0') : '$0'
    },
    emailSetupConfirmStrategyTitle() {
      return this.activeStrategyTitle || '--'
    },
    emailSetupConfirmAmount() {
      const allocationAmount = this.emailSetupConfirmAllocationAmount || this.getShareCalculatorAllocationAmount()
      return allocationAmount ? this.formatMoneyValue(allocationAmount, '$0') : '--'
    },
    emailSetupConfirmEmail() {
      return String(this.emailSetupConfirmEmailInput || '').trim()
    },
    hasValidEmailSetupConfirmEmail() {
      return Boolean(this.emailSetupConfirmEmail && this.isValidEmailAddress(this.emailSetupConfirmEmail))
    },
    canConfirmEmailSetup() {
      return Boolean(
        this.emailSetupConfirmChecked
        && this.hasValidEmailSetupConfirmEmail
        && this.emailSetupConfirmStrategyId
        && this.emailSetupConfirmAllocationAmount
        && !this.isSavingSubscription
        && !this.isPreparingEmailSetupConfirmation
      )
    },
    emailSetupConfirmPrimaryLabel() {
      if (this.isPreparingEmailSetupConfirmation) return 'Preparing...'
      if (this.isSavingSubscription) return 'Sending...'
      return 'Confirm & Send Email'
    },
    shareCalculatorRows() {
      if (!this.shareCalculatorHasResults) return []

      const cash = this.shareCalculatorCalculatedCash || 0
      const rows = this.buildShareCalculatorRows(cash)
        .filter(row => Number(row.sharesNumber) > 0)
      return this.getSortedTableRows(rows, this.shareCalculatorColumns, this.shareCalculatorSort)
    },
    shareCalculatorTotalAmount() {
      const totalAmount = this.shareCalculatorRows.reduce((sum, row) => {
        const amount = Number(row.amountNumber)
        return sum + (Number.isFinite(amount) ? amount : 0)
      }, 0)
      return this.formatMoneyValue(totalAmount, '$0')
    },
    currentStrategySubscription() {
      const strategyId = this.getCurrentStrategySubscriptionId()
      const strategies = this.getActiveSubscriptionStrategies()
      return strategies.find(item => String(this.getSubscriptionStrategyId(item)) === String(strategyId)) || null
    },
    currentStrategySubscriptionAllocation() {
      if (!this.currentStrategySubscription) return ''
      return this.getSubscriptionAllocationAmount(this.currentStrategySubscription)
    },
    isSubscriptionEmailPending() {
      return this.getSubscriptionLastEmailStatus(this.subscriptionData, this.currentStrategySubscription) === 'pending'
    },
    hasCurrentSubscriptionSentSameSetup() {
      const allocationAmount = this.getShareCalculatorAllocationAmount()
      return Boolean(
        this.currentStrategySubscription
        && allocationAmount
        && this.isCurrentSubscriptionEmailSent()
        && this.isSameSubscriptionAllocation(this.currentStrategySubscription, allocationAmount)
        && this.isCurrentSubscriptionEmailUnchanged()
      )
    },
    saveEmailSetupDisabled() {
      return this.isSavingSubscription
        || this.isPreparingEmailSetupConfirmation
        || !this.hasShareCalculatorCash
        || !this.getCurrentStrategySubscriptionId()
    },
    saveEmailButtonLabel() {
      if (this.isPreparingEmailSetupConfirmation) return 'Preparing...'
      if (this.isSavingSubscription) return 'Sending...'
      return 'Confirm & Send Email'
    },
    sortedHoldingRows() {
      const holdingRows = this.holdingRows
      console.log('sortedHoldingRows', holdingRows)
      if (this.hasHoldingSellTomorrowRows && !this.holdingSortTouched) {
        return holdingRows
          .map((row, index) => ({
            row,
            index,
            sellTomorrow: this.isHoldingSellTomorrowRow(row),
          }))
          .sort((left, right) => {  
            if (left.sellTomorrow !== right.sellTomorrow) return left.sellTomorrow ? -1 : 1
            return left.index - right.index
          })
          .map(item => item.row)
      }

      return this.getSortedTableRows(holdingRows, this.holdingsColumns, this.getEffectiveHoldingSort())
    },
    historyRows() {
      return Array.isArray(this.currentDetail.history) ? this.currentDetail.history : []
    },
    sortedHistoryRows() {
      return this.getSortedTableRows(this.historyRows, this.historyColumns, this.historySort)
    },
    visibleHistoryRows() {
      const start = (this.historyPage - 1) * this.historyPageSize
      return this.sortedHistoryRows.slice(start, start + this.historyPageSize)
    },
    historyPageCount() {
      return Math.max(Math.ceil(this.historyRows.length / this.historyPageSize), 1)
    },
    historyPageItems() {
      const total = this.historyPageCount
      const current = this.historyPage
      const pages = new Set([1, total])

      for (let page = current - 2; page <= current + 2; page += 1) {
        if (page > 1 && page < total) pages.add(page)
      }

      if (current <= 4) {
        for (let page = 2; page <= Math.min(5, total - 1); page += 1) pages.add(page)
      }
      if (current >= total - 3) {
        for (let page = Math.max(2, total - 4); page < total; page += 1) pages.add(page)
      }

      const sortedPages = Array.from(pages).sort((left, right) => left - right)
      return sortedPages.reduce((items, page, index) => {
        const previousPage = sortedPages[index - 1]
        if (index > 0 && page - previousPage > 1) {
          items.push({ type: 'ellipsis' })
        }
        items.push({ type: 'page', value: page })
        return items
      }, [])
    },
    performanceStats() {
      const detailStats = this.currentDetail.summaryStats
      if (Array.isArray(detailStats) && detailStats.length) return detailStats
      if (!this.currentStrategy || !this.currentStrategy.id) return []
      return this.buildPerformanceStats({}, this.currentStrategy)
    },
    parameterSections() {
      if (!this.currentStrategy || !this.currentStrategy.id) return []
      const detail = this.currentDetail
      return [
        {
          title: 'Filter Conditions',
          items: [
            { label: 'Sorting by:', value: detail.sortingMetric || 'Sharpe Ratio' },
            { label: 'Profit Target:', value: '8% - 20%' },
            { label: 'Stop Loss:', value: '6% - 16%' },
            { label: 'Holding Period:', value: '5 - 21 Bars' },
            { label: 'Top Picks:', value: '3 Stocks', tooltipText: `Selects the top 3 stocks based on ${detail.sortingMetric || 'Sharpe Ratio'} ranking.` },
          ],
        },
        {
          title: 'Core Parameters',
          items: [
            { label: 'Daily Exposure Limit:', value: '66%', tooltipText: 'Total capital allocated to strategy positions on any given trading day is capped at 66% of available capital.' },
            { label: 'Starting Capital:', value: detail.initialCapital },
            { label: 'Trading Start:', value: detail.backtestStart || 'Jan 3, 2023' },
            { label: 'Signal List:', value: this.parseSignalList(detail.signalListDescription) },
          ],
        },
      ]
    },
    monthlyReturns() {
      return Array.isArray(this.currentDetail.monthlyReturns) ? this.currentDetail.monthlyReturns : []
    },
    monthlyReturnColumns() {
      return monthlyReturnColumns
    },
    cumulativeChartRender() {
      return this.buildLineChartRender('cumulative')
    },
    drawdownChartRender() {
      return this.buildLineChartRender('drawdown')
    },
    cumulativeChartPreview() {
      return this.buildChartRangePreview('cumulative')
    },
    drawdownChartPreview() {
      return this.buildChartRangePreview('drawdown')
    },
    cumulativeChartRangePresets() {
      return this.buildChartRangePresetItems('cumulative')
    },
    drawdownChartRangePresets() {
      return this.buildChartRangePresetItems('drawdown')
    },
  },
  watch: {
    currentStrategyId() {
      this.resetHistoryPage()
      this.resetHoldingSort()
      this.resetEmailSetupConfirmation()
      this.shareCalculatorCashTouched = false
      this.shareCalculatorCalculatedCash = null
      this.syncShareCalculatorInputFromSubscription()
      this.resetPerformanceChartRange()
      this.fetchStrategyDetailData()
    },
    activeTab() {
      this.resetHistoryPage()
    },
    historyPageCount(pageCount) {
      if (this.historyPage > pageCount) {
        this.goToHistoryPage(pageCount)
      }
    },
  },
  mounted() {
    window.addEventListener('keydown', this.handleKeydown)
    this.initializeDashboard()
  },
  beforeUnmount() {
    window.removeEventListener('keydown', this.handleKeydown)
    this.cancelLineChartHoverFrame()
    this.clearChartRangeDebounceTimers()
    this.clearSubscriptionRefreshTimer()
  },
  methods: { 
    parseSignalList(signalListStr) {
      if (!signalListStr) return []
      return String(signalListStr)
        .split('|')
        .map(s => s.trim())
        .filter(Boolean)
    },
    sortCompareTable(key) {
      if (this.compareSort.key === key) {
        this.compareSort = {
          key,
          direction: this.compareSort.direction === 'asc' ? 'desc' : 'asc',
        }
        return
      }

      this.compareSort = {
        key,
        direction: this.getDefaultCompareSortDirection(key),
      }
    },
    getDefaultCompareSortDirection(key) {
      return ['totalReturn', 'alpha', 'winRate', 'maxDrawdown', 'sharpeRatio'].includes(key) ? 'desc' : 'asc'
    },
    getCompareSortIcon(key) {
      if (this.compareSort.key !== key) return ArrowUpDown
      return this.compareSort.direction === 'asc' ? ArrowUp : ArrowDown
    },
    getCompareSortAria(key) {
      if (this.compareSort.key !== key) return 'none'
      return this.compareSort.direction === 'asc' ? 'ascending' : 'descending'
    },
    compareStrategyValues(leftStrategy, rightStrategy, key) {
      const column = this.compareColumns.find(item => item.key === key) || { key, type: 'text' }
      const leftValue = this.getStrategySortValue(leftStrategy, column)
      const rightValue = this.getStrategySortValue(rightStrategy, column)
      const leftMissing = leftValue === undefined || leftValue === null || leftValue === ''
      const rightMissing = rightValue === undefined || rightValue === null || rightValue === ''

      if (leftMissing && rightMissing) return 0
      if (leftMissing) return 1
      if (rightMissing) return -1
      if (typeof leftValue === 'number' && typeof rightValue === 'number') return leftValue - rightValue
      return String(leftValue).localeCompare(String(rightValue), undefined, { numeric: true, sensitivity: 'base' })
    },
    getStrategySortValue(strategy, column) {
      const value = strategy && strategy[column.key]
      if (column.type === 'number') return this.getPercentNumber(value)
      if (column.type === 'rank') return this.getSharpeSortValue(value)
      return value || ''
    },
    getSharpeSortValue(value) {
      const rank = {
        low: 1,
        medium: 2,
        high: 3,
        'very high': 4,
      }[String(value || '').trim().toLowerCase()]

      if (rank) return rank

      const numericValue = this.getNumberValue(value)
      if (numericValue !== null) return numericValue

      return value || ''
    },
    getSignedValueClass(value) {
      const numberValue = this.getPercentNumber(value)
      return {
        'positive-cell': numberValue !== null && numberValue > 0,
        'negative-cell': numberValue !== null && numberValue < 0,
      }
    },
    getDailyReturnDirectionIcon(value) {
      const numberValue = this.getPercentNumber(value)
      if (numberValue === null || numberValue === 0) return ''
      return numberValue > 0 ? 'fa-arrow-up' : 'fa-arrow-down'
    },
    getPerformanceStatValueClass(stat) {
      const label = String((stat && stat.label) || '').toLowerCase()
      const numberValue = this.getPercentNumber(stat.value)
      if (numberValue === null) return {}
      if (label.includes('average trade loss') || label.includes('max risk')) {
        return { 'negative-cell': true }
      }
      if (!label.includes('return') && !label.includes('average trade win')) return {}

      return {
        'positive-cell': numberValue > 0,
        'negative-cell': numberValue < 0,
      }
    },
    hasDisplayValue(value) {
      return value !== undefined && value !== null && value !== ''
    },
    formatCountWithUnit(value, unit) {
      if (!this.hasDisplayValue(value)) return ''
      return `${value} ${unit}`
    },
    sortHoldingTable(key) {
      this.holdingSort = this.getNextTableSort(this.getEffectiveHoldingSort(), key, this.getTableColumn(this.holdingsColumns, key))
      this.holdingSortTouched = true
    },
    sortHistoryTable(key) {
      this.historySort = this.getNextTableSort(this.historySort, key, this.getTableColumn(this.historyColumns, key))
      this.resetHistoryPage()
    },
    sortShareCalculatorTable(key) {
      this.shareCalculatorSort = this.getNextTableSort(
        this.shareCalculatorSort,
        key,
        this.getTableColumn(this.shareCalculatorColumns, key),
      )
    },
    resetHistoryPage() {
      this.historyPage = 1
      this.historyPageInput = ''
    },
    downloadTradeHistory() {
      const rows = Array.isArray(this.sortedHistoryRows) ? this.sortedHistoryRows : []
      if (!rows.length) return

      const headers = this.historyColumns.map(column => this.getCsvColumnLabel(column))
      const csvRows = rows.map(row => this.historyColumns.map(column => this.formatCsvCell(row && row[column.key])).join(','))
      const csvContent = [headers.map(header => this.escapeCsvCell(header)).join(','), ...csvRows].join('\r\n')
      const blob = new Blob([`\ufeff${csvContent}`], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)

      link.href = url
      link.download = this.getTradeHistoryFileName()
      link.style.display = 'none'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    },
    getCsvColumnLabel(column) {
      return String(column && column.label ? column.label : '')
        .replace(/<br\s*\/?>/gi, ' ')
        .replace(/<[^>]+>/g, '')
        .trim()
    },
    formatCsvCell(value) {
      if (value === undefined || value === null) return ''
      return this.escapeCsvCell(value)
    },
    escapeCsvCell(value) {
      const text = String(value)
      return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
    },
    getTradeHistoryFileName() {
      const strategyName = this.currentStrategy && (this.currentStrategy.fullName || this.currentStrategy.name)
      const safeStrategyName = String(strategyName || 'swing-trading')
        .trim()
        .replace(/[^a-z0-9]+/gi, '-')
        .replace(/^-+|-+$/g, '')
        .toLowerCase()
      const date = new Date()
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')

      return `${safeStrategyName || 'swing-trading'}-trade-history-${year}${month}${day}.csv`
    },
    resetHoldingSort() {
      this.holdingSort = {
        key: 'entryDate',
        direction: 'desc',
      }
      this.holdingSortTouched = false
    },
    resetPerformanceChartRange() {
      this.clearChartRangeDebounceTimers()
      this.pendingPerformanceChartRanges = {}
      this.activeChartRangePresetKeys = {
        cumulative: '',
        drawdown: '',
      }
      this.performanceChartRanges = {
        cumulative: {
          start: null,
          end: null,
        },
        drawdown: {
          start: null,
          end: null,
        },
      }
      this.clearCumulativeChartHover()
      this.clearDrawdownChartHover()
    },
    submitHistoryPageJump() {
      this.goToHistoryPage(this.historyPageInput)
    },
    goToHistoryPage(page) {
      const pageNumber = this.getNumberValue(page)
      if (pageNumber === null) {
        this.historyPageInput = ''
        return
      }

      const nextPage = Math.min(Math.max(Math.trunc(pageNumber), 1), this.historyPageCount)
      this.historyPage = nextPage
      this.historyPageInput = ''
    },
    getHoldingSortIcon(key) {
      return this.getTableSortIcon(this.getEffectiveHoldingSort(), key)
    },
    getHistorySortIcon(key) {
      return this.getTableSortIcon(this.historySort, key)
    },
    getHoldingSortAria(key) {
      return this.getTableSortAria(this.getEffectiveHoldingSort(), key)
    },
    isHoldingSortActive(key) {
      const sort = this.getEffectiveHoldingSort()
      return Boolean(sort && sort.key === key)
    },
    getEffectiveHoldingSort() {
      if (this.hasHoldingSellTomorrowRows && !this.holdingSortTouched) return null

      return this.holdingSort || {
        key: 'entryDate',
        direction: 'desc',
      }
    },
    getHistorySortAria(key) {
      return this.getTableSortAria(this.historySort, key)
    },
    getNextTableSort(currentSort, key, column) {
      if (currentSort && currentSort.key === key) {
        return {
          key,
          direction: currentSort.direction === 'asc' ? 'desc' : 'asc',
        }
      }

      return {
        key,
        direction: this.getDefaultTableSortDirection(column),
      }
    },
    getDefaultTableSortDirection(column) {
      return column && ['number', 'percent', 'date', 'rank'].includes(column.type) ? 'desc' : 'asc'
    },
    getTableSortIcon(sort, key) {
      if (!sort || sort.key !== key) return ArrowUpDown
      return sort.direction === 'asc' ? ArrowUp : ArrowDown
    },
    getTableSortAria(sort, key) {
      if (!sort || sort.key !== key) return 'none'
      return sort.direction === 'asc' ? 'ascending' : 'descending'
    },
    getTableColumn(columns, key) {
      return (columns || []).find(column => column.key === key) || { key, type: 'text' }
    },
    getSortedTableRows(rows, columns, sort) {
      const sourceRows = Array.isArray(rows) ? rows : []
      if (!sort || !sort.key) return sourceRows

      const column = this.getTableColumn(columns, sort.key)
      const direction = sort.direction === 'desc' ? -1 : 1
      return sourceRows
        .map((row, index) => ({ row, index }))
        .sort((left, right) => {
          const result = this.compareTableRowValues(left.row, right.row, column)
          return result === 0 ? left.index - right.index : result * direction
        })
        .map(item => item.row)
    },
    compareTableRowValues(leftRow, rightRow, column) {
      const leftValue = this.getTableRowSortValue(leftRow, column)
      const rightValue = this.getTableRowSortValue(rightRow, column)
      const leftMissing = leftValue === undefined || leftValue === null || leftValue === ''
      const rightMissing = rightValue === undefined || rightValue === null || rightValue === ''

      if (leftMissing && rightMissing) return 0
      if (leftMissing) return 1
      if (rightMissing) return -1
      if (typeof leftValue === 'number' && typeof rightValue === 'number') return leftValue - rightValue
      return String(leftValue).localeCompare(String(rightValue), undefined, { numeric: true, sensitivity: 'base' })
    },
    getTableRowSortValue(row, column) {
      const value = row && row[column.key]
      if (column.type === 'number') return this.getNumberValue(value)
      if (column.type === 'percent') return this.getPercentNumber(value)
      if (column.type === 'date') return this.getSortableDateValue(value)
      if (column.type === 'rank') return this.getSharpeSortValue(value)
      return value || ''
    },
    getSortableDateValue(value) {
      if (!value || value === '--') return null
      const timestamp = new Date(value).getTime()
      return Number.isFinite(timestamp) ? timestamp : null
    },
    async initializeDashboard() {
      await this.fetchDashboardData()
      await this.fetchStrategyDetailData()
    },
    async fetchDashboardData() {
      if (!ENABLE_SWING_TRADING_API) return

      this.isLoadingDashboard = true
      try {
        const response = await getSwingTradingDashboard()
        const normalized = this.normalizeDashboardResponse(response)
        this.dashboardDate = normalized.date || this.dashboardDate
        if (normalized.strategies.length) {
          this.strategies = this.mergeStrategies(normalized.strategies)
          if (!this.strategies.some(strategy => strategy.id === this.currentStrategyId)) {
            this.currentStrategyId = this.strategies[0].id
          }
          this.fetchStrategySummaries()
        } else if (!this.strategies.length) {
          this.strategies = []
          this.strategyDetails = {}
          this.currentStrategyId = ''
        }
        this.apiReady = true
      } catch (error) {
        this.apiReady = false
        if (!this.strategies.length) {
          this.strategyDetails = {}
          this.currentStrategyId = ''
        }
      } finally {
        this.isLoadingDashboard = false
      }
    },
    async fetchStrategyDetailData() {
      const strategyId = this.currentStrategyId
      const strategy = this.strategies.find(item => item.id === strategyId) || this.currentStrategy
      const requestSerial = ++this.detailRequestSerial

      if (!ENABLE_SWING_TRADING_API || !strategyId) {
        return
      }

      this.isLoadingDetail = true
      try {
        const totalTrades = this.getNumberValue(strategy.trades)
        const response = await getSwingTradingStrategyDetail(this.getStrategyApiId(strategyId), {
          page: 1,
          page_size: totalTrades && totalTrades > 0 ? Math.ceil(totalTrades) : 200,
        })
        const detail = this.normalizeDetailResponse(response, strategy)
        this.strategyDetails[strategyId] = detail
        this.applyStrategyMetrics(detail.strategyMetrics, strategyId)
        if (requestSerial === this.detailRequestSerial) {
          this.apiReady = true
        }
      } catch (error) {
        if (requestSerial === this.detailRequestSerial) {
          this.apiReady = false
          this.strategyDetails[strategyId] = this.buildEmptyDetail(strategy)
        }
      } finally {
        if (requestSerial === this.detailRequestSerial) {
          this.isLoadingDetail = false
        }
      }
    },
    async fetchStrategySummaries() {
      const strategyIds = this.strategies
        .map(strategy => strategy.id)
        .filter(Boolean)
        .filter(strategyId => strategyId !== this.currentStrategyId)

      await Promise.all(strategyIds.map(async strategyId => {
        try {
          const response = await getSwingTradingStrategyDetail(this.getStrategyApiId(strategyId), {
            page: 1,
            page_size: 1,
          })
          const data = this.unwrapResponse(response)
          const summary = data && data.summary ? Object.assign({}, data, data.summary) : data || {}
          const positions = Array.isArray(data && data.positions) ? data.positions : []
          const sellActions = this.buildSellActionsFromPositions(positions)
          console.log('sellActions', sellActions)
          const strategy = this.strategies.find(item => item.id === strategyId) || {}
          this.applyStrategyMetrics(this.buildStrategyMetrics(summary, strategy, positions, sellActions), strategyId)
        } catch (error) {
          // Keep the dashboard usable if a single strategy summary fails.
        }
      }))
    },
    async fetchSwingAiSubscription(options = {}) {
      if (!ENABLE_SWING_TRADING_API) return null

      this.isLoadingSubscription = true
      if (!options.silent) this.subscriptionLoadError = ''

      try {
        const response = await getSwingAiSubscription()
        const body = this.getSubscriptionResponseBody(response)
        const httpStatus = response && response.status

        if (httpStatus === 404) {
          if (body && body.msg === 'Subscription not found.') {
            this.subscriptionData = null
            return null
          }

          const message = this.getSubscriptionResponseMessage(body, 'Email setup not found.')
          this.subscriptionData = null
          this.subscriptionLoadError = message
          this.showSubscriptionLoadPopup(message, options)
          return null
        }

        if (httpStatus === 410) {
          this.handleSubscriptionAuthRequired()
          return null
        }

        if (!this.isSuccessHttpStatus(httpStatus)) {
          const message = this.getSubscriptionResponseMessage(body, 'Could not load email setup.')
          this.subscriptionLoadError = message
          this.showSubscriptionLoadPopup(message, options)
          return null
        }

        const data = this.getSubscriptionResponseData(response)
        this.applySwingAiSubscriptionData(data)
        if (options.silent && this.subscriptionSaveStatus === 'pending' && !options.skipPendingStateUpdate) {
          this.updateSubscriptionPendingState()
        }
        return data
      } catch (error) {
        const message = this.getSubscriptionErrorMessage(error, 'Could not load email setup.')
        this.subscriptionLoadError = message
        this.showSubscriptionLoadPopup(message, options)
        return null
      } finally {
        this.isLoadingSubscription = false
      }
    },
    openEmailSetupConfirm() {
      if (
        this.isSavingSubscription
        || this.isPreparingEmailSetupConfirmation
      ) return

      const strategyId = this.getCurrentStrategySubscriptionId()
      const allocationAmount = this.getShareCalculatorAllocationAmount()

      if (!strategyId) {
        this.setSubscriptionSaveState('error', 'Strategy unavailable.')
        return
      }

      if (!allocationAmount) {
        this.setSubscriptionSaveState('error', 'Enter an amount over 0.')
        return
      }

      this.isPreparingEmailSetupConfirmation = true
      this.subscriptionLoadError = ''
      this.subscriptionSaveStatus = ''
      this.subscriptionEmailRetryAvailable = false
      this.rememberShareCalculatorAllocationAmount(strategyId, allocationAmount)

      this.emailSetupConfirmStrategyId = strategyId
      this.emailSetupConfirmAllocationAmount = allocationAmount
      this.emailSetupConfirmEmailInput = this.getDefaultEmailSetupNotificationEmail()
      this.emailSetupConfirmChecked = false
      this.emailSetupConfirmVisible = true
      this.isPreparingEmailSetupConfirmation = false
    },
    async confirmEmailSetupAndSend() {
      if (!this.canConfirmEmailSetup) return

      const strategies = this.buildSubscriptionSaveStrategies(
        this.emailSetupConfirmStrategyId,
        this.emailSetupConfirmAllocationAmount,
        this.emailSetupConfirmEmail
      )

      this.emailSetupConfirmVisible = false
      this.emailSetupConfirmChecked = false

      await this.saveEmailSetup(strategies)
    },
    async saveEmailSetup(strategies = []) {
      if (
        this.isSavingSubscription
        || this.isPreparingEmailSetupConfirmation
      ) return

      if (!Array.isArray(strategies) || !strategies.length) {
        this.setSubscriptionSaveState('error', 'Strategy unavailable.')
        return
      }

      const currentStrategyForSave = this.getSubscriptionStrategyFromList(strategies, this.emailSetupConfirmStrategyId)
      const currentNotificationEmail = this.getSubscriptionStrategyNotificationEmail(currentStrategyForSave)
      if (!currentNotificationEmail || !this.isValidEmailAddress(currentNotificationEmail)) {
        this.setSubscriptionSaveState('error', 'Enter a valid email address.')
        return
      }

      this.isSavingSubscription = true
      this.setSubscriptionSaveState('pending', 'Saving setup...', { notify: false })

      try {
        const response = await confirmSwingAiSubscription(strategies)
        const body = this.getSubscriptionResponseBody(response)
        const data = this.getSubscriptionResponseData(response)

        if (data && typeof data === 'object') {
          this.applySwingAiSubscriptionData(data)
        }

        await this.handleSubscriptionSaveResponse(response, body, data)
      } catch (error) {
        this.setSubscriptionSaveState('error', this.getSubscriptionErrorMessage(error, 'Save failed.'))
      } finally {
        this.isSavingSubscription = false
        this.resetEmailSetupConfirmation()
      }
    },
    async handleSubscriptionSaveResponse(response, body, data) {
      const httpStatus = response && response.status
      const dataStatus = String((data && data.status) || '').trim().toLowerCase()
      const lastEmail = data && data.last_email
      const lastEmailStatus = String((lastEmail && lastEmail.status) || '').trim().toLowerCase()

      if (httpStatus === 410) {
        this.handleSubscriptionAuthRequired()
        return
      }

      if (httpStatus === 409) {
        this.setSubscriptionSaveState('info', this.getSubscriptionResponseMessage(body, 'Subscription changed. Please confirm again.'))
        return
      }

      if (httpStatus === 202 || lastEmailStatus === 'pending') {
        this.setSubscriptionSaveState('pending', this.getSubscriptionResponseMessage(body, 'Email is sending.'))
        return
      }

      if (httpStatus === 502 || lastEmailStatus === 'failed') {
        this.setSubscriptionSaveState(
          'error',
          this.getSubscriptionResponseMessage(body, 'Saved. Email failed.'),
          { canRetryEmail: true }
        )
        return
      }

      if (httpStatus === 400) {
        this.setSubscriptionSaveState('error', this.getSubscriptionResponseMessage(body, 'Invalid amount or strategy.'))
        return
      }

      if (httpStatus === 404) {
        this.setSubscriptionSaveState('error', this.getSubscriptionResponseMessage(body, 'Subscription data not found.'))
        return
      }

      if (httpStatus === 201 && dataStatus === 'active') {
        this.setSubscriptionSaveState('success', this.getSubscriptionResponseMessage(body, 'Setup saved. Email sent.'))
        return
      }

      if (httpStatus === 200 && dataStatus === 'active') {
        this.setSubscriptionSaveState('success', this.getSubscriptionResponseMessage(body, 'Setup saved. Email sent.'))
        return
      }

      if (this.isSuccessHttpStatus(httpStatus)) {
        this.setSubscriptionSaveState('info', this.getSubscriptionResponseMessage(body, 'Email setup saved.'))
        return
      }

      this.setSubscriptionSaveState('error', this.getSubscriptionResponseMessage(body, 'Save failed.'))
    },
    buildSubscriptionSaveStrategies(strategyId, allocationAmount, notificationEmail = '') {
      const fallbackNotificationEmail = this.getSubscriptionNotificationEmail(this.subscriptionData)
      const strategies = this.getActiveSubscriptionStrategies()
        .filter(item => String(this.getSubscriptionStrategyId(item)) !== String(strategyId))
        .map(item => this.buildSubscriptionSaveStrategy(
          this.getSubscriptionStrategyId(item),
          this.getSubscriptionAllocationAmount(item),
          this.getSubscriptionStrategyNotificationEmail(item) || fallbackNotificationEmail
        ))
        .filter(item => Number.isInteger(item.strategy_id) && item.strategy_id > 0 && item.allocation_amount)

      strategies.push(this.buildSubscriptionSaveStrategy(strategyId, allocationAmount, notificationEmail))

      return strategies
    },
    buildSubscriptionSaveStrategy(strategyId, allocationAmount, notificationEmail = '') {
      const strategy = {
        strategy_id: Number(strategyId),
        allocation_amount: allocationAmount,
      }
      const nextNotificationEmail = String(notificationEmail || '').trim()
      if (nextNotificationEmail) strategy.notification_email = nextNotificationEmail
      return strategy
    },
    getLocalStrategyNameBySubscriptionId(strategyId) {
      const strategy = this.strategies.find(item => {
        const rawStrategyId = this.getFirstDefined(item, ['strategy_id', 'strategyId', 'id', 'sourceId'])
        return String(this.getStrategyApiId(rawStrategyId)) === String(strategyId)
      })
      return strategy ? strategy.fullName || strategy.name || '' : ''
    },
    getActiveSubscriptionStrategies() {
      if (!this.isActiveSwingAiSubscription(this.subscriptionData)) return []
      return Array.isArray(this.subscriptionData.strategies) ? this.subscriptionData.strategies : []
    },
    getSubscriptionStrategy(subscription, strategyId) {
      const strategies = subscription && Array.isArray(subscription.strategies) ? subscription.strategies : []
      return this.getSubscriptionStrategyFromList(strategies, strategyId)
    },
    getSubscriptionStrategyFromList(strategies, strategyId) {
      if (!Array.isArray(strategies)) return null
      return strategies.find(item => String(this.getSubscriptionStrategyId(item)) === String(strategyId)) || null
    },
    isSameSubscriptionAllocation(subscriptionStrategy, allocationAmount) {
      const subscribedAmount = this.getSubscriptionAllocationAmount(subscriptionStrategy)
      const nextAmount = this.formatSubscriptionAllocationInput(allocationAmount)
      return Boolean(subscribedAmount && nextAmount && subscribedAmount === nextAmount)
    },
    isCurrentSubscriptionAllocationChanged() {
      if (!this.currentStrategySubscription) return false
      const allocationAmount = this.getShareCalculatorAllocationAmount()
      if (!allocationAmount) return false
      return !this.isSameSubscriptionAllocation(this.currentStrategySubscription, allocationAmount)
    },
    isCurrentSubscriptionEmailUnchanged() {
      const notificationEmail = this.getDefaultEmailSetupNotificationEmail()
      const lastEmail = this.getSubscriptionLastEmailAddress(this.subscriptionData, this.currentStrategySubscription)
      if (!notificationEmail) return false
      if (!lastEmail) return true
      return this.normalizeEmail(notificationEmail) === this.normalizeEmail(lastEmail)
    },
    isCurrentSubscriptionEmailSent() {
      return this.isSubscriptionEmailSent(this.subscriptionData, this.currentStrategySubscription)
    },
    isSubscriptionEmailSent(subscription, subscriptionStrategy) {
      return this.getSubscriptionLastEmailStatus(subscription, subscriptionStrategy) === 'sent'
    },
    isActiveSwingAiSubscription(subscription) {
      if (!subscription || typeof subscription !== 'object') return false

      const status = String(subscription.status || '').trim().toLowerCase()
      if (['active', 'subscribed', 'pending', 'pending_confirmation'].includes(status)) return true
      if (['unsubscribed', 'inactive', 'cancelled', 'canceled', 'expired'].includes(status)) return false

      return Array.isArray(subscription.strategies) && subscription.strategies.length > 0
    },
    getCurrentStrategySubscriptionId() {
      const rawStrategyId = this.getFirstDefined(this.currentStrategy, ['strategy_id', 'strategyId', 'id', 'sourceId'])
        || this.currentStrategyId
      const strategyId = Number(this.getStrategyApiId(rawStrategyId))
      return Number.isInteger(strategyId) && strategyId > 0 ? strategyId : ''
    },
    getSubscriptionStrategyId(strategy) {
      const rawStrategyId = this.getFirstDefined(strategy, ['strategy_id', 'strategyId', 'id'])
      const strategyId = Number(this.getStrategyApiId(rawStrategyId))
      return Number.isInteger(strategyId) && strategyId > 0 ? strategyId : ''
    },
    getSubscriptionAllocationAmount(subscriptionStrategy, fallback = DEFAULT_SWING_AI_SUBSCRIPTION_ALLOCATION) {
      const allocationAmount = this.getFirstDefined(subscriptionStrategy, ['allocation_amount', 'allocationAmount'])
      if (
        !subscriptionStrategy
        || allocationAmount === undefined
        || allocationAmount === null
        || allocationAmount === ''
      ) {
        return this.formatSubscriptionAllocationInput(fallback)
      }

      return this.formatSubscriptionAllocationInput(allocationAmount)
    },
    getDefaultEmailSetupNotificationEmail() {
      const subscriptionEmail = this.getSubscriptionStrategyNotificationEmail(this.currentStrategySubscription)
        || this.getSubscriptionNotificationEmail(this.subscriptionData)
      if (subscriptionEmail) return String(subscriptionEmail).trim()

      return this.getCookieUserEmail() || this.getStoreUserEmail()
    },
    getSubscriptionStrategyNotificationEmail(subscriptionStrategy) {
      if (!subscriptionStrategy || typeof subscriptionStrategy !== 'object') return ''

      const notificationEmail = this.getFirstDefined(subscriptionStrategy, [
        'notification_email',
        'notificationEmail',
      ])
      return notificationEmail ? String(notificationEmail) : ''
    },
    getSubscriptionNotificationEmail(subscription) {
      if (!subscription || typeof subscription !== 'object') return ''

      const notificationEmail = this.getFirstDefined(subscription, ['notification_email', 'notificationEmail'])
      return notificationEmail ? String(notificationEmail) : this.getSubscriptionUserEmail(subscription)
    },
    getSubscriptionUserEmail(subscription) {
      if (!subscription || typeof subscription !== 'object') return ''

      const directEmail = this.getFirstDefined(subscription, ['user_email', 'userEmail', 'email'])
      if (directEmail) return String(directEmail)

      const user = subscription.user && typeof subscription.user === 'object' ? subscription.user : null
      const userEmail = user && this.getFirstDefined(user, ['user_email', 'userEmail', 'email'])
      if (userEmail) return String(userEmail)

      const lastEmail = subscription.last_email && typeof subscription.last_email === 'object'
        ? subscription.last_email
        : null
      const lastEmailAddress = lastEmail && this.getFirstDefined(lastEmail, ['user_email', 'userEmail', 'email', 'to', 'recipient'])
      return lastEmailAddress ? String(lastEmailAddress) : ''
    },
    getSubscriptionLastEmail(subscription, subscriptionStrategy) {
      const strategyEmail = subscriptionStrategy && subscriptionStrategy.last_email
      const subscriptionEmail = subscription && subscription.last_email
      return strategyEmail || subscriptionEmail || null
    },
    getSubscriptionLastEmailStatus(subscription, subscriptionStrategy) {
      const lastEmail = this.getSubscriptionLastEmail(subscription, subscriptionStrategy)
      if (!lastEmail || typeof lastEmail !== 'object') return ''
      return String(lastEmail.status || '').trim().toLowerCase()
    },
    getSubscriptionLastEmailAddress(subscription, subscriptionStrategy) {
      const lastEmail = this.getSubscriptionLastEmail(subscription, subscriptionStrategy)
      if (!lastEmail) return ''
      if (typeof lastEmail === 'string') return lastEmail
      if (typeof lastEmail !== 'object') return ''

      const email = this.getFirstDefined(lastEmail, [
        'notification_email',
        'notificationEmail',
        'user_email',
        'userEmail',
        'email',
        'to',
        'recipient',
        'recipient_email',
        'recipientEmail',
      ])
      return email ? String(email) : ''
    },
    getCookieUserEmail() {
      try {
        const cookieData = getCookieData()
        const email = cookieData && cookieData.username
        return email && this.isValidEmailAddress(email) ? String(email).trim() : ''
      } catch (error) {
        return ''
      }
    },
    getStoreUserEmail() {
      const userState = this.$store && this.$store.state && this.$store.state.user
      const email = userState && userState.userID
      return email && this.isValidEmailAddress(email) ? String(email).trim() : ''
    },
    isValidEmailAddress(email) {
      const value = String(email || '').trim()
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
    },
    normalizeEmail(email) {
      return String(email || '').trim().toLowerCase()
    },
    getShareCalculatorAllocationAmount() {
      const input = String(this.shareCalculatorCashInput || '').trim()
      const cash = this.getNumberValue(input || DEFAULT_SWING_AI_SUBSCRIPTION_ALLOCATION)
      if (cash === null || cash <= 0) return ''
      return cash.toFixed(2)
    },
    formatSubscriptionAllocationInput(value) {
      const cash = this.getNumberValue(value)
      return cash !== null && cash > 0 ? cash.toFixed(2) : ''
    },
    applySwingAiSubscriptionData(data) {
      this.subscriptionData = data && typeof data === 'object' ? data : null
      this.rememberSubscriptionAllocationAmounts(this.subscriptionData)
      this.syncShareCalculatorInputFromSubscription()
    },
    syncShareCalculatorInputFromSubscription() {
      if (!this.shareCalculatorVisible) return
      if (this.shareCalculatorHasResults) return
      if (this.shareCalculatorCashTouched && String(this.shareCalculatorCashInput || '').trim()) return

      this.shareCalculatorCashInput = this.getRememberedShareCalculatorAllocationAmount()
        || this.currentStrategySubscriptionAllocation
        || this.shareCalculatorCashInput
        || DEFAULT_SWING_AI_SUBSCRIPTION_ALLOCATION
    },
    rememberSubscriptionAllocationAmounts(subscription) {
      const strategies = subscription && Array.isArray(subscription.strategies) ? subscription.strategies : []
      strategies.forEach(strategy => {
        const strategyId = this.getSubscriptionStrategyId(strategy)
        const allocationAmount = this.getSubscriptionAllocationAmount(strategy, '')
        this.rememberShareCalculatorAllocationAmount(strategyId, allocationAmount)
      })
    },
    rememberShareCalculatorAllocationAmount(strategyId = this.getCurrentStrategySubscriptionId(), allocationAmount = this.getShareCalculatorAllocationAmount()) {
      if (!strategyId) return

      const formattedAmount = this.formatSubscriptionAllocationInput(allocationAmount)
      if (!formattedAmount) return

      const allocations = this.getShareCalculatorAllocationStorage()
      allocations[String(strategyId)] = formattedAmount
      this.setShareCalculatorAllocationStorage(allocations)
    },
    getRememberedShareCalculatorAllocationAmount(strategyId = this.getCurrentStrategySubscriptionId()) {
      if (!strategyId) return ''

      const allocations = this.getShareCalculatorAllocationStorage()
      return this.formatSubscriptionAllocationInput(allocations[String(strategyId)])
    },
    getShareCalculatorAllocationStorage() {
      if (typeof window === 'undefined' || !window.localStorage) return {}

      try {
        const rawValue = window.localStorage.getItem(this.getShareCalculatorAllocationStorageKey())
        const parsedValue = rawValue ? JSON.parse(rawValue) : {}
        return parsedValue && typeof parsedValue === 'object' && !Array.isArray(parsedValue) ? parsedValue : {}
      } catch (error) {
        return {}
      }
    },
    setShareCalculatorAllocationStorage(allocations) {
      if (typeof window === 'undefined' || !window.localStorage) return

      try {
        window.localStorage.setItem(this.getShareCalculatorAllocationStorageKey(), JSON.stringify(allocations || {}))
      } catch (error) {
        // Local storage is only a convenience for restoring the last entered amount.
      }
    },
    getShareCalculatorAllocationStorageKey() {
      const userKey = this.normalizeStorageKeyPart(
        this.getCookieUserEmail()
          || this.getStoreUserEmail()
          || this.getLocalStorageValue('backtest_user')
      )
      return userKey
        ? `${SWING_AI_SUBSCRIPTION_ALLOCATION_STORAGE_KEY}:${userKey}`
        : SWING_AI_SUBSCRIPTION_ALLOCATION_STORAGE_KEY
    },
    getLocalStorageValue(key) {
      if (typeof window === 'undefined' || !window.localStorage) return ''

      try {
        return window.localStorage.getItem(key) || ''
      } catch (error) {
        return ''
      }
    },
    normalizeStorageKeyPart(value) {
      return String(value || '').trim().toLowerCase().replace(/[^a-z0-9@._-]/g, '_')
    },
    getSubscriptionResponseBody(response) {
      return response && response.data !== undefined ? response.data : response || {}
    },
    getSubscriptionResponseData(response) {
      const body = this.getSubscriptionResponseBody(response)
      if (body && body.data !== undefined) return body.data
      if (
        body
        && typeof body === 'object'
        && (
          body.status
          || body.action
          || body.strategies
          || body.positions
          || body.config_hash
          || body.configHash
          || body.last_email
          || body.notification_email
          || body.notificationEmail
          || body.user_email
          || body.userEmail
        )
      ) return body
      return null
    },
    getSubscriptionResponseMessage(body, fallback) {
      const data = body && body.data && typeof body.data === 'object' ? body.data : null
      const lastEmail = data && data.last_email
      return (body && (body.msg || body.message || body.detail))
        || (lastEmail && lastEmail.error)
        || fallback
    },
    getSubscriptionErrorMessage(error, fallback) {
      const body = error && error.response ? this.getSubscriptionResponseBody(error.response) : null
      return body ? this.getSubscriptionResponseMessage(body, fallback) : fallback
    },
    showSubscriptionLoadPopup(message, options = {}) {
      if (!message || (!options.notify && !this.shareCalculatorVisible)) return
      this.showSubscriptionPopup('error', message)
    },
    showSubscriptionPopup(status, message) {
      if (!message || !this.$message) return

      this.$message({
        message,
        type: this.getSubscriptionPopupType(status),
        center: true,
        showClose: true,
        duration: status === 'error' ? 6000 : 3500,
      })
    },
    getSubscriptionPopupType(status) {
      if (status === 'success') return 'success'
      if (status === 'error') return 'error'
      if (status === 'pending' || status === 'info') return 'info'
      return 'warning'
    },
    setSubscriptionSaveState(status, message, options = {}) {
      this.subscriptionSaveStatus = status
      this.subscriptionEmailRetryAvailable = Boolean(options.canRetryEmail)
      if (status !== 'pending') this.clearSubscriptionRefreshTimer()
      if (options.notify !== false) this.showSubscriptionPopup(status, message)
    },
    updateSubscriptionPendingState() {
      const dataStatus = String((this.subscriptionData && this.subscriptionData.status) || '').trim().toLowerCase()
      const lastEmail = this.subscriptionData && this.subscriptionData.last_email
      const lastEmailStatus = String((lastEmail && lastEmail.status) || '').trim().toLowerCase()

      if (lastEmailStatus === 'pending') {
        this.setSubscriptionSaveState('pending', 'Email is still sending.', { notify: false })
        return
      }

      if (lastEmailStatus === 'failed') {
        this.setSubscriptionSaveState('error', 'Saved. Email failed.', { canRetryEmail: true })
        return
      }

      if (dataStatus === 'active' && lastEmailStatus === 'sent') {
        this.setSubscriptionSaveState('success', 'Email sent.')
        return
      }

      this.subscriptionSaveStatus = ''
      this.subscriptionEmailRetryAvailable = false
    },
    handleSubscriptionAuthRequired() {
      this.subscriptionLoadError = 'Sign in or upgrade to save.'
      this.showSubscriptionPopup('warning', this.subscriptionLoadError)
      if (this.$store) {
        this.$store.commit('states/setErrorMessage404', {
          status: 410,
          message: 'SwingAI Email Setup',
        })
      }
      if (this.$router) this.$router.push('/404')
    },
    scheduleSubscriptionRefresh() {
      this.clearSubscriptionRefreshTimer()
      this.subscriptionRefreshTimer = window.setTimeout(() => {
        this.fetchSwingAiSubscription({ silent: true })
      }, SWING_AI_SUBSCRIPTION_REFRESH_DELAY_MS)
    },
    clearSubscriptionRefreshTimer() {
      if (!this.subscriptionRefreshTimer) return
      window.clearTimeout(this.subscriptionRefreshTimer)
      this.subscriptionRefreshTimer = null
    },
    isSuccessHttpStatus(status) {
      return status >= 200 && status < 300
    },
    selectStrategy(strategyId) {
      this.currentStrategyId = strategyId
      this.scrollToStrategyOverview()
    },
    scrollToStrategyOverview() {
      this.$nextTick(() => {
        const heroPanel = this.$refs.heroPanel
        if (heroPanel && typeof window !== 'undefined') {
          const heroBottom = heroPanel.getBoundingClientRect().bottom + window.pageYOffset
          window.scrollTo({ top: Math.max(heroBottom, 0), behavior: 'smooth' })
          return
        }

        const target = this.$refs.strategyMetrics || this.$refs.activeStrategyBar
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      })
    },
    openPerformanceAnalysis() {
      this.activeTab = 'performance'
      this.$nextTick(() => {
        if (this.$refs.dataTabsPanel) {
          this.$refs.dataTabsPanel.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      })
    },
    scrollToTomorrowActions() {
      if (this.$refs.tomorrowAction) {
        this.$refs.tomorrowAction.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    },
    openStrategyTutorialVideo() {
      const url = 'https://youtu.be/6DW9P_gOaxk'
      if (url) {
        window.open(url, '_blank', 'noopener,noreferrer')
      }
    },
    handleKeydown(event) {
      if (event.key === 'Escape') {
        if (this.emailSetupConfirmVisible) {
          this.closeEmailSetupConfirm()
          return
        }
        this.guideVisible = false
        this.closeShareCalculator()
      }
    },
    openShareCalculator() {
      this.shareCalculatorVisible = true
      this.shareCalculatorCalculatedCash = null
      this.subscriptionSaveStatus = ''
      this.subscriptionEmailRetryAvailable = false
      this.subscriptionLoadError = ''
      this.$nextTick(() => {
        this.syncShareCalculatorInputFromSubscription()
      })
    },
    calculateShareAllocation() {
      if (!this.hasShareCalculatorCash) return
      this.rememberShareCalculatorAllocationAmount()
      this.shareCalculatorCalculatedCash = this.shareCalculatorCash
    },
    resetShareCalculatorResults() {
      this.shareCalculatorCashTouched = true
      this.rememberShareCalculatorAllocationAmount()
      this.shareCalculatorCalculatedCash = null
      this.subscriptionSaveStatus = ''
      this.subscriptionEmailRetryAvailable = false
      this.resetEmailSetupConfirmation()
    },
    closeShareCalculator() {
      this.resetEmailSetupConfirmation()
      this.shareCalculatorVisible = false
    },
    closeEmailSetupConfirm() {
      if (this.isSavingSubscription) return
      this.resetEmailSetupConfirmation()
    },
    resetEmailSetupConfirmation() {
      this.emailSetupConfirmVisible = false
      this.emailSetupConfirmChecked = false
      this.emailSetupConfirmStrategyId = ''
      this.emailSetupConfirmAllocationAmount = ''
      this.emailSetupConfirmEmailInput = ''
    },
    buildShareCalculatorRows(cash) {
      return [
        ...this.buildShareCalculatorHoldingRows(cash),
        ...this.buildShareCalculatorSignalRows(cash),
      ]
    },
    buildShareCalculatorHoldingRows(cash) {
      return this.holdingRows
        .filter(row => String(row && row.status ? row.status : '').trim().toLowerCase() === 'holding')
        .map((row, index) => {
          const allocationRate = this.getShareCalculatorRate(row.rawPositionPct !== undefined ? row.rawPositionPct : row.positionPct)
          const currentPriceNumber = this.getNumberValue(row.rawCurrentPrice !== undefined ? row.rawCurrentPrice : row.currentPrice)
          const shares = this.calculateWholeShares(cash, allocationRate, currentPriceNumber)
          const amountNumber = this.calculateShareCalculatorAmount(currentPriceNumber, shares)

          return {
            key: `share-calculator-holding-${row.symbol || '--'}-${index}`,
            ticker: row.symbol || '--',
            currentPrice: row.currentPrice || '--',
            positionPct: row.positionPct || '--',
            sharesNumber: shares,
            shares: shares.toLocaleString('en-US'),
            amountNumber,
            amount: this.formatMoneyValue(amountNumber, '$0'),
          }
        })
    },
    buildShareCalculatorSignalRows(cash) {
      const signals = Array.isArray(this.currentStrategy && this.currentStrategy.signals) ? this.currentStrategy.signals : []
      const cashRate = this.getShareCalculatorRate(
        this.currentStrategy && this.currentStrategy.rawCashPct !== undefined
          ? this.currentStrategy.rawCashPct
          : this.currentStrategy.cashPct
      )

      return signals.map((signal, index) => {
        const cashRatio = this.getShareCalculatorRate(signal.rawCashRatio !== undefined ? signal.rawCashRatio : signal.cashRatio)
        const allocationRate = cashRate !== null && cashRatio !== null ? cashRate * cashRatio : null
        const currentPriceNumber = this.getNumberValue(signal.rawPrice !== undefined ? signal.rawPrice : signal.price)
        const shares = this.calculateWholeShares(cash, allocationRate, currentPriceNumber)
        const amountNumber = this.calculateShareCalculatorAmount(currentPriceNumber, shares)

        return {
          key: `share-calculator-signal-${signal.symbol || '--'}-${index}`,
          ticker: signal.symbol || '--',
          currentPrice: signal.price || '--',
          positionPct: this.formatShareCalculatorRate(allocationRate),
          sharesNumber: shares,
          shares: shares.toLocaleString('en-US'),
          amountNumber,
          amount: this.formatMoneyValue(amountNumber, '$0'),
        }
      })
    },
    getShareCalculatorRate(value) {
      if (value === undefined || value === null || value === '' || value === '--') return null

      const numberValue = this.getNumberValue(value)
      if (numberValue === null) return null

      return String(value).indexOf('%') !== -1 || Math.abs(numberValue) > 1 ? numberValue / 100 : numberValue / 100
    },
    calculateWholeShares(cash, allocationRate, currentPrice) {
      if (allocationRate === null || !currentPrice || currentPrice <= 0) return 0

      const rawShares = cash * allocationRate / currentPrice
      return rawShares > 0 ? Math.floor(rawShares) : 0
    },
    calculateShareCalculatorAmount(currentPrice, shares) {
      const price = Number(currentPrice)
      const shareCount = Number(shares)
      if (!Number.isFinite(price) || !Number.isFinite(shareCount)) return 0
      return price * shareCount
    },
    formatShareCalculatorRate(rate) {
      if (rate === null || !Number.isFinite(rate)) return '--'
      return `${this.formatCompactNumber(rate * 100)}%`
    },
    buildEmptyDetail(strategy = {}) {
      return {
        actionDate: '',
        lastUpdated: '',
        backtestStart: '',
        signalListDescription: '',
        initialCapital: '',
        sortingMetric: '',
        profitTargetRange: '',
        stopLossRange: '',
        timeInMarketRange: '',
        topPicks: '',
        allocation: '',
        dailyTotalPosition: '',
        signalGeneration: '',
        execution: '',
        actions: {
          buy: Array.isArray(strategy.stocks) && strategy.stocks.length ? this.buildBuyActionsFromStrategy(strategy) : [],
          sell: [],
        },
        holdings: [],
        history: [],
        charts: this.buildEmptyCharts(),
        monthlyReturns: [],
        summaryStats: [],
        strategyMetrics: {},
      }
    },
    buildEmptyCharts() {
      return {
        cumulative: {
          imageUrl: '',
          min: 0,
          max: 0,
          ticks: [],
          dates: [],
          benchmark: [],
          strategy: [],
        },
        drawdown: {
          imageUrl: '',
          min: 0,
          max: 0,
          ticks: [],
          dates: [],
          benchmark: [],
          strategy: [],
        },
      }
    },
    buildBuyActionsFromStrategy(strategy) {
      const stocks = Array.isArray(strategy && strategy.stocks) ? strategy.stocks : []
      console.log('Building buy actions from strategy:', stocks)
      console.log('Current strategy cash:', this.currentStrategy.rowRemainCash)
      return stocks.map(stock => ({
        symbol: stock.symbol,
        cashRatio: stock.cashRatio || stock.positionPct || '0%',
        entryPrice: stock.price || stock.close || '--',
        profitTarget: this.formatTargetWithPercent(stock.profitTargetPrice || stock.pt, stock.profitTargetPct, 'up'),
        stopLoss: this.formatTargetWithPercent(stock.stopLossPrice || stock.sl, stock.stopLossPct, 'down'),
        timeInMarket: stock.timeInMarket ? `${stock.timeInMarket} trading days` : stock.tim ? `${stock.tim} trading days` : '--',
        shares: this.formatIntegerValue(Math.floor(this.currentStrategy.rowRemainCash * stock.rawCashRatio / 100 / stock.rawPrice), '--'),
        amount: stock.amount || '--',
      }))
    },
    buildSellActionsFromPositions(positions) {
      if (!Array.isArray(positions)) return []

      return positions
        .filter(position => this.isSellActionPosition(position))
        .map(position => ({
          symbol: this.getFirstDefined(position, ['symbol', 'ticker']) || '--',
          reason: this.getSellReason(position),
          entryPrice: this.formatMoneyValue(this.getFirstDefined(position, ['entry_price', 'entryPrice']), '--'),
          currentPrice: this.formatMoneyValue(this.getFirstDefined(position, ['current_price', 'currentPrice']), '--'),
          holdingPeriod: this.formatHoldingPeriod(this.getFirstDefined(position, ['stay_in_market', 'holding_period', 'holdingPeriod'])),
          profitPct: this.formatPercentValue(this.getFirstDefined(position, ['profit_pct', 'profitPct']), true, '--'),
        }))
    },
    normalizeDashboardResponse(response) {
      const data = this.unwrapResponse(response)
      const rawStrategies = this.extractDashboardStrategies(data)

      return {
        date: data && (data.date || data.trade_date || data.as_of),
        strategies: rawStrategies.map((strategy, index) => this.normalizeStrategy(strategy, index)),
      }
    },
    extractDashboardStrategies(source, depth = 0) {
      if (Array.isArray(source)) {
        return this.getDashboardStrategyRows(source)
      }
      if (!source || typeof source !== 'object' || depth > 3) return []

      const listKeys = [
        'strategies',
        'strategy_list',
        'strategyList',
        'strategy_summaries',
        'strategySummaries',
        'strategies_by_id',
        'strategiesById',
        'strategy_summaries_by_id',
        'strategySummariesById',
        'strategyMap',
        'summaries',
        'results',
        'items',
        'rows',
        'records',
        'list',
      ]

      for (const key of listKeys) {
        const value = source[key]
        if (Array.isArray(value)) {
          const strategyRows = this.getDashboardStrategyRows(value)
          if (strategyRows.length) return strategyRows
        }
        if (value && typeof value === 'object') {
          const nestedStrategies = this.extractDashboardStrategies(value, depth + 1)
          if (nestedStrategies.length) return nestedStrategies
        }
      }

      const envelopeKeys = ['data', 'payload', 'result', 'response']
      for (const key of envelopeKeys) {
        const nestedStrategies = this.extractDashboardStrategies(source[key], depth + 1)
        if (nestedStrategies.length) return nestedStrategies
      }

      if (this.isDashboardStrategyRecord(source)) return [source]
      const mappedStrategies = this.getDashboardStrategyMapValues(source)
      if (mappedStrategies.length) return mappedStrategies

      return []
    },
    getDashboardStrategyRows(rows) {
      return Array.isArray(rows) ? rows.filter(row => this.isDashboardStrategyRecord(row)) : []
    },
    getDashboardStrategyMapValues(source) {
      if (!source || typeof source !== 'object' || Array.isArray(source)) return []
      const values = Object.values(source)
      const objectValues = values.filter(value => value && typeof value === 'object' && !Array.isArray(value))
      const strategyValues = objectValues.filter(value => this.isDashboardStrategyRecord(value))
      return strategyValues.length > 0 && strategyValues.length === objectValues.length ? strategyValues : []
    },
    isDashboardStrategyRecord(record) {
      if (!record || typeof record !== 'object' || Array.isArray(record)) return false
      const summary = record.summary && typeof record.summary === 'object' ? record.summary : record
      return [
        'strategy_id',
        'id',
        'strategyId',
        'strategy_name_en',
        'strategy_name',
        'name',
        'model_name',
        'return_rate',
        'backtestReturnRate',
        'backtest_return_rate',
        'total_return',
        'totalReturn',
        'daily_return',
        'dailyReturn',
        'alpha',
        'win_rate',
        'winRate',
        'max_risk',
        'backtestMaxDrawdown',
        'backtest_max_drawdown',
        'max_drawdown',
        'maxDrawdown',
      ].some(key => summary[key] !== undefined && summary[key] !== null && summary[key] !== '')
    },
    normalizeStrategy(rawStrategy, index) {
      const summary = rawStrategy && rawStrategy.summary ? Object.assign({}, rawStrategy, rawStrategy.summary) : rawStrategy || {}
      const id = String(this.getFirstDefined(summary, ['strategy_id', 'id', 'strategyId']) || index + 1)
      const fullName = this.getFirstDefined(summary, ['strategy_name_en', 'strategy_name', 'name', 'model_name'])
      // const prefix = this.getFirstDefined(summary, ['prefix', 'type', 'risk_profile'])
      const rawCashPct = this.getFirstDefined(summary, ['cash_pct', 'cashPct'])
      const rawDashboardTimeInMarket = this.getFirstDefined(summary, ['time_in_market', 'timeInMarket'])
      const dashboardTimeInMarketPct = this.formatPercentValue(rawDashboardTimeInMarket, false, '')
      const stocks = this.extractStrategyStocks(rawStrategy || summary)
        .map(stock => this.normalizeStock(stock))
        .filter(stock => stock.symbol)
      const signals = this.extractDashboardSignals(rawStrategy || summary)
        .map(signal => this.normalizeStock(signal))
        .filter(signal => signal.symbol)
      const positions = this.getFirstNumber(summary, ['positions', 'position_count', 'holding_count'])
      const sellSignals = this.getFirstNumber(summary, ['sell_signals', 'sellSignals'])
      const trades = this.getFirstNumber(summary, ['total_trades', 'backtestTotalTrades', 'backtest_total_trades', 'trades', 'trade_count', 'tradeCount'])

      return {
        id,
        fullName,
        sourceId: this.getFirstDefined(summary, ['source_id', 'sourceId']),
        strategyNameCn: this.getFirstDefined(summary, ['strategy_name_cn', 'strategyNameCn']),
        // prefix,
        name: this.getDisplayStrategyName(fullName),
        description: this.getFirstDefined(summary, ['description', 'strategy_description', 'strategyDescription', 'desc']),
        sortBy: this.getFirstDefined(summary, ['sort_by', 'sortBy', 'sorting_metric', 'sortingMetric']),
        totalReturn: this.formatPercentValue(
          this.getFirstDefined(summary, ['return_rate', 'backtestReturnRate', 'backtest_return_rate', 'total_return', 'totalReturn']),
          true,
          ''
        ),
        dailyReturn: this.formatPercentValue(
          this.getFirstDefined(summary, ['daily_return', 'dailyReturn']),
          true,
          ''
        ),
        alpha: this.formatPercentValue(this.getFirstDefined(summary, ['alpha', 'backtestAlpha', 'backtest_alpha', 'excess_return']), true, ''),
        winRate: this.formatPercentValue(this.getFirstDefined(summary, ['win_rate', 'backtestWinRate', 'backtest_win_rate', 'winRate']), false, ''),
        maxDrawdown: this.formatRiskPercentValue(
          this.getFirstDefined(summary, ['max_risk', 'backtestMaxDrawdown', 'backtest_max_drawdown', 'max_drawdown', 'maxDrawdown']),
          ''
        ),
        sharpeRatio: this.formatDecimalValue(this.getFirstDefined(summary, ['sharpe_ratio', 'sharpeRatio', 'sharpe_type', 'sharpeType', 'sharpe_ratio_type', 'sharpeRatioType']), ''),
        profitFactor: this.formatDecimalValue(this.getFirstDefined(summary, ['profit_factor', 'backtestProfitFactor', 'backtest_profit_factor', 'profitFactor']), ''),
        assets: this.formatMoneyValue(this.getFirstDefined(summary, ['total_asset', 'assets', 'totalAssets']), ''),
        cash: this.formatMoneyValue(this.getFirstDefined(summary, ['remain_cash', 'cash', 'availableCash']), ''),
        cashPct: this.formatPercentValue(rawCashPct, false, ''),
        rawCashPct,
        positions: positions !== null ? positions : '',
        sellSignals: sellSignals !== null ? sellSignals : '',
        zScore: this.formatDecimalValue(this.getFirstDefined(summary, ['z_score', 'zScore']), ''),
        stdDev: this.formatDecimalValue(this.getFirstDefined(summary, ['std_dev', 'stdDev']), ''),
        medianReturn: this.formatPercentValue(this.getFirstDefined(summary, ['median_trade_return', 'medianTradeReturn', 'median_return', 'medianReturn']), false, ''),
        benchmarkReturn: this.formatPercentValue(this.getFirstDefined(summary, ['buy_and_hold', 'backtestBuyAndHold', 'backtest_buy_and_hold', 'buyAndHold', 'benchmark_return', 'benchmarkReturn']), false, ''),
        averageTradeWin: this.formatPercentValue(this.getFirstDefined(summary, ['avg_trade_win', 'avgTradeWin', 'average_trade_win', 'averageTradeWin', 'avg_win', 'avgWin', 'average_win', 'averageWin']), false, ''),
        averageTradeLoss: this.formatPercentValue(this.getFirstDefined(summary, ['avg_trade_loss', 'avgTradeLoss', 'average_trade_loss', 'averageTradeLoss', 'avg_loss', 'avgLoss', 'average_loss', 'averageLoss']), false, ''),
        totalPositive: this.formatIntegerValue(this.getFirstDefined(summary, ['total_positive', 'backtestTotalPositive', 'backtest_total_positive', 'totalPositive', 'positive_trades', 'positiveTrades', 'winning_trades', 'winningTrades', 'wins', 'win_count', 'winCount']), ''),
        totalNegative: this.formatIntegerValue(this.getFirstDefined(summary, ['total_negative', 'backtestTotalNegative', 'backtest_total_negative', 'totalNegative', 'negative_trades', 'negativeTrades', 'losing_trades', 'losingTrades', 'losses', 'loss_count', 'lossCount']), ''),
        dashboardTimeInMarketPct,
        timeInMarketPct: this.formatPercentValue(this.getFirstDefined(summary, ['time_in_market', 'timeInMarket', 'time_in_market_pct', 'timeInMarketPct', 'time_in_market_percent', 'timeInMarketPercent', 'market_exposure', 'marketExposure', 'exposure', 'exposure_pct', 'exposurePct']), false, ''),
        trades: trades !== null ? trades : '',
        // tone: this.getFirstDefined(summary, ['tone', 'theme']) || this.getStrategyTone(prefix, index),
        trend: [],
        stocks,
        signals,
      }
    },
    extractDashboardSignals(strategy) {
      if (Array.isArray(strategy && strategy.signals)) return strategy.signals
      return []
    },
    extractStrategyStocks(strategy) {
      if (Array.isArray(strategy && strategy.stocks)) return strategy.stocks
      if (Array.isArray(strategy && strategy.signals)) return strategy.signals
      if (Array.isArray(strategy && strategy.rows)) return strategy.rows
      return []
    },
    normalizeStock(stock) {
      const rawPrice = this.getFirstDefined(stock, ['price', 'close', 'daily_close'])
      const rawCashRatio = this.getFirstDefined(stock, ['cash_ratio', 'cashRatio', 'CashRatio'])
      return {
        symbol: this.getFirstDefined(stock, ['symbol', 'ticker', 'market_symbol']),
        signal: this.getFirstDefined(stock, ['signal', 'signal_name', 'model_signal']),
        signalDate: this.getFirstDefined(stock, ['signal_date', 'date', 'trade_date']),
        price: this.formatMoneyValue(rawPrice, ''),
        rawPrice,
        shares: this.formatIntegerValue(this.getFirstDefined(stock, ['shares', 'share_count']), ''),
        amount: this.formatMoneyValue(this.getFirstDefined(stock, ['amount', 'allocation', 'position_amount']), ''),
        profitTargetPrice: this.formatMoneyValue(
          this.getFirstDefined(stock, ['profit_target_price', 'profitTargetPrice', 'ProfitTargetPrice']),
          ''
        ),
        profitTargetPct: this.formatPercentValue(
          this.getFirstDefined(stock, ['profit_target_pct', 'profitTargetPct', 'ProfitTargetPct']),
          true,
          ''
        ),
        stopLossPrice: this.formatMoneyValue(
          this.getFirstDefined(stock, ['stop_loss_price', 'stopLossPrice', 'StopLossPrice']),
          ''
        ),
        stopLossPct: this.formatPercentValue(
          this.getFirstDefined(stock, ['stop_loss_pct', 'stopLossPct', 'StopLossPct']),
          false,
          ''
        ),
        cashRatio: this.formatPercentValue(rawCashRatio, false, ''),
        rawCashRatio,
        rowRemainCash: this.currentStrategy.rowRemainCash,
        positionPct: this.formatPercentValue(
          this.getFirstDefined(stock, ['position_pct', 'positionPct', 'PositionPct']),
          false,
          ''
        ),
        timeInMarket: this.getFirstDefined(stock, ['time_in_market', 'best_time_in_market']),
        tim: this.getFirstDefined(stock, ['tim', 'time_in_market', 'best_time_in_market']),
      }
    },
    normalizeDetailResponse(response, strategy) {
      const data = this.unwrapResponse(response)
      const summary = data && data.summary ? Object.assign({}, data, data.summary) : data || {}
      const detail = this.buildEmptyDetail(strategy)
      const positions = Array.isArray(data && data.positions) ? data.positions : []
      const trades = data && data.trades && Array.isArray(data.trades.items)
        ? data.trades.items
        : Array.isArray(data && data.trades)
          ? data.trades
          : []
      const buyActions = this.buildBuyActionsFromStrategy(strategy)
      const sellActions = this.buildSellActionsFromPositions(positions)
      console.log('sellActions:', sellActions)
      const parameterRanges = this.buildParameterRanges(positions, strategy)
      const apiParameters = this.normalizeStrategyParameters(data, summary)
      const strategyMetrics = this.buildStrategyMetrics(summary, strategy, positions, sellActions)

      return Object.assign({}, detail, {
        actionDate: this.getActionDate(data, summary, detail),
        lastUpdated: this.getLastUpdated(data, summary, detail),
        backtestStart: apiParameters.tradingStart
          || this.getFirstDefined(summary, ['start_date', 'backtest_start', 'backtestStart'])
          || detail.backtestStart,
        signalListDescription: apiParameters.signalListDescription
          || this.getFirstDefined(summary, ['signals'])
          || detail.signalListDescription,
        initialCapital: apiParameters.initialCapital
          || this.formatMoneyValue(this.getFirstDefined(summary, ['init_cash', 'initial_capital', 'initialCapital']), detail.initialCapital),
        sortingMetric: apiParameters.sortingMetric
          || this.getFirstDefined(summary, ['sort_by', 'sortBy', 'sorting_metric', 'sortingMetric'])
          || detail.sortingMetric,
        profitTargetRange: apiParameters.profitTargetRange || parameterRanges.profitTargetRange || detail.profitTargetRange,
        stopLossRange: apiParameters.stopLossRange || parameterRanges.stopLossRange || detail.stopLossRange,
        timeInMarketRange: apiParameters.timeInMarketRange || parameterRanges.timeInMarketRange || detail.timeInMarketRange,
        topPicks: apiParameters.topPicks || `${buyActions.length} Stocks`,
        allocation: apiParameters.allocation || detail.allocation,
        dailyTotalPosition: '66%',
        signalGeneration: apiParameters.signalGeneration || detail.signalGeneration,
        execution: apiParameters.execution || detail.execution,
        summaryStats: this.buildPerformanceStats(summary, strategy, trades),
        actions: {
          buy: buyActions,
          sell: sellActions,
        },
        holdings: this.normalizeHoldings(positions),
        history: this.normalizeHistory(trades),
        charts: this.normalizeCharts(summary, detail.charts),
        monthlyReturns: this.normalizeMonthlyReturns(summary),
        strategyMetrics,
      })
    },
    normalizeHoldings(positions) {
      return positions.map(position => {
        const remainingDays = this.getNumberValue(this.getFirstDefined(position, ['remaining_days', 'remainingDays']))
        const positionStatus = this.getPositionStatus(position)
        const rawCurrentPrice = this.getFirstDefined(position, ['current_price', 'currentPrice'])
        const rawPositionPct = this.getFirstDefined(position, ['position_pct', 'positionPct'])
        return {
          symbol: this.getFirstDefined(position, ['symbol', 'ticker']),
          entryDate: this.getFirstDefined(position, ['entry_date', 'entryDate']) || '--',
          entryPrice: this.formatMoneyValue(this.getFirstDefined(position, ['entry_price', 'entryPrice']), '--'),
          currentPrice: this.formatMoneyValue(rawCurrentPrice, '--'),
          profitTargetPrice: this.formatMoneyValue(
            this.getFirstDefined(position, ['profit_target_price', 'profitTargetPrice', 'ProfitTargetPrice']),
            '--'
          ),
          stopLossPrice: this.formatMoneyValue(
            this.getFirstDefined(position, ['stop_loss_price', 'stopLossPrice', 'StopLossPrice']),
            '--'
          ),
          rawCurrentPrice,
          profitPct: this.formatPercentValue(this.getFirstDefined(position, ['profit_pct', 'profitPct']), true, '--'),
          shares: this.formatIntegerValue(this.getFirstDefined(position, ['shares', 'share_count', 'shareCount', 'quantity', 'qty']), '--'),
          positionPct: this.formatPercentValue(rawPositionPct, false, '--'),
          rawPositionPct,
          signal: this.getFirstDefined(position, ['signal', 'signal_name']) || '--',
          status: positionStatus || (this.shouldSellPosition(position) ? 'Sell Tomorrow' : 'Holding'),
          remainingDays,
          optix: this.formatDecimalValue(this.getFirstDefined(position, ['optix', 'Optix']), '--'),
          hv20: this.formatDecimalValue(this.getFirstDefined(position, ['hv20', 'HV20']), '--'),
          hv60: this.formatDecimalValue(this.getFirstDefined(position, ['hv60', 'HV60']), '--'),
          trendScore: this.formatDecimalValue(this.getFirstDefined(position, ['trend_score', 'trendScore', 'TrendScore']), '--'),
          relativeTrendScore: this.formatDecimalValue(
            this.getFirstDefined(position, ['rel_trend_score', 'relative_trend_score', 'relTrendScore', 'relativeTrendScore', 'RelTrendScore']),
            '--'
          ),
        }
      })
    },
    normalizeHistory(trades) {
      return trades
        .slice()
        .sort((left, right) => this.getDateValue(right.entry_date || right.exit_date) - this.getDateValue(left.entry_date || left.exit_date))
        .map((trade, index) => {
          const profitPct = this.getFirstDefined(trade, ['profit_pct', 'profitPct'])

          return {
            index: index + 1,
            symbol: this.getFirstDefined(trade, ['symbol', 'ticker']),
            entryDate: this.getFirstDefined(trade, ['entry_date', 'entryDate']) || '--',
            entryPrice: this.formatMoneyValue(this.getFirstDefined(trade, ['entry_price', 'entryPrice']), '--'),
            exitDate: this.getFirstDefined(trade, ['exit_date', 'exitDate']) || '--',
            exitPrice: this.formatMoneyValue(this.getFirstDefined(trade, ['exit_price', 'exitPrice']), '--'),
            shares: this.formatIntegerValue(this.getFirstDefined(trade, ['shares', 'share_count', 'shareCount', 'quantity', 'qty']), '--'),
            returnPct: this.formatPercentValue(profitPct, true, '--'),
            realizedPnl: this.formatMoneyValue(this.getFirstDefined(trade, ['float_profit', 'floatProfit']), '--'),
            exitReason: this.mapExitReason(this.getFirstDefined(trade, ['exit_reason', 'exitReason'])),
          }
        })
    },
    normalizeCharts(summary, fallbackCharts) {
      const charts = clone(fallbackCharts)
      const chartData = this.getFirstDefined(summary, ['chart_data', 'chartData'])

      charts.cumulative.imageUrl = ''
      this.applyCumulativeChartData(charts.cumulative, chartData)
      charts.drawdown.imageUrl = ''
      this.applyDrawdownChartData(charts.drawdown, chartData)
      return charts
    },
    applyCumulativeChartData(chart, chartData) {
      if (!chart || !chartData) return

      const cumulativeReturns = this.getFirstDefined(chartData, ['cumulative_returns', 'cumulativeReturns'])
      const dates = this.getFirstDefined(chartData, ['dates'])
      const benchmark = cumulativeReturns && this.normalizeNumberSeries(
        this.getFirstDefined(cumulativeReturns, ['benchmark', 'Benchmark'])
      )
      const strategy = cumulativeReturns && this.normalizeNumberSeries(
        this.getFirstDefined(cumulativeReturns, ['strategy', 'Strategy'])
      )
      const commonLength = Math.min(
        Array.isArray(dates) ? dates.length : 0,
        Array.isArray(benchmark) ? benchmark.length : 0,
        Array.isArray(strategy) ? strategy.length : 0
      )

      if (!commonLength) return

      const trimmedBenchmark = benchmark.slice(0, commonLength)
      const trimmedStrategy = strategy.slice(0, commonLength)
      const range = this.getChartSeriesRange([trimmedBenchmark, trimmedStrategy])

      chart.dates = dates.slice(0, commonLength)
      chart.benchmark = trimmedBenchmark
      chart.strategy = trimmedStrategy
      chart.min = range.min
      chart.max = range.max
      chart.ticks = range.ticks
    },
    applyDrawdownChartData(chart, chartData) {
      if (!chart || !chartData) return

      const drawdowns = this.getFirstDefined(chartData, ['drawdowns', 'drawdown'])
      const dates = this.getFirstDefined(chartData, ['dates'])
      const benchmark = drawdowns && this.normalizeNumberSeries(
        this.getFirstDefined(drawdowns, ['benchmark', 'Benchmark'])
      )
      const strategy = drawdowns && this.normalizeNumberSeries(
        this.getFirstDefined(drawdowns, ['strategy', 'Strategy'])
      )
      const commonLength = Math.min(
        Array.isArray(dates) ? dates.length : 0,
        Array.isArray(benchmark) ? benchmark.length : 0,
        Array.isArray(strategy) ? strategy.length : 0
      )

      if (!commonLength) return

      const trimmedBenchmark = benchmark.slice(0, commonLength)
      const trimmedStrategy = strategy.slice(0, commonLength)
      const range = this.getDrawdownChartRange([trimmedBenchmark, trimmedStrategy])

      chart.dates = dates.slice(0, commonLength)
      chart.benchmark = trimmedBenchmark
      chart.strategy = trimmedStrategy
      chart.min = range.min
      chart.max = range.max
      chart.ticks = range.ticks
    },
    normalizeMonthlyReturns(summary = {}) {
      const chartData = this.getFirstDefined(summary, ['chart_data', 'chartData'])
      const monthlyReturns = chartData
        ? this.getFirstDefined(chartData, ['monthly_return', 'monthlyReturn', 'monthly_returns', 'monthlyReturns'])
        : ''
      const directMonthlyReturns = monthlyReturns || this.getFirstDefined(summary, ['monthly_return', 'monthlyReturn', 'monthly_returns', 'monthlyReturns'])
      return this.buildMonthlyReturnRows(directMonthlyReturns)
    },
    buildMonthlyReturnRows(rawMonthlyReturns) {
      if (!rawMonthlyReturns) return []

      if (Array.isArray(rawMonthlyReturns)) {
        if (!rawMonthlyReturns.length) return []
        if (rawMonthlyReturns.every(row => row && typeof row === 'object' && !Array.isArray(row))) {
          return this.buildMonthlyReturnRowsFromObjects(rawMonthlyReturns)
        }
        if (rawMonthlyReturns.every(Array.isArray)) {
          return this.buildMonthlyReturnRowsFromArrays(rawMonthlyReturns)
        }
        return []
      }

      if (typeof rawMonthlyReturns !== 'object') return []

      const nestedRows = this.getFirstDefined(rawMonthlyReturns, ['records', 'items', 'rows'])
      if (Array.isArray(nestedRows)) return this.buildMonthlyReturnRows(nestedRows)

      if (Array.isArray(rawMonthlyReturns.columns) && Array.isArray(rawMonthlyReturns.data)) {
        return this.buildMonthlyReturnRowsFromSplitData(rawMonthlyReturns)
      }
      if (Array.isArray(rawMonthlyReturns.data)) return this.buildMonthlyReturnRows(rawMonthlyReturns.data)

      const columnarYears = this.getFirstDefined(rawMonthlyReturns, ['Year', 'year', 'years'])
      if (Array.isArray(columnarYears)) {
        return this.buildMonthlyReturnRowsFromColumnarData(rawMonthlyReturns, columnarYears)
      }

      return Object.keys(rawMonthlyReturns)
        .map(year => this.buildMonthlyReturnRow(year, rawMonthlyReturns[year]))
        .filter(Boolean)
        .sort((left, right) => Number(left.year) - Number(right.year))
    },
    buildMonthlyReturnRowsFromObjects(rows) {
      if (rows.every(row => this.isMonthlyReturnRecord(row))) {
        return this.buildMonthlyReturnRowsFromRecords(rows)
      }

      return rows
        .map(row => this.buildMonthlyReturnRow(this.getMonthlyReturnYear(row), row))
        .filter(Boolean)
        .sort((left, right) => Number(left.year) - Number(right.year))
    },
    buildMonthlyReturnRowsFromRecords(records) {
      const grouped = records.reduce((yearMap, record) => {
        const year = this.getMonthlyReturnYear(record)
        const monthKey = this.getMonthlyReturnMonthKey(record)
        const value = this.getMonthlyReturnRecordValue(record)
        const benchmarkValue = this.getMonthlyReturnRecordBenchmarkValue(record)

        if (!year || !monthKey) return yearMap
        if (!yearMap[year]) yearMap[year] = {}
        yearMap[year][monthKey] = value
        if (benchmarkValue !== '') {
          if (!yearMap[year].benchmarkMonthlyReturns) yearMap[year].benchmarkMonthlyReturns = {}
          yearMap[year].benchmarkMonthlyReturns[monthKey] = benchmarkValue
        }

        const ytdValue = this.getFirstDefined(record, ['YTD', 'ytd', 'strategy_ytd', 'strategyYtd'])
        const benchmarkYtdValue = this.getFirstDefined(record, ['BM_YTD', 'bm_ytd', 'benchmark_ytd', 'benchmarkYtd'])
        if (ytdValue !== '') yearMap[year].YTD = ytdValue
        if (benchmarkYtdValue !== '') {
          yearMap[year].BM_YTD = benchmarkYtdValue
          if (!yearMap[year].benchmarkMonthlyReturns) yearMap[year].benchmarkMonthlyReturns = {}
          yearMap[year].benchmarkMonthlyReturns.YTD = benchmarkYtdValue
        }

        return yearMap
      }, {})

      return Object.keys(grouped)
        .map(year => this.buildMonthlyReturnRow(year, grouped[year]))
        .filter(Boolean)
        .sort((left, right) => Number(left.year) - Number(right.year))
    },
    buildMonthlyReturnRowsFromArrays(rows) {
      const hasHeader = rows[0].some(value => {
        const text = String(value).toLowerCase()
        return text === 'year' || text === 'ytd' || text === 'bm_ytd'
      })
      const headers = hasHeader
        ? rows[0].map(value => String(value))
        : ['Year'].concat(monthlyReturnColumns.map(column => column.key))
      const dataRows = hasHeader ? rows.slice(1) : rows

      return dataRows
        .map(values => {
          const row = headers.reduce((rowData, header, index) => {
            rowData[header] = values[index]
            return rowData
          }, {})
          return this.buildMonthlyReturnRow(this.getMonthlyReturnYear(row), row)
        })
        .filter(Boolean)
        .sort((left, right) => Number(left.year) - Number(right.year))
    },
    buildMonthlyReturnRowsFromSplitData(splitData) {
      const columns = splitData.columns.map(column => String(column))
      return splitData.data
        .map((values, rowIndex) => {
          const row = columns.reduce((rowData, column, columnIndex) => {
            rowData[column] = values[columnIndex]
            return rowData
          }, {})
          const year = Array.isArray(splitData.index) ? splitData.index[rowIndex] : this.getMonthlyReturnYear(row)
          return this.buildMonthlyReturnRow(year, row)
        })
        .filter(Boolean)
        .sort((left, right) => Number(left.year) - Number(right.year))
    },
    buildMonthlyReturnRowsFromColumnarData(columnarData, years) {
      return years
        .map((year, rowIndex) => {
          const row = Object.keys(columnarData).reduce((rowData, key) => {
            const values = columnarData[key]
            if (Array.isArray(values)) rowData[key] = values[rowIndex]
            return rowData
          }, {})
          return this.buildMonthlyReturnRow(year, row)
        })
        .filter(Boolean)
        .sort((left, right) => Number(left.year) - Number(right.year))
    },
    buildMonthlyReturnRow(year, source) {
      const normalizedYear = this.getMonthlyReturnYear({ year }) || year
      if (normalizedYear === undefined || normalizedYear === null || normalizedYear === '') return null

      const rowSource = this.getMonthlyReturnRowSource(source)
      const benchmarkSource = this.getMonthlyReturnBenchmarkSource(source)

      return {
        year: String(normalizedYear),
        cells: monthlyReturnColumns.map(column => {
          const value = this.getMonthlyReturnColumnValue(rowSource, column.key)
          const benchmarkValue = this.getMonthlyReturnBenchmarkColumnValue(source, benchmarkSource, column.key)
          const numericValue = this.getNumberValue(value)
          const numericBenchmarkValue = this.getNumberValue(benchmarkValue)
          const hasBenchmarkValue = benchmarkValue !== ''
          const strategyDisplay = numericValue === null ? '--' : this.formatMonthlyReturnValue(numericValue)
          const benchmarkDisplay = numericBenchmarkValue === null ? '--' : this.formatMonthlyReturnValue(numericBenchmarkValue)
          return {
            key: column.key,
            label: column.label,
            value: numericValue,
            benchmarkValue: numericBenchmarkValue,
            hasBenchmarkValue,
            strategyDisplay,
            benchmarkDisplay,
            display: hasBenchmarkValue ? `${strategyDisplay} | ${benchmarkDisplay}` : strategyDisplay,
          }
        }),
      }
    },
    getMonthlyReturnRowSource(source) {
      if (!source || typeof source !== 'object') return {}
      if (Array.isArray(source)) return this.arrayToMonthlyReturnSource(source)

      const values = this.getFirstDefined(source, ['values', 'Values', 'strategy_values', 'strategyValues'])
      if (Array.isArray(values)) {
        return Object.assign({}, source, this.arrayToMonthlyReturnSource(values))
      }

      return source
    },
    getMonthlyReturnBenchmarkSource(source) {
      if (!source || typeof source !== 'object' || Array.isArray(source)) return {}

      const benchmarkValues = this.getFirstDefined(source, ['benchmark_values', 'benchmarkValues'])
      if (Array.isArray(benchmarkValues)) {
        return this.arrayToMonthlyReturnSource(benchmarkValues)
      }

      const benchmarkSource = this.getFirstDefined(source, [
        'benchmark_monthly_returns',
        'benchmarkMonthlyReturns',
        'benchmark_returns',
        'benchmarkReturns',
        'benchmark',
      ])
      if (Array.isArray(benchmarkSource)) return this.arrayToMonthlyReturnSource(benchmarkSource)
      if (benchmarkSource && typeof benchmarkSource === 'object') return benchmarkSource

      return {}
    },
    arrayToMonthlyReturnSource(values) {
      return monthlyReturnColumns.reduce((source, column, index) => {
        if (this.hasMonthlyReturnValue(values[index])) source[column.key] = values[index]
        return source
      }, {})
    },
    hasMonthlyReturnValue(value) {
      return value !== undefined && value !== null && value !== ''
    },
    isMonthlyReturnRecord(record) {
      return this.getMonthlyReturnYear(record) !== ''
        && this.getMonthlyReturnMonthKey(record) !== ''
        && this.getMonthlyReturnRecordValue(record) !== ''
    },
    getMonthlyReturnYear(source) {
      const year = this.getFirstDefined(source, ['Year', 'year'])
      if (year !== '') return year
      const date = this.getFirstDefined(source, ['date', 'Date', 'month_date', 'monthDate'])
      const match = String(date || '').match(/^(\d{4})/)
      return match ? match[1] : ''
    },
    getMonthlyReturnMonthKey(source) {
      const month = this.getFirstDefined(source, ['Month', 'month'])
      if (month !== '') return this.getMonthNumberFromLabel(month)
      const date = this.getFirstDefined(source, ['date', 'Date', 'month_date', 'monthDate'])
      const match = String(date || '').match(/^\d{4}-(\d{1,2})/)
      return match ? String(Number(match[1])) : ''
    },
    getMonthlyReturnRecordValue(source) {
      return this.getFirstDefined(source, [
        'return',
        'Return',
        'return_pct',
        'returnPct',
        'monthly_return',
        'monthlyReturn',
        'strategy_return',
        'strategyReturn',
        'value',
        'Value',
        'profit_pct',
        'profitPct',
              ])
    },
    getMonthlyReturnRecordBenchmarkValue(source) {
      return this.getFirstDefined(source, [
        'benchmark_return',
        'benchmarkReturn',
        'benchmark_return_pct',
        'benchmarkReturnPct',
        'benchmark_value',
        'benchmarkValue',
        'benchmark',
        'Benchmark',
        'bm_return',
        'bmReturn',
        'bm_value',
        'bmValue',
      ])
    },
    getMonthlyReturnColumnValue(source, key) {
      const sources = [
        source,
        source && source.months,
        source && source.monthly_return,
        source && source.monthly_returns,
        source && source.monthlyReturns,
      ].filter(Boolean)
      const aliases = this.getMonthlyReturnColumnAliases(key)

      for (let index = 0; index < sources.length; index += 1) {
        const value = this.getFirstDefined(sources[index], aliases)
        if (value !== '') return value
      }

      return ''
    },
    getMonthlyReturnBenchmarkColumnValue(source, benchmarkSource, key) {
      const benchmarkValue = this.getMonthlyReturnColumnValue(benchmarkSource, key)
      if (benchmarkValue !== '') return benchmarkValue

      const ytdBenchmarkValue = key === 'YTD'
        ? this.getFirstDefined(source, ['BM_YTD', 'bm_ytd', 'benchmark_ytd', 'benchmarkYtd', 'Benchmark_YTD', 'BM YTD'])
        : ''
      if (ytdBenchmarkValue !== '') return ytdBenchmarkValue

      return this.getFirstDefined(source, this.getMonthlyReturnBenchmarkColumnAliases(key))
    },
    getMonthlyReturnBenchmarkColumnAliases(key) {
      if (key === 'YTD' || key === 'BM_YTD') return []

      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      const monthIndex = Number(key)
      const monthName = monthNames[monthIndex - 1]
      return [
        `benchmark_${key}`,
        `benchmark${key}`,
        `Benchmark_${key}`,
        `Benchmark${key}`,
        `bm_${key}`,
        `bm${key}`,
        monthName && `benchmark_${monthName}`,
        monthName && `benchmark${monthName}`,
        monthName && `benchmark_${monthName.toLowerCase()}`,
        monthName && `benchmark${monthName.toLowerCase()}`,
      ].filter(Boolean)
    },
    getMonthlyReturnColumnAliases(key) {
      if (key === 'YTD') return ['YTD', 'ytd', 'strategy_ytd', 'strategyYtd', 'Strategy_YTD']
      if (key === 'BM_YTD') return ['BM_YTD', 'bm_ytd', 'benchmark_ytd', 'benchmarkYtd', 'Benchmark_YTD', 'BM YTD']

      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      const monthIndex = Number(key)
      const monthName = monthNames[monthIndex - 1]
      return [
        key,
        Number(key),
        monthName,
        monthName && monthName.toLowerCase(),
        `M${key}`,
        `m${key}`,
        `month_${key}`,
        `month${key}`,
      ].filter(Boolean)
    },
    getMonthNumberFromLabel(value) {
      const text = String(value || '').trim()
      if (!text) return ''
      const numberValue = Number(text)
      if (Number.isFinite(numberValue) && numberValue >= 1 && numberValue <= 12) return String(numberValue)

      const monthIndex = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
        .indexOf(text.slice(0, 3).toLowerCase())
      return monthIndex >= 0 ? String(monthIndex + 1) : ''
    },
    formatMonthlyReturnValue(value) {
      const numberValue = Number(value)
      if (!Number.isFinite(numberValue)) return '--'
      return this.formatTrimmedNumber(numberValue)
    },
    formatMonthlyReturnCellDisplay(value, benchmarkValue, hasBenchmarkValue) {
      const strategyDisplay = value === null ? '--' : this.formatMonthlyReturnValue(value)
      if (!hasBenchmarkValue) return strategyDisplay

      const benchmarkDisplay = benchmarkValue === null ? '--' : this.formatMonthlyReturnValue(benchmarkValue)
      return `${strategyDisplay} | ${benchmarkDisplay}`
    },
    normalizeNumberSeries(values) {
      if (!Array.isArray(values)) return []
      return values.map(value => this.getNumberValue(value)).filter(value => value !== null)
    },
    getChartSeriesRange(seriesList) {
      const values = seriesList.reduce((allValues, series) => allValues.concat(series), [])
      if (!values.length) return { min: 0, max: 100, ticks: [100, 75, 50, 25, 0] }

      const rawMin = Math.min(0, Math.min.apply(null, values))
      const rawMax = Math.max(0, Math.max.apply(null, values))
      const rawRange = Math.max(rawMax - rawMin, 1)
      const min = Math.floor((rawMin - rawRange * 0.06) / 10) * 10
      const max = Math.ceil((rawMax + rawRange * 0.06) / 10) * 10
      const step = (max - min) / 4
      const ticks = Array.from({ length: 5 }, (_, index) => this.roundChartTick(max - step * index))

      return { min, max, ticks }
    },
    getDrawdownChartRange(seriesList) {
      const values = seriesList.reduce((allValues, series) => allValues.concat(series), [])
      if (!values.length) return { min: -20, max: 0, ticks: [0, -5, -10, -15, -20] }

      const rawMin = Math.min(0, Math.min.apply(null, values))
      const rawMax = Math.max(0, Math.max.apply(null, values))
      const range = Math.max(rawMax - rawMin, 1)
      let step = 10

      if (range <= 5) {
        step = 1
      } else if (range <= 10) {
        step = 2
      } else if (range <= 20) {
        step = 2.5
      } else if (range <= 40) {
        step = 5
      }

      const max = Math.max(0, Math.ceil(rawMax / step) * step)
      const min = Math.floor(rawMin / step) * step
      const tickCount = Math.round((max - min) / step) + 1
      const ticks = Array.from({ length: tickCount }, (_, index) => {
        return this.roundChartTick(max - step * index)
      })

      return { min, max, ticks }
    },
    roundChartTick(value) {
      const rounded = Math.round(value * 10) / 10
      return Object.is(rounded, -0) ? 0 : rounded
    },
    applyStrategyMetrics(metrics, strategyId = this.currentStrategyId) {
      if (!metrics || typeof metrics !== 'object') return
      const strategyIndex = this.strategies.findIndex(strategy => strategy.id === strategyId)
      if (strategyIndex < 0) return

      this.strategies[strategyIndex] = Object.assign({}, this.strategies[strategyIndex], metrics)
    },
    buildStrategyMetrics(summary = {}, strategy = {}, positions = [], sellActions = []) {
      const initCash = this.getFirstDefined(summary, ['init_cash', 'initial_capital', 'initialCapital'])
      const totalAsset = this.getFirstDefined(summary, ['total_asset', 'assets', 'totalAssets'])
      const remainCash = this.getFirstDefined(summary, ['remain_cash', 'cash', 'availableCash'])
      const returnRate = this.getFirstDefined(summary, ['return_rate', 'backtestReturnRate', 'total_return', 'totalReturn'])
      const benchmarkReturn = this.getFirstDefined(summary, ['buy_and_hold', 'backtestBuyAndHold', 'backtest_buy_and_hold', 'benchmark_return', 'benchmarkReturn'])
      const maxRisk = this.getFirstDefined(summary, ['max_risk', 'backtestMaxDrawdown', 'max_drawdown', 'maxDrawdown'])
      const currentPositions = this.getFirstNumber(summary, ['current_positions', 'positions', 'position_count', 'holding_count'])
      const totalTrades = this.getFirstNumber(summary, ['total_trades', 'backtestTotalTrades', 'backtest_total_trades', 'trades', 'trade_count'])
      const rawCashPct = this.getFirstDefined(summary, ['cash_pct', 'cashPct'])
      const cashPct = rawCashPct !== ''
        ? rawCashPct
        : this.calculatePercentRatio(remainCash, totalAsset)
      const trend = this.getDrawdownTrend(summary)

      return {
        fullName: this.getFirstDefined(summary, ['strategy_name_en', 'strategy_name', 'name', 'model_name']) || strategy.fullName,
        strategyNameCn: this.getFirstDefined(summary, ['strategy_name_cn', 'strategyNameCn']) || strategy.strategyNameCn,
        description: this.getFirstDefined(summary, ['description', 'strategy_description', 'strategyDescription', 'desc']) || strategy.description,
        // prefix: this.getFirstDefined(summary, ['prefix', 'type', 'risk_profile']) || strategy.prefix,
        sourceId: this.getFirstDefined(summary, ['source_id', 'sourceId']) || strategy.sourceId,
        sortBy: this.getFirstDefined(summary, ['sort_by', 'sortBy', 'sorting_metric', 'sortingMetric']) || strategy.sortBy,
        totalReturn: this.formatPercentValue(returnRate, true, strategy.totalReturn),
        dailyReturn: this.formatPercentValue(this.getFirstDefined(summary, ['daily_return', 'dailyReturn']), true, strategy.dailyReturn),
        alpha: this.formatAlphaValue(
          this.getFirstDefined(summary, ['alpha', 'backtestAlpha', 'backtest_alpha', 'excess_return']),
          returnRate,
          benchmarkReturn,
          strategy.alpha
        ),
        winRate: this.formatPercentValue(this.getFirstDefined(summary, ['win_rate', 'backtestWinRate', 'backtest_win_rate', 'winRate']), false, strategy.winRate),
        maxDrawdown: this.formatRiskPercentValue(maxRisk, strategy.maxDrawdown),
        sharpeRatio:  this.formatDecimalValue(this.getFirstDefined(summary, [ 'sharpe_ratio', 'sharpeRatio', 'sharpe_type', 'sharpeType', 'sharpe_ratio_type', 'sharpeRatioType']) || strategy.sharpeRatio, ''),
        profitFactor: this.formatDecimalValue(this.getFirstDefined(summary, ['profit_factor', 'backtestProfitFactor', 'backtest_profit_factor', 'profitFactor']), strategy.profitFactor),
        assets: this.formatMoneyValue(totalAsset, strategy.assets),
        change: this.formatAssetChange(totalAsset, initCash, returnRate, strategy.change),
        cash: this.formatMoneyValue(remainCash, strategy.cash),
        rowRemainCash: remainCash,
        cashPct: this.formatPercentValue(cashPct, false, strategy.cashPct),
        positions: currentPositions !== null ? currentPositions : positions.length || strategy.positions,
        sellSignals: sellActions.length,
        zScore: this.formatDecimalValue(this.getFirstDefined(summary, ['z_score', 'zScore']), strategy.zScore),
        stdDev: this.formatDecimalValue(this.getFirstDefined(summary, ['std_dev', 'stdDev']), strategy.stdDev),
        medianReturn: this.formatPercentValue(this.getFirstDefined(summary, ['median_trade_return', 'medianReturn']), true, strategy.medianReturn),
        benchmarkReturn: this.formatPercentValue(benchmarkReturn, true, strategy.benchmarkReturn),
        averageTradeWin: this.formatPercentValue(this.getFirstDefined(summary, ['avg_trade_win', 'avgTradeWin', 'average_trade_win', 'averageTradeWin', 'avg_win', 'avgWin', 'average_win', 'averageWin']), false, strategy.averageTradeWin),
        averageTradeLoss: this.formatPercentValue(this.getFirstDefined(summary, ['avg_trade_loss', 'avgTradeLoss', 'average_trade_loss', 'averageTradeLoss', 'avg_loss', 'avgLoss', 'average_loss', 'averageLoss']), false, strategy.averageTradeLoss),
        totalPositive: this.formatIntegerValue(this.getFirstDefined(summary, ['total_positive', 'backtestTotalPositive', 'backtest_total_positive', 'totalPositive', 'positive_trades', 'positiveTrades', 'winning_trades', 'winningTrades', 'wins', 'win_count', 'winCount']), strategy.totalPositive),
        totalNegative: this.formatIntegerValue(this.getFirstDefined(summary, ['total_negative', 'backtestTotalNegative', 'backtest_total_negative', 'totalNegative', 'negative_trades', 'negativeTrades', 'losing_trades', 'losingTrades', 'losses', 'loss_count', 'lossCount']), strategy.totalNegative),
        dashboardTimeInMarketPct: strategy.dashboardTimeInMarketPct,
        timeInMarketPct: this.formatPercentValue(this.getFirstDefined(summary, ['time_in_market', 'timeInMarket', 'time_in_market_pct', 'timeInMarketPct', 'time_in_market_percent', 'timeInMarketPercent', 'market_exposure', 'marketExposure', 'exposure', 'exposure_pct', 'exposurePct']), false, strategy.timeInMarketPct),
        trades: totalTrades !== null ? totalTrades : strategy.trades,
        trend: trend.length ? trend : strategy.trend,
      }
    },
    buildPerformanceStats(summary = {}, strategy = {}, trades = []) {
      const tradeReturns = this.getTradeReturnValues(trades)
      const totalTradesSource = this.getFirstDefined(summary, ['total_trades', 'backtestTotalTrades', 'backtest_total_trades', 'totalTrades', 'trades', 'trade_count', 'tradeCount'])
      const winRateSource = this.getFirstDefined(summary, ['win_rate', 'backtestWinRate', 'backtest_win_rate', 'winRate'])
      const totalTradesNumber = this.getNumberValue(totalTradesSource !== '' ? totalTradesSource : strategy.trades)
      const winRateNumber = this.getPercentNumber(winRateSource !== '' ? winRateSource : strategy.winRate)
      const derivedPositiveTrades = tradeReturns.length
        ? tradeReturns.filter(value => value > 0).length
        : totalTradesNumber !== null && winRateNumber !== null
          ? Math.round(totalTradesNumber * (winRateNumber / 100))
          : ''
      const derivedNegativeTrades = tradeReturns.length
        ? tradeReturns.filter(value => value < 0).length
        : totalTradesNumber !== null && derivedPositiveTrades !== ''
          ? totalTradesNumber - derivedPositiveTrades
          : ''
      const derivedAverageWin = this.getAverageTradeReturn(tradeReturns, value => value > 0)
      const derivedAverageLoss = this.getAverageTradeReturn(tradeReturns, value => value < 0)
      const dashboardTimeInMarket = strategy.dashboardTimeInMarketPct || strategy.timeInMarketPct

      return [
        { label: 'Total Return %', value: this.formatPercentStatValue(this.getFirstDefined(summary, ['return_rate', 'backtestReturnRate', 'backtest_return_rate', 'total_return', 'totalReturn']), strategy.totalReturn || '--') },
        { label: 'Daily Return %', value: this.formatPercentStatValue(this.getFirstDefined(summary, ['daily_return', 'dailyReturn']), strategy.dailyReturn || '--') },
        { label: 'Median Trade Return %', value: this.formatPercentStatValue(this.getFirstDefined(summary, ['median_trade_return', 'medianTradeReturn', 'median_return', 'medianReturn']), strategy.medianReturn || '--') },
        { label: 'Z-Score', value: this.formatFixedDecimalValue(this.getFirstDefined(summary, ['z_score', 'zScore', 'backtest_z_score', 'backtestZScore']), strategy.zScore || '--', 2) },
        { label: 'Std. Dev', value: this.formatFixedDecimalValue(this.getFirstDefined(summary, ['std_dev', 'stdDev', 'backtest_std_dev', 'backtestStdDev', 'standard_deviation', 'standardDeviation']), strategy.stdDev || '--', 2) },
        { label: 'Buy & Hold %(SPY)', value: this.formatPercentStatValue(this.getFirstDefined(summary, ['buy_and_hold', 'backtestBuyAndHold', 'backtest_buy_and_hold', 'buyAndHold', 'benchmark_return', 'benchmarkReturn']), strategy.benchmarkReturn || '--') },
        { label: 'Win Rate %', value: this.formatPercentStatValue(winRateSource, strategy.winRate || '--') },
        { label: 'Average Trade Win %', value: this.formatPercentStatValue(this.getFirstDefined(summary, ['avg_trade_win', 'avgTradeWin', 'average_trade_win', 'averageTradeWin', 'avg_win', 'avgWin', 'average_win', 'averageWin']), strategy.averageTradeWin || (derivedAverageWin !== '' ? derivedAverageWin : '--')) },
        { label: 'Average Trade Loss %', value: this.formatPercentStatValue(this.getFirstDefined(summary, ['avg_trade_loss', 'avgTradeLoss', 'average_trade_loss', 'averageTradeLoss', 'avg_loss', 'avgLoss', 'average_loss', 'averageLoss']), strategy.averageTradeLoss || (derivedAverageLoss !== '' ? derivedAverageLoss : '--')) },
        { label: 'Max Risk %', value: this.formatAbsolutePercentValue(this.getFirstDefined(summary, ['max_risk', 'backtestMaxDrawdown', 'backtest_max_drawdown', 'max_drawdown', 'maxDrawdown', 'maxRisk']), strategy.maxDrawdown || '--') },
        { label: 'Total Trades', value: this.formatIntegerStatValue(totalTradesSource, strategy.trades || (tradeReturns.length ? tradeReturns.length : '--')) },
        { label: 'Total Positive', value: this.formatIntegerStatValue(this.getFirstDefined(summary, ['total_positive', 'backtestTotalPositive', 'backtest_total_positive', 'totalPositive', 'positive_trades', 'positiveTrades', 'winning_trades', 'winningTrades', 'wins', 'win_count', 'winCount']), strategy.totalPositive || (derivedPositiveTrades !== '' ? derivedPositiveTrades : '--')) },
        { label: 'Total Negative', value: this.formatIntegerStatValue(this.getFirstDefined(summary, ['total_negative', 'backtestTotalNegative', 'backtest_total_negative', 'totalNegative', 'negative_trades', 'negativeTrades', 'losing_trades', 'losingTrades', 'losses', 'loss_count', 'lossCount']), strategy.totalNegative || (derivedNegativeTrades !== '' ? derivedNegativeTrades : '--')) },
        { label: 'Time In Market %', value: this.formatPercentStatValue(dashboardTimeInMarket, '--') },
      ]
    },
    getTradeReturnValues(trades) {
      if (!Array.isArray(trades)) return []
      return trades
        .map(trade => {
          const explicitReturn = this.getFirstDefined(trade, ['return_pct', 'profit_pct', 'floating_profit', 'returnPct', 'profitPct'])
          const returnValue = explicitReturn === ''
            ? this.calculateReturnPercent(trade.entry_price || trade.entryPrice, trade.exit_price || trade.exitPrice)
            : explicitReturn
          return this.getPercentNumber(returnValue)
        })
        .filter(value => value !== null)
    },
    getAverageTradeReturn(values, predicate) {
      const selectedValues = values.filter(predicate)
      if (!selectedValues.length) return ''
      return selectedValues.reduce((sum, value) => sum + value, 0) / selectedValues.length
    },
    buildParameterRanges(positions, strategy) {
      const rows = []
      if (Array.isArray(positions)) rows.push(...positions)
      if (Array.isArray(strategy && strategy.stocks)) rows.push(...strategy.stocks)

      return {
        profitTargetRange: this.formatPercentRange(rows, ['profit_target_pct', 'profitTargetPct', 'ProfitTargetPct']),
        stopLossRange: this.formatPercentRange(rows, ['stop_loss_pct', 'stopLossPct', 'StopLossPct']),
        timeInMarketRange: this.formatIntegerRange(rows, ['time_in_market', 'timeInMarket', 'best_time_in_market', 'tim'], 'Bars'),
      }
    },
    normalizeStrategyParameters(data = {}, summary = {}) {
      const sources = this.getParameterSources(data, summary)
      const profitTargetRange = this.formatParameterPercentValue(this.getParameterValue(
        sources,
        ['profit_target_range', 'profitTargetRange', 'profit_target', 'profitTarget', 'profit_target_pct', 'profitTargetPct', 'pt', 'PT'],
        ['profit target', 'pt']
      )) || this.formatParameterPairRange(
        sources,
        ['profit_target_min', 'profitTargetMin', 'min_profit_target', 'pt_min', 'PTMin'],
        ['profit_target_max', 'profitTargetMax', 'max_profit_target', 'pt_max', 'PTMax'],
        value => this.formatPercentValue(value, false, '')
      )
      const stopLossRange = this.formatParameterPercentValue(this.getParameterValue(
        sources,
        ['stop_loss_range', 'stopLossRange', 'stop_loss', 'stopLoss', 'stop_loss_pct', 'stopLossPct', 'sl', 'SL'],
        ['stop loss', 'sl']
      )) || this.formatParameterPairRange(
        sources,
        ['stop_loss_min', 'stopLossMin', 'min_stop_loss', 'sl_min', 'SLMin'],
        ['stop_loss_max', 'stopLossMax', 'max_stop_loss', 'sl_max', 'SLMax'],
        value => this.formatPercentValue(value, false, '')
      )
      const timeInMarketRange = this.formatParameterIntegerValue(this.getParameterValue(
        sources,
        ['best_time_in_market', 'bestTimeInMarket', 'time_in_market', 'timeInMarket', 'time_in_market_range', 'timeInMarketRange', 'tim', 'TIM'],
        ['best time in market', 'time in market', 'tim']
      ), 'Bars') || this.formatParameterPairRange(
        sources,
        ['best_time_in_market_min', 'bestTimeInMarketMin', 'time_in_market_min', 'timeInMarketMin', 'tim_min', 'TIMMin'],
        ['best_time_in_market_max', 'bestTimeInMarketMax', 'time_in_market_max', 'timeInMarketMax', 'tim_max', 'TIMMax'],
        value => this.formatIntegerWithUnit(value, 'Bars')
      )

      return {
        sortingMetric: this.formatTextParameter(this.getParameterValue(
          sources,
          ['sort_by', 'sortBy', 'sorting_by', 'sortingBy', 'sorting_metric', 'sortingMetric', 'rank_by', 'rankBy'],
          ['sorting by', 'sorting metric', 'sort by', 'rank by']
        )),
        profitTargetRange,
        stopLossRange,
        timeInMarketRange,
        topPicks: this.formatStockCountParameter(this.getParameterValue(
          sources,
          ['top_picks', 'topPicks', 'top_n', 'topN', 'daily_top_n', 'dailyTopN', 'pick_count', 'pickCount'],
          ['top picks', 'top n', 'daily top']
        )),
        allocation: this.formatAllocationParameter(this.getParameterValue(
          sources,
          ['allocation', 'allocation_pct', 'allocationPct', 'allocation_ratio', 'allocationRatio', 'allocation_multiplier', 'allocationMultiplier'],
          ['allocation']
        )),
        dailyTotalPosition: this.formatAllocationParameter(this.getParameterValue(
          sources,
          ['daily_total_position', 'dailyTotalPosition', 'daily_position', 'dailyPosition', 'total_position', 'totalPosition'],
          ['daily total position', 'daily position', 'total position']
        ), ' per day'),
        initialCapital: this.formatMoneyParameter(this.getParameterValue(
          sources,
          ['init_cash', 'initial_capital', 'initialCapital', 'initial_cash', 'initialCash'],
          ['Starting Capital Cash', 'initial cash']
        )),
        tradingStart: this.formatTextParameter(this.getParameterValue(
          sources,
          ['start_date', 'startDate', 'backtest_start', 'backtestStart', 'trading_start', 'tradingStart', 'inception_date', 'inceptionDate'],
          ['trading start', 'trading start', 'start date']
        )),
        signalGeneration: this.formatTextParameter(this.getParameterValue(
          sources,
          ['signal_generation', 'signalGeneration', 'signal_time', 'signalTime', 'signal_schedule', 'signalSchedule'],
          ['signal generation', 'signal time']
        )),
        execution: this.formatTextParameter(this.getParameterValue(
          sources,
          ['execution', 'execution_time', 'executionTime', 'trade_execution', 'tradeExecution', 'order_execution', 'orderExecution'],
          ['execution', 'trade execution', 'order execution']
        )),
      }
    },
    getParameterSources(...roots) {
      const nestedKeys = [
        'parameters',
        'params',
        'strategy_parameters',
        'strategyParameters',
        'filter_conditions',
        'filterConditions',
        'core_parameters',
        'coreParameters',
        'settings',
        'config',
        'configuration',
        'rules',
        'strategy_config',
        'strategyConfig',
      ]
      const sources = []
      const addSource = source => {
        if (!source || typeof source !== 'object' || sources.includes(source)) return
        sources.push(source)
        if (Array.isArray(source)) return
        nestedKeys.forEach(key => addSource(source[key]))
      }

      roots.forEach(addSource)
      return sources
    },
    getParameterValue(sources, keys, labels = []) {
      for (let index = 0; index < sources.length; index += 1) {
        const source = sources[index]
        if (Array.isArray(source)) {
          const listValue = this.getParameterValueFromList(source, keys, labels)
          if (listValue !== '') return listValue
          continue
        }

        const directValue = this.getFirstDefined(source, keys)
        if (directValue !== '') return directValue
      }
      return ''
    },
    getParameterValueFromList(list, keys, labels) {
      for (let index = 0; index < list.length; index += 1) {
        const item = list[index]
        if (!item || typeof item !== 'object') continue

        const directValue = this.getFirstDefined(item, keys)
        if (directValue !== '') return directValue

        const label = this.getFirstDefined(item, ['key', 'field', 'name', 'label', 'title'])
        if (!this.matchesParameterName(label, keys, labels)) continue

        const displayValue = this.getFirstDefined(item, ['value', 'display_value', 'displayValue', 'text', 'range'])
        return displayValue !== '' ? displayValue : item
      }
      return ''
    },
    matchesParameterName(value, keys, labels) {
      if (!value) return false
      const normalizedValue = this.normalizeParameterName(value)
      const normalizedKeys = keys.map(key => this.normalizeParameterName(key))
      if (normalizedKeys.includes(normalizedValue)) return true

      const lowerValue = String(value).toLowerCase()
      return labels.some(label => lowerValue.includes(String(label).toLowerCase()))
    },
    normalizeParameterName(value) {
      return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '')
    },
    getParameterDisplayValue(value) {
      if (value === undefined || value === null || value === '') return ''
      if (Array.isArray(value)) return value
      if (typeof value === 'object') {
        const directValue = this.getFirstDefined(value, ['value', 'display_value', 'displayValue', 'text', 'range'])
        return directValue !== '' ? directValue : value
      }
      return value
    },
    formatTextParameter(value) {
      const displayValue = this.getParameterDisplayValue(value)
      if (displayValue === '') return ''
      return Array.isArray(displayValue) ? displayValue.join(', ') : String(displayValue)
    },
    formatParameterPercentValue(value) {
      const rangeValue = this.formatParameterRangeValue(value, item => this.formatPercentValue(item, false, ''))
      if (rangeValue) return rangeValue

      const displayValue = this.getParameterDisplayValue(value)
      if (displayValue === '') return ''
      if (Array.isArray(displayValue)) return displayValue.join(' - ')
      if (typeof displayValue === 'string' && /[A-Za-z<>]/.test(displayValue)) return displayValue
      return this.formatPercentValue(displayValue, false, String(displayValue))
    },
    formatParameterIntegerValue(value, unit) {
      const rangeValue = this.formatParameterRangeValue(value, item => this.formatIntegerWithUnit(item, unit))
      if (rangeValue) return rangeValue

      const displayValue = this.getParameterDisplayValue(value)
      if (displayValue === '') return ''
      if (Array.isArray(displayValue)) return displayValue.join(' - ')
      if (typeof displayValue === 'string' && /[A-Za-z<>]/.test(displayValue)) return displayValue
      return this.formatIntegerWithUnit(displayValue, unit) || String(displayValue)
    },
    formatParameterRangeValue(value, formatter) {
      const displayValue = this.getParameterDisplayValue(value)
      if (Array.isArray(displayValue) && displayValue.length >= 2) {
        return this.formatParameterRange(displayValue[0], displayValue[1], formatter)
      }
      if (displayValue && typeof displayValue === 'object' && !Array.isArray(displayValue)) {
        const min = this.getFirstDefined(displayValue, ['min', 'minimum', 'from', 'lower', 'start'])
        const max = this.getFirstDefined(displayValue, ['max', 'maximum', 'to', 'upper', 'end'])
        if (min !== '' && max !== '') return this.formatParameterRange(min, max, formatter)
      }
      return ''
    },
    formatParameterPairRange(sources, minKeys, maxKeys, formatter) {
      const min = this.getParameterValue(sources, minKeys)
      const max = this.getParameterValue(sources, maxKeys)
      if (min === '' || max === '') return ''
      return this.formatParameterRange(min, max, formatter)
    },
    formatParameterRange(min, max, formatter) {
      const formattedMin = formatter(min)
      const formattedMax = formatter(max)
      if (!formattedMin || !formattedMax) return ''
      return formattedMin === formattedMax ? formattedMin : `${formattedMin} - ${formattedMax}`
    },
    formatIntegerWithUnit(value, unit) {
      const numberValue = this.getNumberValue(value)
      if (numberValue === null) return ''
      return `${Math.round(numberValue)} ${unit}`
    },
    formatStockCountParameter(value) {
      const displayValue = this.getParameterDisplayValue(value)
      if (displayValue === '') return ''
      if (typeof displayValue === 'string' && /[A-Za-z]/.test(displayValue)) return displayValue
      const numberValue = this.getNumberValue(displayValue)
      return numberValue === null ? String(displayValue) : `${Math.round(numberValue)} Stocks`
    },
    formatAllocationParameter(value, suffix = '') {
      const displayValue = this.getParameterDisplayValue(value)
      if (displayValue === '') return ''
      if (typeof displayValue === 'string' && /[A-Za-z]/.test(displayValue)) return displayValue

      const formattedValue = this.formatPercentValue(displayValue, false, '')
      return formattedValue ? `${formattedValue}${suffix}` : String(displayValue)
    },
    formatMoneyParameter(value) {
      const displayValue = this.getParameterDisplayValue(value)
      if (displayValue === '') return ''
      if (typeof displayValue === 'string' && displayValue.trim().startsWith('$')) return displayValue
      return this.formatMoneyValue(displayValue, '')
    },
    mergeStrategies(apiStrategies) {
      console.log('Merging strategies:', apiStrategies)
      return Array.isArray(apiStrategies) ? apiStrategies : []
    },
    getStrategyApiId(strategyId) {
      const match = String(strategyId || '').match(/\d+/)
      return match ? match[0] : String(strategyId || '')
    },
    getDisplayStrategyName(fullName, base = {}) {
      const name = String(fullName || '').trim()
      if (!name) return base.name || ''
      if (base.name && name.includes(base.name)) return base.name
      return name.replace(/\s+Strategy$/i, '') || base.name || name
    },
    getStrategyTone(prefix, index = 0) {
      const key = String(prefix || '').trim().toLowerCase()
      if (key.includes('momentum')) return 'blue'
      if (key.includes('pattern')) return 'rose'
      if (key.includes('multi')) return 'violet'

      const tones = ['blue', 'rose', 'violet', 'green', 'amber', 'teal']
      return tones[index % tones.length]
    },
    getActionDate(data, summary, detail) {
      const explicitDate = this.getFirstDefined(data, ['next_date', 'nextDate', 'action_date', 'next_market_open'])
      if (explicitDate) return explicitDate

      const sourceDate = this.getFirstDefined(data, ['trade_date', 'date', 'as_of'])
        || this.getFirstDefined(summary, ['date', 'trade_date', 'as_of'])
        || this.dashboardDate
      return this.getNextTradingDate(sourceDate) || detail.actionDate
    },
    getLastUpdated(data, summary, detail) {
      const explicitValue = this.getFirstDefined(data, ['last_updated', 'updated_at'])
        || this.getFirstDefined(summary, ['last_updated', 'updated_at'])
      if (explicitValue) return explicitValue

      const sourceDate = this.getFirstDefined(summary, ['date', 'trade_date', 'as_of']) || this.dashboardDate
      return sourceDate ? `${sourceDate} 11:00 PM EST (Post-Market Close)` : detail.lastUpdated
    },
    formatCapitalNoteDate(value) {
      const text = String(value || '').trim()
      if (!text) return ''

      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      const dateMatch = text.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/)
      const compactDateMatch = text.match(/^(\d{4})(\d{2})(\d{2})$/)
      const match = dateMatch || compactDateMatch

      if (match) {
        const monthIndex = Number(match[2]) - 1
        const day = Number(match[3])
        if (monthIndex >= 0 && monthIndex < months.length && day >= 1 && day <= 31) {
          return `${months[monthIndex]} ${day}, ${match[1]}`
        }
      }

      if (/^\d+$/.test(text)) return 'Jan 3, 2023'
      return text
    },
    getNextTradingDate(value) {
      if (!value) return ''
      const [datePart] = String(value).split(/[T ]/)
      const parts = datePart.split('-').map(Number)
      if (parts.length !== 3 || parts.some(part => !Number.isFinite(part))) return ''

      const date = new Date(parts[0], parts[1] - 1, parts[2])
      do {
        date.setDate(date.getDate() + 1)
      } while (date.getDay() === 0 || date.getDay() === 6)

      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    },
    getDailyTotalPosition(strategy, fallback) {
      const stocks = Array.isArray(strategy && strategy.stocks) ? strategy.stocks : []
      const total = stocks.reduce((sum, stock) => {
        const ratio = this.getPercentNumber(stock.cashRatio)
        return ratio === null ? sum : sum + ratio
      }, 0)

      return total > 0 ? `${this.formatCompactNumber(total)}% per day` : fallback
    },
    formatPercentRange(rows, keys) {
      const values = this.getRangeNumbers(rows, keys, true)
      if (!values.length) return ''
      const min = Math.min.apply(null, values)
      const max = Math.max.apply(null, values)
      if (min === max) return `${this.formatCompactNumber(min)}%`
      return `${this.formatCompactNumber(min)}% - ${this.formatCompactNumber(max)}%`
    },
    formatIntegerRange(rows, keys, unit) {
      const values = this.getRangeNumbers(rows, keys, false)
      if (!values.length) return ''
      const min = Math.min.apply(null, values)
      const max = Math.max.apply(null, values)
      if (min === max) return `${Math.round(min)} ${unit}`
      return `${Math.round(min)} - ${Math.round(max)} ${unit}`
    },
    getRangeNumbers(rows, keys, isPercent) {
      return rows
        .map(row => this.getFirstDefined(row, keys))
        .map(value => (isPercent ? this.getPercentNumber(value) : this.getNumberValue(value)))
        .filter(value => value !== null)
    },
    getDrawdownTrend(source) {
      const chartData = this.getFirstDefined(source, ['chart_data', 'chartData'])
      const drawdowns = chartData && this.getFirstDefined(chartData, ['drawdowns', 'drawdown'])
      const strategySeries = drawdowns && this.getFirstDefined(drawdowns, ['strategy', 'Strategy'])
      if (!Array.isArray(strategySeries)) return []

      return strategySeries
        .slice(-SPARKLINE_TREND_POINTS)
        .map(value => this.getNumberValue(value))
        .filter(value => value !== null)
    },
    getHoldingRowKey(row) {
      return `${row && row.symbol ? row.symbol : '--'}-${row && row.entryDate ? row.entryDate : '--'}`
    },
    isHoldingExpanded(row) {
      return Boolean(this.expandedHoldingRows[this.getHoldingRowKey(row)])
    },
    toggleHoldingDetails(row) {
      const rowKey = this.getHoldingRowKey(row)
      if (this.expandedHoldingRows[rowKey]) {
        delete this.expandedHoldingRows[rowKey]
        return
      }

      this.expandedHoldingRows[rowKey] = true
    },
    getHoldingDetailLinks(row) {
      const symbol = row && row.symbol ? String(row.symbol).trim() : ''
      const indicatorSymbol = encodeURIComponent(symbol || '--')
      const HV = []
      if(row && row.hv20 && row.hv20 !== '--') {
        HV.push({
          key: 'hv20',
          label: 'Historical Volatility (20-Day)',
          value: row.hv20,
          href: `/trend_score/historical?indicator=${indicatorSymbol}_volatility_20d_60d`,
        })
      }
      if(row && row.hv60 && row.hv60 !== '--') {
        HV.push({
          key: 'hv60',
          label: 'Historical Volatility (60-Day)',
          value: row.hv60,
          href: `/trend_score/historical?indicator=${indicatorSymbol}_volatility_20d_60d`,
        })
      }

      return [
        {
          key: 'optix',
          label: 'Optix',
          value: row && row.optix ? row.optix : '--',
          href: `/indicators?indicator=${indicatorSymbol}`,
        },
        {
          key: 'trend-score',
          label: 'Trend score',
          value: row && row.trendScore ? row.trendScore : '--',
          href: `/trend_score/trend?indicator=${indicatorSymbol}_trend_reltrend`,
        },
        {
          key: 'relative-trend-score',
          label: 'Relative Trend Score',
          value: row && row.relativeTrendScore ? row.relativeTrendScore : '--',
          href: `/trend_score/trend?indicator=${indicatorSymbol}_trend_reltrend`,
        },
        ...HV
      ]
    },
    isHoldingActionRequired(row) {
      const status = row && row.status !== undefined && row.status !== null ? String(row.status).trim() : ''
      return Boolean(status) && status.toLowerCase() !== 'holding'
    },
    isHoldingSellTomorrowRow(row) {
      return this.isHoldingActionRequired(row)
    },
    getHoldingStatusLabel(row) {
      console.log('getHoldingStatusLabel row:', row)
      const status = row && row.status ? String(row.status).trim() : 'Holding'
      if (!this.isHoldingActionRequired(row) || /sell tomorrow/i.test(status)) return status
      return `Sell Tomorrow (${status})`    
    },
    getSellReason(position) {
      const status = this.getPositionStatus(position)
      if (status && status.toLowerCase() !== 'holding') return status

      const explicitReason = this.mapExitReason(this.getFirstDefined(position, ['exit_reason', 'exitReason', 'reason']))
      if (explicitReason !== '--') {
        if (explicitReason === 'Profit Target' || explicitReason === 'Stop Loss') return `${explicitReason}`
        else return explicitReason
      }

      const currentPrice = this.getNumberValue(this.getFirstDefined(position, ['current_price', 'currentPrice']))
      const profitTargetPrice = this.getNumberValue(this.getFirstDefined(position, ['profit_target_price', 'profitTargetPrice']))
      const stopLossPrice = this.getNumberValue(this.getFirstDefined(position, ['stop_loss_price', 'stopLossPrice']))

      if (currentPrice !== null && profitTargetPrice !== null && currentPrice >= profitTargetPrice) return 'Profit Target'
      if (currentPrice !== null && stopLossPrice !== null && currentPrice <= stopLossPrice) return 'Stop Loss'
      return 'Time Is Up'
    },
    getPositionStatus(position) {
      const status = this.getFirstDefined(position, ['status'])
      return status === undefined || status === null ? '' : String(status).trim()
    },
    isSellActionPosition(position) {
      const status = this.getPositionStatus(position).toLowerCase()
      return Boolean(status) && status !== 'holding'
    },
    shouldSellPosition(position) {
      const remainingDays = this.getNumberValue(this.getFirstDefined(position, ['remaining_days', 'remainingDays']))
      const status = String(this.getFirstDefined(position, ['status', 'action', 'next_action', 'trade_action'])).toLowerCase()
      return status.includes('sell') || (remainingDays !== null && remainingDays <= 1)
    },
    formatTargetWithPercent(price, percent, direction) {
      if (!price && !percent) return '--'
      if (!percent) return price || '--'
      if (!price) return percent

      const percentNumber = this.getPercentNumber(percent)
      if (percentNumber === null) return `${price} (${percent})`

      const signedPercent = direction === 'down'
        ? `-${this.formatCompactNumber(Math.abs(percentNumber))}%`
        : `+${this.formatCompactNumber(Math.abs(percentNumber))}%`
      return `${price} (${signedPercent})`
    },
    formatHoldingPeriod(value) {
      if (value === undefined || value === null || value === '') return '--'
      if (typeof value === 'string' && /day|bar/i.test(value)) return value
      const numberValue = this.getNumberValue(value)
      return numberValue === null ? String(value) : `${Math.round(numberValue)} trading days`
    },
    formatAssetChange(totalAsset, initCash, returnRate, fallback) {
      const total = this.getNumberValue(totalAsset)
      const initial = this.getNumberValue(initCash)
      if (total === null || initial === null) return fallback

      const change = total - initial
      const sign = change >= 0 ? '+' : '-'
      const money = `${sign}$${Math.abs(change).toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      })}`
      const calculatedReturn = initial ? (change / initial) * 100 : null
      const returnText = this.formatPercentValue(returnRate !== '' ? returnRate : calculatedReturn, true, '')
      return returnText ? `${money} (${returnText})` : money
    },
    formatAlphaValue(alphaValue, returnRate, benchmarkReturn, fallback) {
      const explicitAlpha = this.getPercentNumber(alphaValue)
      if (explicitAlpha !== null) return this.formatPercentValue(explicitAlpha, true, fallback)

      const strategyReturn = this.getPercentNumber(returnRate)
      const benchmark = this.getPercentNumber(benchmarkReturn)
      if (strategyReturn === null || benchmark === null) return fallback
      return this.formatPercentValue(strategyReturn - benchmark, true, fallback)
    },
    formatRiskPercentValue(value, fallback) {
      const numberValue = this.getPercentNumber(value)
      if (numberValue === null) {
        const fallbackValue = this.getPercentNumber(fallback)
        if (fallbackValue === null) return fallback
        return `${this.formatCompactNumber(fallbackValue > 0 ? -fallbackValue : fallbackValue)}%`
      }
      return `${this.formatCompactNumber(numberValue > 0 ? -numberValue : numberValue)}%`
    },
    calculatePercentRatio(numerator, denominator) {
      const top = this.getNumberValue(numerator)
      const bottom = this.getNumberValue(denominator)
      if (top === null || !bottom) return ''
      return (top / bottom) * 100
    },
    calculateReturnPercent(entryPrice, exitPrice) {
      const entry = this.getNumberValue(entryPrice)
      const exit = this.getNumberValue(exitPrice)
      if (!entry || exit === null) return null
      return ((exit - entry) / entry) * 100
    },
    getDateValue(value) {
      if (!value || value === '--') return 0
      const timestamp = new Date(value).getTime()
      return Number.isFinite(timestamp) ? timestamp : 0
    },
    unwrapResponse(response) {
      const responseData = response && response.data !== undefined ? response.data : response
      return responseData && responseData.data !== undefined ? responseData.data : responseData
    },
    getFirstDefined(source, keys) {
      if (!source) return ''
      const foundKey = keys.find(key => source[key] !== undefined && source[key] !== null && source[key] !== '')
      return foundKey ? source[foundKey] : ''
    },
    getFirstNumber(source, keys) {
      const value = this.getFirstDefined(source, keys)
      return this.getNumberValue(value)
    },
    getNumberValue(value) {
      if (value === undefined || value === null || value === '' || value === '--') return null
      const numberValue = Number(String(value).replace(/[^0-9.-]/g, ''))
      return Number.isFinite(numberValue) ? numberValue : null
    },
    getPercentNumber(value) {
      const numberValue = this.getNumberValue(value)
      if (numberValue === null) return null
      return Math.abs(numberValue) <= 1 && String(value).indexOf('%') === -1 ? numberValue : numberValue
    },
    formatTrimmedNumber(value, digits = 2) {
      const numberValue = Number(value)
      if (!Number.isFinite(numberValue)) return ''
      const fixedValue = numberValue.toFixed(digits)
      const trimmedValue = fixedValue.replace(/\.?0+$/, '')
      return trimmedValue === '-0' ? '0' : trimmedValue
    },
    formatCompactNumber(value) {
      const numberValue = Number(value)
      if (!Number.isFinite(numberValue)) return ''
      return this.formatTrimmedNumber(numberValue)
    },
    formatMoneyValue(value, fallback = '') {
      const numberValue = this.getNumberValue(value)
      if (numberValue === null) return fallback
      return `$${numberValue.toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      })}`
    },
    formatIntegerValue(value, fallback = '') {
      const numberValue = this.getNumberValue(value)
      if (numberValue === null) return fallback
      return Math.round(numberValue).toLocaleString('en-US')
    },
    formatIntegerStatValue(value, fallback = '--') {
      const formattedValue = this.formatIntegerValue(value, '')
      if (formattedValue) return formattedValue

      const formattedFallback = this.formatIntegerValue(fallback, '')
      return formattedFallback || fallback || '--'
    },
    formatDecimalValue(value, fallback = '') {
      const numberValue = this.getNumberValue(value)
      if (numberValue === null) {
        const fallbackValue = this.getNumberValue(fallback)
        return fallbackValue === null ? fallback : this.formatTrimmedNumber(fallbackValue)
      }
      return this.formatTrimmedNumber(numberValue)
    },
    formatFixedDecimalValue(value, fallback = '', digits = 2) {
      const numberValue = this.getNumberValue(value)
      if (numberValue !== null) return this.formatTrimmedNumber(numberValue, digits)

      const fallbackValue = this.getNumberValue(fallback)
      return fallbackValue === null ? fallback : this.formatTrimmedNumber(fallbackValue, digits)
    },
    formatPercentValue(value, showSign = false, fallback = '') {
      const percentValue = this.getPercentNumber(value)
      if (percentValue === null) {
        const fallbackValue = this.getPercentNumber(fallback)
        if (fallbackValue === null) return fallback
        const fallbackPrefix = showSign && fallbackValue > 0 ? '+' : ''
        return `${fallbackPrefix}${this.formatTrimmedNumber(fallbackValue)}%`
      }
      const prefix = showSign && percentValue > 0 ? '+' : ''
      return `${prefix}${this.formatTrimmedNumber(percentValue)}%`
    },
    formatPercentStatValue(value, fallback = '--', showSign = false) {
      const formattedValue = this.formatPercentValue(value, showSign, '')
      if (formattedValue) return formattedValue

      const formattedFallback = this.formatPercentValue(fallback, showSign, '')
      return formattedFallback || fallback || '--'
    },
    formatAbsolutePercentValue(value, fallback = '') {
      const percentValue = this.getPercentNumber(value)
      if (percentValue !== null) return `${this.formatTrimmedNumber(Math.abs(percentValue))}%`

      const fallbackValue = this.getPercentNumber(fallback)
      return fallbackValue === null ? fallback : `${this.formatTrimmedNumber(Math.abs(fallbackValue))}%`
    },
    mapExitReason(reason) {
      const reasonMap = {
        'Profit Target': 'Profit Target',
        'Stop Loss': 'Stop Loss',
        'Time Out': 'Time Is Up',   
      }
      return reasonMap[reason] || reason || '--'
    },
    isNegative(value) {
      const numberValue = this.getNumberValue(value)
      return numberValue !== null && numberValue < 0
    },
    getSignalLabel(signal) {
      return getSwingSignalLabel(signal)
    },
    getSignalDescription(signal) {
      return getSwingSignalDescription(signal)
    },
    getSparklinePoints(values) {
      const trendValues = Array.isArray(values) ? values.slice(-SPARKLINE_TREND_POINTS) : values
      return this.getLinePoints(trendValues, 120, 44, 4, 4)
    },
    getChartImageUrl(type) {
      const chart = this.currentDetail.charts && this.currentDetail.charts[type]
      return chart && chart.imageUrl ? chart.imageUrl : ''
    },
    getRawChartDates(type) {
      const chart = this.currentDetail.charts && this.currentDetail.charts[type]
      return chart && Array.isArray(chart.dates) ? chart.dates : []
    },
    getChartRangeState(type) {
      const ranges = this.performanceChartRanges || {}
      return ranges[type] || { start: null, end: null }
    },
    getChartRangeMaxIndex(type) {
      return Math.max(this.getRawChartDates(type).length - 1, 0)
    },
    hasChartRangeSelector(type) {
      return this.getChartRangeMaxIndex(type) > 1
    },
    normalizeChartRangeValues(type, startValue, endValue, changedEdge = 'range') {
      const maxIndex = this.getChartRangeMaxIndex(type)
      if (maxIndex <= 0) return { start: 0, end: 0 }

      let start = startValue === null || startValue === undefined ? 0 : Math.round(Number(startValue))
      let end = endValue === null || endValue === undefined ? maxIndex : Math.round(Number(endValue))

      if (!Number.isFinite(start)) start = 0
      if (!Number.isFinite(end)) end = maxIndex

      start = Math.max(0, Math.min(start, maxIndex))
      end = Math.max(0, Math.min(end, maxIndex))

      const minSpan = Math.min(maxIndex, 1)
      if (end - start < minSpan) {
        if (changedEdge === 'start') {
          start = Math.max(0, end - minSpan)
        } else if (changedEdge === 'end') {
          end = Math.min(maxIndex, start + minSpan)
        } else if (start > end) {
          start = Math.max(0, end - minSpan)
        } else if (start + minSpan <= maxIndex) {
          end = start + minSpan
        } else {
          start = Math.max(0, end - minSpan)
        }
      }

      return { start, end }
    },
    getNormalizedChartRange(type) {
      const rangeState = this.getChartRangeState(type)
      return this.normalizeChartRangeValues(type, rangeState.start, rangeState.end)
    },
    getPendingChartRange(type) {
      const pendingRanges = this.pendingPerformanceChartRanges || {}
      const pendingRange = pendingRanges[type]
      if (pendingRange) {
        return this.normalizeChartRangeValues(type, pendingRange.start, pendingRange.end)
      }

      return this.getNormalizedChartRange(type)
    },
    getChartRangeLabel(type) {
      return this.getChartRangeLabelForRange(type, this.getPendingChartRange(type))
    },
    getChartRangeLabelForRange(type, range) {
      const dates = this.getRawChartDates(type)
      if (!dates.length) return ''

      const startDate = this.formatChartTooltipDate(dates[range.start])
      const endDate = this.formatChartTooltipDate(dates[range.end])
      return `${startDate} - ${endDate}`
    },
    getChartRangeSelectionStyle(type) {
      const maxIndex = Math.max(this.getChartRangeMaxIndex(type), 1)
      const range = this.getPendingChartRange(type)
      return {
        left: `${(range.start / maxIndex) * 100}%`,
        right: `${((maxIndex - range.end) / maxIndex) * 100}%`,
      }
    },
    getChartRangeHandleStyle(type, edge) {
      const maxIndex = Math.max(this.getChartRangeMaxIndex(type), 1)
      const range = this.getPendingChartRange(type)
      const index = edge === 'start' ? range.start : range.end
      return {
        left: `${(index / maxIndex) * 100}%`,
      }
    },
    getChartRangePreviewPoints(type) {
      return this.getChartRangePreview(type).points
    },
    getChartRangePreviewTicks(type) {
      return this.getChartRangePreview(type).ticks
    },
    getChartRangePreview(type) {
      return type === 'drawdown' ? this.drawdownChartPreview : this.cumulativeChartPreview
    },
    buildChartRangePreview(type) {
      const chart = this.currentDetail.charts && this.currentDetail.charts[type]
      const strategy = chart && Array.isArray(chart.strategy) ? chart.strategy : []
      const benchmark = chart && Array.isArray(chart.benchmark) ? chart.benchmark : []
      const values = strategy.length ? strategy : benchmark

      return {
        points: this.buildChartRangePreviewPoints(values),
        ticks: this.buildChartRangePreviewTicks(this.getRawChartDates(type)),
      }
    },
    buildChartRangePreviewPoints(values) {
      if (!values.length) return ''

      const numericValues = values.map(value => this.getNumberValue(value))
      const parsedValues = numericValues.filter(value => value !== null)
      if (!parsedValues.length) return ''

      const min = Math.min.apply(null, parsedValues)
      const max = Math.max.apply(null, parsedValues)
      const range = Math.max(max - min, 1)
      const width = CHART_RANGE_PREVIEW_WIDTH
      const height = CHART_RANGE_PREVIEW_HEIGHT
      const paddingX = 16
      const paddingY = 6
      const drawableWidth = width - paddingX * 2
      const drawableHeight = height - paddingY * 2

      return numericValues.map((numberValue, index) => {
        if (numberValue === null) return ''

        const x = paddingX + (index / Math.max(values.length - 1, 1)) * drawableWidth
        const y = paddingY + ((max - numberValue) / range) * drawableHeight
        return `${x.toFixed(2)},${y.toFixed(2)}`
      }).filter(Boolean).join(' ')
    },
    buildChartRangePreviewTicks(dates) {
      if (!dates.length) return []

      const tickCount = Math.min(4, dates.length)
      const indexes = Array.from({ length: tickCount }, (_, index) => {
        return Math.round((index / Math.max(tickCount - 1, 1)) * (dates.length - 1))
      }).filter((dateIndex, index, allIndexes) => allIndexes.indexOf(dateIndex) === index)

      return indexes.map((index, tickIndex) => {
        const ratio = index / Math.max(dates.length - 1, 1)
        const x = ratio * CHART_RANGE_PREVIEW_WIDTH
        const isFirst = tickIndex === 0
        const isLast = tickIndex === indexes.length - 1
        return {
          index,
          x,
          left: `${ratio * 100}%`,
          anchor: isFirst ? 'start' : isLast ? 'end' : 'middle',
          label: this.formatChartRangePreviewLabel(dates[index]),
        }
      })
    },
    formatChartRangePreviewLabel(value) {
      const text = String(value || '')
      const match = text.match(/^(\d{4})/)
      return match ? match[1] : this.formatChartDate(value)
    },
    parseChartRangeDate(value) {
      if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value

      const text = String(value || '')
      const dateMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})/)
      if (dateMatch) {
        return new Date(Number(dateMatch[1]), Number(dateMatch[2]) - 1, Number(dateMatch[3]))
      }

      const monthMatch = text.match(/^(\d{4})-(\d{2})/)
      if (monthMatch) {
        return new Date(Number(monthMatch[1]), Number(monthMatch[2]) - 1, 1)
      }

      const parsedDate = new Date(text)
      return Number.isNaN(parsedDate.getTime()) ? null : parsedDate
    },
    getChartRangePresetRange(type, preset) {
      const dates = this.getRawChartDates(type)
      const end = dates.length - 1
      if (end <= 0) return { start: 0, end: Math.max(end, 0) }

      const months = Math.max(0, Number(preset && preset.months) || 0)
      const endDate = this.parseChartRangeDate(dates[end])
      let start = 0

      if (endDate) {
        const targetDate = new Date(endDate.getTime())
        targetDate.setMonth(targetDate.getMonth() - months)

        const matchedIndex = dates.findIndex((dateValue, index) => {
          if (index > end) return false

          const date = this.parseChartRangeDate(dateValue)
          return date && date >= targetDate
        })

        start = matchedIndex === -1 ? 0 : matchedIndex
      } else {
        start = Math.max(0, end - Math.round(months * 21))
      }

      return this.normalizeChartRangeValues(type, start, end)
    },
    applyChartRangePreset(type, preset) {
      if (!preset) return

      const range = this.getChartRangePresetRange(type, preset)
      this.clearChartRangeDebounceTimer(type)
      this.setActiveChartRangePresetKey(type, preset.key)
      this.setChartRange(type, range.start, range.end)
      this.$nextTick(() => {
        this.updateChartRangeNavigatorDom(type, this.getPendingChartRange(type))
      })
    },
    isChartRangePresetActive(type, preset) {
      if (!preset || !this.hasChartRangeSelector(type)) return false

      return this.getActiveChartRangePresetKey(type) === preset.key
    },
    buildChartRangePresetItems(type) {
      return this.chartRangePresets.map(preset => Object.assign({}, preset, {
        active: this.isChartRangePresetActive(type, preset),
      }))
    },
    setActiveChartRangePresetKey(type, key) {
      this.activeChartRangePresetKeys[type] = key || ''
    },
    getActiveChartRangePresetKey(type) {
      const currentRange = this.getPendingChartRange(type)
      const selectedKey = this.activeChartRangePresetKeys && this.activeChartRangePresetKeys[type]
      if (selectedKey) {
        const selectedPreset = this.chartRangePresets.find(preset => preset.key === selectedKey)
        if (selectedPreset && this.areChartRangesEqual(currentRange, this.getChartRangePresetRange(type, selectedPreset))) {
          return selectedKey
        }
      }

      return this.getMatchingChartRangePresetKey(type, currentRange)
    },
    getMatchingChartRangePresetKey(type, range) {
      return this.chartRangePresets.reduce((matchingKey, preset) => {
        const presetRange = this.getChartRangePresetRange(type, preset)
        return this.areChartRangesEqual(range, presetRange) ? preset.key : matchingKey
      }, '')
    },
    areChartRangesEqual(left, right) {
      return Boolean(left && right) && left.start === right.start && left.end === right.end
    },
    updateChartRangeStart(type, event) {
      const value = event && event.target ? event.target.value : event
      this.setPendingChartRange(type, value, this.getPendingChartRange(type).end, 'start')
    },
    updateChartRangeEnd(type, event) {
      const value = event && event.target ? event.target.value : event
      this.setPendingChartRange(type, this.getPendingChartRange(type).start, value, 'end')
    },
    setPendingChartRange(type, startValue, endValue, changedEdge = 'range') {
      const maxIndex = this.getChartRangeMaxIndex(type)
      if (maxIndex <= 0) {
        this.resetPerformanceChartRange()
        return
      }

      const range = this.normalizeChartRangeValues(type, startValue, endValue, changedEdge)
      this.pendingPerformanceChartRanges[type] = range
      this.setActiveChartRangePresetKey(type, this.getMatchingChartRangePresetKey(type, range))
      this.updateChartRangeNavigatorDom(type, range)
      this.scheduleChartRangeCommit(type, range.start, range.end)
    },
    updateChartRangeNavigatorDom(type, range) {
      const element = this.getChartRangeControlElement(type)
      if (!element) return

      const maxIndex = Math.max(this.getChartRangeMaxIndex(type), 1)
      const left = `${(range.start / maxIndex) * 100}%`
      const right = `${((maxIndex - range.end) / maxIndex) * 100}%`
      const endLeft = `${(range.end / maxIndex) * 100}%`
      const label = element.querySelector('.chart-range-window')
      const selection = element.querySelector('.chart-range-selection')
      const startHandle = element.querySelector('.chart-range-handle-start')
      const endHandle = element.querySelector('.chart-range-handle-end')
      const startInput = element.querySelector('.chart-range-input-start')
      const endInput = element.querySelector('.chart-range-input-end')

      if (label) label.textContent = this.getChartRangeLabelForRange(type, range)
      if (selection) {
        selection.style.left = left
        selection.style.right = right
      }
      if (startHandle) startHandle.style.left = left
      if (endHandle) endHandle.style.left = endLeft
      if (startInput) startInput.value = range.start
      if (endInput) endInput.value = range.end
    },
    getChartRangeControlElement(type) {
      const control = this.$refs[`${type}RangeControl`]
      return Array.isArray(control) ? control[0] : control
    },
    scheduleChartRangeCommit(type, start, end) {
      this.clearChartRangeDebounceTimer(type)
      this.chartRangeDebounceTimers[type] = setTimeout(() => {
        delete this.chartRangeDebounceTimers[type]
        this.setChartRange(type, start, end)
      }, CHART_RANGE_DEBOUNCE_MS)
    },
    clearChartRangeDebounceTimer(type) {
      const timers = this.chartRangeDebounceTimers || {}
      if (!timers[type]) return

      clearTimeout(timers[type])
      delete timers[type]
    },
    clearChartRangeDebounceTimers() {
      Object.keys(this.chartRangeDebounceTimers || {}).forEach(type => {
        this.clearChartRangeDebounceTimer(type)
      })
    },
    setChartRange(type, startValue, endValue, changedEdge = 'range') {
      const maxIndex = this.getChartRangeMaxIndex(type)
      if (maxIndex <= 0) {
        this.resetPerformanceChartRange()
        return
      }

      const range = this.normalizeChartRangeValues(type, startValue, endValue, changedEdge)
      this.pendingPerformanceChartRanges[type] = range
      this.performanceChartRanges[type] = range
      this.clearChartRangeTooltip(type)
    },
    clearChartRangeTooltip(type) {
      if (type === 'cumulative') {
        this.clearCumulativeChartHover()
      } else if (type === 'drawdown') {
        this.clearDrawdownChartHover()
      }
    },
    getVisibleChartWindow(type) {
      const dates = this.getRawChartDates(type)
      const localMaxIndex = dates.length - 1
      if (localMaxIndex <= 0) return { start: 0, end: Math.max(localMaxIndex, 0) }

      const range = this.getPendingChartRange(type)
      const start = Math.max(0, Math.min(range.start, localMaxIndex))
      let end = Math.max(0, Math.min(range.end, localMaxIndex))
      if (end < start) end = start

      return { start, end }
    },
    getVisibleChart(type) {
      const chart = this.currentDetail.charts && this.currentDetail.charts[type]
      const dates = chart && Array.isArray(chart.dates) ? chart.dates : []
      const benchmark = chart && Array.isArray(chart.benchmark) ? chart.benchmark : []
      const strategy = chart && Array.isArray(chart.strategy) ? chart.strategy : []
      const length = Math.min(dates.length, benchmark.length, strategy.length)
      if (!length) {
        return {
          dates: [],
          benchmark: [],
          strategy: [],
          min: chart && chart.min !== undefined ? chart.min : 0,
          max: chart && chart.max !== undefined ? chart.max : 100,
          ticks: chart && Array.isArray(chart.ticks) ? chart.ticks : [],
        }
      }

      const window = this.getVisibleChartWindow(type)
      const start = Math.min(window.start, length - 1)
      const end = Math.min(window.end, length - 1)
      const visibleDates = dates.slice(start, end + 1)
      const visibleBenchmark = benchmark.slice(start, end + 1)
      const visibleStrategy = strategy.slice(start, end + 1)
      const range = type === 'drawdown'
        ? this.getDrawdownChartRange([visibleBenchmark, visibleStrategy])
        : this.getChartSeriesRange([visibleBenchmark, visibleStrategy])

      return {
        dates: visibleDates,
        benchmark: visibleBenchmark,
        strategy: visibleStrategy,
        min: range.min,
        max: range.max,
        ticks: range.ticks,
      }
    },
    buildLineChartRender(type) {
      const chart = this.getVisibleChart(type)
      const benchmarkPointPositions = this.buildChartPointPositions(chart.benchmark, chart)
      const strategyPointPositions = this.buildChartPointPositions(chart.strategy, chart)

      return Object.assign({}, chart, {
        yTicks: this.buildChartYTicks(chart),
        dateTicks: this.buildChartDateTicks(chart.dates),
        benchmarkPointPositions,
        strategyPointPositions,
        benchmarkPoints: this.formatChartPointPositions(benchmarkPointPositions),
        strategyPoints: this.formatChartPointPositions(strategyPointPositions),
      })
    },
    getChartRender(type) {
      return type === 'drawdown' ? this.drawdownChartRender : this.cumulativeChartRender
    },
    buildChartYTicks(chart) {
      const ticks = chart && Array.isArray(chart.ticks) ? chart.ticks : []
      return ticks.map((tick, index) => ({
        index,
        label: tick,
        y: this.getChartYForRange(tick, chart.min, chart.max),
      }))
    },
    buildChartDateTicks(dates) {
      if (!Array.isArray(dates) || !dates.length) return []

      const tickCount = Math.min(6, dates.length)
      const indexes = Array.from({ length: tickCount }, (_, index) => {
        return Math.round((index / Math.max(tickCount - 1, 1)) * (dates.length - 1))
      }).filter((dateIndex, index, allIndexes) => allIndexes.indexOf(dateIndex) === index)

      return indexes.map((index, tickIndex) => ({
        index,
        x: this.getChartX(index, dates.length),
        anchor: tickIndex === 0 ? 'start' : tickIndex === indexes.length - 1 ? 'end' : 'middle',
        label: this.formatChartDate(dates[index]),
      }))
    },
    buildChartPointPositions(values, chart) {
      if (!Array.isArray(values) || !values.length) return []

      return values.map((value, index) => ({
        x: this.getChartX(index, values.length),
        y: this.getChartYForRange(value, chart.min, chart.max),
      }))
    },
    formatChartPointPositions(points) {
      if (!Array.isArray(points) || !points.length) return ''

      return points.map(point => `${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(' ')
    },
    getChartTicks(type) {
      return this.getChartRender(type).ticks
    },
    getChartDateTicks(type) {
      return this.getChartRender(type).dateTicks
    },
    handleCumulativeChartHover(event) {
      this.handleLineChartHover('cumulative', 'cumulativeChartTooltip', event)
    },
    handleDrawdownChartHover(event) {
      this.handleLineChartHover('drawdown', 'drawdownChartTooltip', event)
    },
    handleLineChartHover(type, tooltipKey, event) {
      if (!event || !event.currentTarget) {
        this.clearLineChartHover(tooltipKey)
        return
      }

      const rect = event.currentTarget.getBoundingClientRect()
      if (!rect.width) return

      const hoverState = getLineChartHoverState(this)
      hoverState.pending = {
        type,
        tooltipKey,
        clientX: event.clientX,
        rectLeft: rect.left,
        rectWidth: rect.width,
      }

      if (hoverState.frame !== null && hoverState.frame !== undefined) return

      hoverState.frame = this.requestLineChartHoverFrame(() => {
        const activeHoverState = getLineChartHoverState(this)
        const hover = activeHoverState.pending
        activeHoverState.pending = null
        activeHoverState.frame = null
        activeHoverState.frameIsTimeout = false

        if (hover) this.applyLineChartHover(hover)
      })
    },
    requestLineChartHoverFrame(callback) {
      const hoverState = getLineChartHoverState(this)
      if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
        hoverState.frameIsTimeout = false
        return window.requestAnimationFrame(callback)
      }

      hoverState.frameIsTimeout = true
      return setTimeout(callback, 16)
    },
    cancelLineChartHoverFrame(tooltipKey) {
      const hoverState = getLineChartHoverState(this)
      if (tooltipKey && hoverState.pending && hoverState.pending.tooltipKey !== tooltipKey) return

      if (hoverState.frame !== null && hoverState.frame !== undefined) {
        if (hoverState.frameIsTimeout) {
          clearTimeout(hoverState.frame)
        } else if (typeof window !== 'undefined' && typeof window.cancelAnimationFrame === 'function') {
          window.cancelAnimationFrame(hoverState.frame)
        }
      }

      hoverState.pending = null
      hoverState.frame = null
      hoverState.frameIsTimeout = false
    },
    applyLineChartHover(hover) {
      const chart = this.getChartRender(hover.type)
      const dates = chart.dates
      const benchmark = chart.benchmark
      const strategy = chart.strategy
      const length = Math.min(dates.length, benchmark.length, strategy.length)

      if (!length) {
        this.clearLineChartHover(hover.tooltipKey)
        return
      }

      const viewX = ((hover.clientX - hover.rectLeft) / hover.rectWidth) * 1000
      const clampedX = Math.min(980, Math.max(58, viewX))
      const index = Math.min(
        length - 1,
        Math.max(0, Math.round(((clampedX - 58) / 922) * (length - 1)))
      )
      const currentTooltip = this[hover.tooltipKey]
      if (currentTooltip && currentTooltip.visible && currentTooltip.index === index) return

      const benchmarkPoint = chart.benchmarkPointPositions[index] || {}
      const strategyPoint = chart.strategyPointPositions[index] || {}
      const x = Number.isFinite(benchmarkPoint.x) ? benchmarkPoint.x : this.getChartX(index, length)
      const benchmarkValue = benchmark[index]
      const strategyValue = strategy[index]
      const benchmarkY = Number.isFinite(benchmarkPoint.y)
        ? benchmarkPoint.y
        : this.getChartYForRange(benchmarkValue, chart.min, chart.max)
      const strategyY = Number.isFinite(strategyPoint.y)
        ? strategyPoint.y
        : this.getChartYForRange(strategyValue, chart.min, chart.max)
      const boxWidth = 218
      const boxHeight = 76
      const boxX = x > 740 ? x - boxWidth - 14 : x + 14
      const boxY = Math.min(
        190,
        Math.max(34, Math.min(benchmarkY, strategyY) - boxHeight - 12)
      )

      this[hover.tooltipKey] = {
        visible: true,
        index,
        x,
        benchmarkY,
        strategyY,
        boxX,
        boxY,
        date: this.formatChartTooltipDate(dates[index]),
        benchmark: this.formatChartTooltipValue(benchmarkValue),
        strategy: this.formatChartTooltipValue(strategyValue),
      }
    },
    clearCumulativeChartHover() {
      this.clearLineChartHover('cumulativeChartTooltip')
    },
    clearDrawdownChartHover() {
      this.clearLineChartHover('drawdownChartTooltip')
    },
    clearLineChartHover(tooltipKey) {
      this.cancelLineChartHoverFrame(tooltipKey)

      const currentTooltip = this[tooltipKey]
      if (currentTooltip && !currentTooltip.visible && currentTooltip.index === -1) return

      this[tooltipKey] = Object.assign({}, this[tooltipKey], {
        visible: false,
        index: -1,
      })
    },
    formatChartTooltipDate(value) {
      const text = String(value || '')
      const match = text.match(/^(\d{4})-(\d{2})-(\d{2})/)
      return match ? `${match[1]}-${match[2]}-${match[3]}` : text || '--'
    },
    formatChartTooltipValue(value) {
      const numberValue = this.getNumberValue(value)
      if (numberValue === null) return '--'
      return `${this.formatTrimmedNumber(numberValue)}%`
    },
    getChartX(index, length) {
      return 58 + (index / Math.max(length - 1, 1)) * 922
    },
    formatChartDate(value) {
      const text = String(value || '')
      const match = text.match(/^(\d{4})-(\d{2})/)
      return match ? `${match[1]}-${match[2]}` : text
    },
    getChartY(value, type) {
      const chart = this.getChartRender(type)
      const min = chart && chart.min !== undefined ? chart.min : 0
      const max = chart && chart.max !== undefined ? chart.max : 100
      return this.getChartYForRange(value, min, max)
    },
    getChartYForRange(value, min = 0, max = 100) {
      const height = 244
      return 30 + ((max - Number(value)) / Math.max(max - min, 1)) * height
    },
    getChartPoints(type, seriesKey) {
      const chart = this.getChartRender(type)
      return seriesKey === 'benchmark' ? chart.benchmarkPoints : chart.strategyPoints
    },
    getLinePoints(values, width, height, paddingX, paddingY, forcedMin, forcedMax) {
      if (!Array.isArray(values) || !values.length) return ''
      const parsedValues = values.map(value => this.getNumberValue(value)).filter(value => value !== null)
      if (!parsedValues.length) return ''

      const min = forcedMin !== undefined ? forcedMin : Math.min.apply(null, parsedValues)
      const max = forcedMax !== undefined ? forcedMax : Math.max.apply(null, parsedValues)
      const drawableWidth = width - paddingX * 2
      const drawableHeight = height - paddingY * 2
      const range = Math.max(max - min, 1)

      return values.map((value, index) => {
        const numberValue = this.getNumberValue(value)
        const x = paddingX + (index / Math.max(values.length - 1, 1)) * drawableWidth
        const y = paddingY + ((max - numberValue) / range) * drawableHeight
        return `${x.toFixed(2)},${y.toFixed(2)}`
      }).join(' ')
    },
    getMonthlyReturnCellStyle(cell) {
      const value = cell && cell.value
      if (value === null || value === undefined || !Number.isFinite(Number(value))) {
        return { backgroundColor: '#f8fafc', color: '#94a3b8' }
      }

      const numberValue = Number(value)
      const intensity = Math.min(Math.abs(numberValue) / 45, 1)
      const backgroundColor = numberValue >= 0
        ? this.mixHexColor('#fffec4', '#16a34a', intensity)
        : this.mixHexColor('#fffec4', '#dc2626', intensity)

      return {
        backgroundColor,
        color: Math.abs(numberValue) >= 28 ? '#ffffff' : '#374151',
      }
    },
    getMonthlyReturnTooltip(row, cell) {
      const value = cell && cell.value
      const benchmarkValue = cell && cell.benchmarkValue
      const display = value === null || value === undefined ? '--' : `${this.formatMonthlyReturnValue(value)}%`
      if (cell && cell.hasBenchmarkValue) {
        const benchmarkDisplay = benchmarkValue === null || benchmarkValue === undefined ? '--' : `${this.formatMonthlyReturnValue(benchmarkValue)}%`
        return `${row.year} ${cell.label}: Strategy ${display} | Benchmark ${benchmarkDisplay}`
      }
      return `${row.year} ${cell.label}: ${display}`
    },
    mixHexColor(startColor, endColor, amount) {
      const start = this.parseHexColor(startColor)
      const end = this.parseHexColor(endColor)
      const ratio = Math.max(0, Math.min(1, amount))
      const mixed = start.map((channel, index) => Math.round(channel + (end[index] - channel) * ratio))
      return `rgb(${mixed[0]}, ${mixed[1]}, ${mixed[2]})`
    },
    parseHexColor(color) {
      const normalized = String(color).replace('#', '')
      return [0, 2, 4].map(index => parseInt(normalized.slice(index, index + 2), 16))
    },
  },
}
</script>

<style scoped>
.swing-strategy-dashboard {
  min-height: 100vh;
  max-width: 1400px;
  margin: 0 auto;
  padding: 32px 24px 80px;
  background: linear-gradient(135deg, #f8fafc 0%, #eef6ff 100%);
  color: #1f2937;
  font-family: Arial, Helvetica, sans-serif;
}

.swing-strategy-dashboard * {
  box-sizing: border-box;
}

.hero-panel {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 32px;
  margin-bottom: 24px;
  padding: 32px;
  border-radius: 8px;
  background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%);
  box-shadow: 0 18px 38px rgba(37, 99, 235, 0.24);
  color: #fff;
}

.hero-copy {
  min-width: 0;
}

.hero-title-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 14px;
  margin-bottom: 12px;
}

.hero-badges,
.hero-actions,
.panel-actions,
.metric-heading,
.section-title-line,
.action-heading,
.action-topline,
.metric-row,
.chart-legend {
  display: flex;
  align-items: center;
}

.hero-badges {
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  min-height: 26px;
  padding: 5px 12px;
  border-radius: 999px;
  color: #fff;
  font-size: 13px;
  font-weight: 700;
}

.status-badge.muted {
  background: rgba(255, 255, 255, 0.2);
}

.status-badge.active {
  background: rgba(52, 211, 153, 0.96);
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

.hero-panel h1 {
  margin: 0;
  font-size: 36px;
  font-weight: 700;
  letter-spacing: 0;
  line-height: 1.18;
}

.hero-panel .title-date {
  color: #dbeafe;
}

.hero-panel p {
  max-width: 880px;
  margin: 0 0 10px;
  color: #dbeafe;
  font-size: 17px;
  line-height: 1.55;
}

.hero-note {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #bfdbfe;
  font-size: 13px;
}

.hero-actions {
  flex: 0 0 220px;
  flex-direction: column;
  gap: 12px;
}

.hero-button,
.utility-button,
.tab-button,
.icon-button,
.guide-confirm,
.pagination-row button {
  border: none;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease, color 0.2s ease, transform 0.2s ease;
}

.hero-button {
  display: inline-flex;
  width: 100%;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 46px;
  padding: 0 18px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 700;
}

.hero-button.primary {
  background: #fff;
  box-shadow: 0 10px 22px rgba(15, 23, 42, 0.16);
  color: #2563eb;
}

.hero-button.secondary {
  border: 1px solid rgba(255, 255, 255, 0.28);
  background: rgba(255, 255, 255, 0.18);
  color: #fff;
}

.hero-button:hover {
  transform: translateY(-1px);
}

.dashboard-panel,
.data-tabs-panel {
  margin-bottom: 24px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 8px 22px rgba(15, 23, 42, 0.06);
}

.strategy-selection {
  padding: 24px;
}

.panel-heading {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 20px;
}

.panel-heading h2,
.tomorrow-panel h2,
.guide-header h2 {
  margin: 0;
  color: #111827;
  font-size: 20px;
  font-weight: 700;
  line-height: 1.3;
}

.panel-heading p {
  margin: 4px 0 0;
  color: #6b7280;
  font-size: 13px;
}

.panel-actions {
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
}

.utility-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 38px;
  padding: 0 14px;
  border: 1px solid #dbeafe;
  border-radius: 8px;
  background: #eff6ff;
  color: #1d4ed8;
  font-size: 13px;
  font-weight: 700;
}

.utility-button:disabled {
  cursor: not-allowed;
  opacity: 0.56;
}

.utility-button:not(:disabled):hover {
  background: #dbeafe;
}

.compare-chevron {
  transition: transform 0.2s ease;
}

.compare-chevron.is-open {
  transform: rotate(180deg);
}

.strategy-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
}

.strategy-card {
  position: relative;
  min-height: 118px;
  padding: 16px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
  color: #111827;
  text-align: left;
}

.strategy-card:hover {
  border-color: #cbd5e1;
  background: #f8fafc;
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.08);
}

.strategy-card.selected {
  border-color: #16a34a;
  background: #f0fdf4;
  box-shadow: 0 8px 18px rgba(22, 163, 74, 0.14);
}

.floating-badge {
  position: absolute;
  top: -10px;
  right: -8px;
  display: inline-flex;
  align-items: center;
  min-height: 22px;
  padding: 3px 8px;
  border-radius: 999px;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
}

.floating-badge.current {
  background: #16a34a;
}

.strategy-prefix {
  display: inline-flex;
  align-items: center;
  margin-bottom: 6px;
  padding: 3px 8px;
  border: 1px solid transparent;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 800;
  line-height: 1.2;
}

.strategy-prefix.tone-blue {
  color: #2563eb;
  border-color: #bfdbfe;
  background: #eff6ff;
}

.strategy-prefix.tone-green {
  color: #059669;
  border-color: #a7f3d0;
  background: #ecfdf5;
}

.strategy-prefix.tone-amber {
  color: #d97706;
  border-color: #fde68a;
  background: #fffbeb;
}

.strategy-prefix.tone-violet {
  color: #7c3aed;
  border-color: #ddd6fe;
  background: #f5f3ff;
}

.strategy-prefix.tone-rose {
  color: #e11d48;
  border-color: #fecdd3;
  background: #fff1f2;
}

.strategy-prefix.tone-indigo {
  color: #4f46e5;
  border-color: #c7d2fe;
  background: #eef2ff;
}

.strategy-prefix.tone-orange {
  color: #ea580c;
  border-color: #fed7aa;
  background: #fff7ed;
}

.strategy-prefix.tone-teal {
  color: #0f766e;
  border-color: #99f6e4;
  background: #f0fdfa;
}

.strategy-card strong {
  display: block;
  margin-bottom: 8px;
  color: #111827;
  font-size: 14px;
  line-height: 1.3;
}

/* .strategy-card span:last-child {
  display: block;
  color: #64748b;
  font-size: 12px;
  line-height: 1.35;
} */

.compare-table-wrap {
  margin-top: 24px;
}

.data-table {
  width: 100%;
  min-width: 1000px;
  border-collapse: collapse;
  text-align: left;
}

.data-table thead tr {
  border-top: 1px solid #e5e7eb;
  border-bottom: 1px solid #e5e7eb;
  background: #f8fafc;
}

.data-table th {
  padding: 12px 16px;
  color: #374151;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  white-space: nowrap;
}

.table-sort-button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font: inherit;
  text-align: left;
  text-transform: inherit;
}

.table-sort-button i {
  color: #94a3b8;
  font-size: 12px;
}

.table-sort-button:hover,
.table-sort-button.active {
  color: #1d4ed8;
}

.table-sort-button.active i {
  color: #2563eb;
}

.table-header-help {
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border: 1px solid #94a3b8;
  border-radius: 50%;
  color: #64748b;
  font-size: 11px;
  font-weight: 800;
  line-height: 1;
  text-transform: none;
}

.table-header-help .tooltip-text {
  font-weight: 600;
  text-transform: none;
}

.data-table td {
  padding: 14px 16px;
  border-bottom: 1px solid #f1f5f9;
  color: #374151;
  font-size: 13px;
  vertical-align: middle;
}

.data-table .expand-column {
  width: 42px;
  padding-right: 8px;
  text-align: center;
}

.expand-row-button {
  margin-right: 5px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border: 1px solid #dbeafe;
  border-radius: 6px;
  background: #eff6ff;
  color: #2563eb;
  cursor: pointer;
  transition: background 0.18s ease, border-color 0.18s ease, transform 0.18s ease;
}

.expand-row-button:hover,
.expand-row-button.expanded {
  border-color: #93c5fd;
  background: #dbeafe;
}

.data-table tr.highlighted,
.data-table tr.action-required {
  background: #fffbeb;
}

.data-table tbody tr:hover {
  background: #f8fafc;
}

.strong-cell {
  color: #111827;
  font-weight: 700;
}

.holding-symbol-cell {
  white-space: nowrap;
}

.holding-symbol-cell .expand-row-button {
  margin-right: 8px;
  vertical-align: middle;
}

.holding-symbol-cell span {
  vertical-align: middle;
}

.muted-cell {
  color: #64748b;
}

.data-table .holding-details-row td {
  padding: 12px 16px 16px 58px;
  background: #f8fafc;
}

.data-table tr.holding-total-row,
.data-table tr.holding-total-row:hover {
  background: #ecfdf5;
}

.data-table .holding-total-row td {
  border-top: 1px solid #86efac;
  border-bottom: 1px solid #bbf7d0;
}

.data-table .position-total-cell,
.data-table .holding-summary-cell {
  color: #111827;
  font-weight: 800;
}

.data-table .holding-summary-cell {
  text-align: left;
}

.holding-summary-highlight {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border: 1px solid #86efac;
  border-radius: 8px;
  background: #f0fdf4;
  box-shadow: 0 8px 18px rgba(22, 163, 74, 0.12);
  color: #14532d;
}

.holding-summary-metric {
  display: inline-flex;
  align-items: baseline;
  gap: 4px;
  white-space: nowrap;
}

.holding-summary-label {
  color: #166534;
  font-weight: 700;
}

.holding-summary-metric strong,
.holding-summary-divider {
  color: #15803d;
  font-weight: 800;
}

.holding-details-links {
  display: flex;
  align-items: center;
  gap: 8px;
}

.holding-detail-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 8px 10px;
  border: 1px solid #dbeafe;
  border-radius: 6px;
  background: #ffffff;
  color: #1e3a8a;
  text-decoration: none;
  transition: border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;
}

.holding-detail-link:hover {
  border-color: #60a5fa;
  box-shadow: 0 8px 18px rgba(37, 99, 235, 0.12);
  transform: translateY(-1px);
}

.holding-detail-link span {
  color: #1e3a8a;
  font-size: 13px;
  font-weight: 700;
}

.holding-detail-link strong {
  margin-left: 0;
  color: #111827;
  font-size: 13px;
}

.positive-cell,
.data-table td.positive-cell {
  color: #059669;
  font-weight: 700;
}

.negative-cell,
.data-table td.negative-cell {
  color: #e11d48;
  font-weight: 700;
}

.empty-cell {
  padding: 28px 16px;
  color: #64748b;
  text-align: center;
}

.active-strategy-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 24px;
  padding: 12px 14px;
  border: 1px solid #bbf7d0;
  border-radius: 8px;
  background: rgba(240, 253, 244, 0.9);
  box-shadow: 0 6px 16px rgba(22, 163, 74, 0.08);
}

.active-strategy-title {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.pulse-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: #16a34a;
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

.bar-label {
  color: #15803d;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
}

.active-strategy-bar h2 {
  min-width: 0;
  margin: 0;
  color: #111827;
  font-size: 18px;
  font-weight: 700;
  line-height: 1.35;
  overflow-wrap: anywhere;
}

.active-strategy-date {
  color: #15803d;
  font-size: 0.78em;
}

.capital-note {
  display: flex;
  flex: 0 1 360px;
  align-items: flex-start;
  gap: 6px;
  padding: 10px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background: #f8fafc;
  color: #475569;
  font-size: 12px;
  line-height: 1.35;
}

.capital-note strong {
  color: #334155;
  text-transform: uppercase;
}

.metric-grid {
  display: grid;
  grid-template-columns: minmax(360px, 1.55fr) repeat(3, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.metric-grid.has-note-card {
  grid-template-columns: minmax(0, 1fr) minmax(360px, 1.55fr) repeat(3, minmax(0, 1fr));
}

.metric-card {
  min-height: 154px;
  padding: 20px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.05);
  text-align: left;
}

.metric-card.clickable:hover,
.metric-card:hover {
  border-color: #bfdbfe;
  box-shadow: 0 12px 24px rgba(15, 23, 42, 0.08);
}

.metric-heading {
  gap: 8px;
  margin-bottom: 12px;
}

.metric-heading i {
  font-size: 20px;
}

.metric-heading span {
  color: #64748b;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
}

.metric-heading .metric-heading-daily-return {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
  margin-left: auto;
  min-height: 20px;
  font-size: 12px;
  font-weight: 700;
  line-height: 1;
  text-transform: none;
  white-space: nowrap;
}

.metric-heading .metric-heading-daily-return.positive-cell {
  color: #059669;
}

.metric-heading .metric-heading-daily-return.negative-cell {
  color: #e11d48;
}

.metric-heading .metric-heading-daily-return i {
  font-size: 10px;
  line-height: 1;
}

.metric-heading .metric-heading-daily-return span {
  color: inherit;
  font: inherit;
  line-height: inherit;
  text-transform: none;
}

.metric-card strong {
  display: block;
  color: #111827;
  font-size: 24px;
  line-height: 1.2;
}

.note-card {
  border-color: #e5e7eb;
  background: #ffffff;
}

.note-copy {
  margin: 0;
  color: #334155;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.45;
}

.note-copy span {
  display: block;
}

.metric-content {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
}

.metric-change,
.metric-subtle,
.metric-warning {
  display: block;
  margin-top: 8px;
  font-size: 13px;
}

.metric-subtle {
  color: #64748b;
}

.metric-warning {
  color: #d97706;
  font-weight: 700;
}

.metric-warning.clean {
  color: #059669;
}

.metric-row {
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 8px;
  margin-top: 8px;
  color: #64748b;
  font-size: 13px;
}

.trade-count {
  display: inline-flex;
  align-items: center;
  min-height: 22px;
  padding: 2px 8px;
  border-radius: 4px;
  background: #eff6ff;
  color: #2563eb;
  font-size: 12px;
  font-weight: 700;
}

.sparkline {
  width: 72px;
  height: 46px;
  flex: 0 0 72px;
}

.sparkline polyline {
  fill: none;
  stroke: #10b981;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 4;
}

.tooltip {
  position: relative;
  display: inline-flex;
  cursor: help;
}

.tooltip-text {
  position: absolute;
  bottom: 125%;
  left: 50%;
  z-index: 5;
  visibility: hidden;
  width: 240px;
  padding: 8px 12px;
  border-radius: 6px;
  background: #1e293b;
  color: #fff;
  font-size: 12px;
  line-height: 1.4;
  opacity: 0;
  text-align: left;
  transform: translateX(-50%);
  transition: opacity 0.2s ease;
}

.tooltip:hover .tooltip-text {
  visibility: visible;
  opacity: 1;
}

.tomorrow-panel {
  margin-bottom: 24px;
  padding: 24px;
  border: 2px solid #fcd34d;
  border-radius: 8px;
  background: linear-gradient(135deg, #fffbeb 0%, #fff7ed 100%);
  box-shadow: 0 8px 22px rgba(180, 83, 9, 0.1);
}

.tomorrow-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 18px;
}

.section-title-line {
  gap: 10px;
}

.section-title-line i {
  color: #d97706;
  font-size: 22px;
}

.tomorrow-panel h2 {
  color: #78350f;
}

.tomorrow-panel p {
  margin: 6px 0 0;
  color: #92400e;
  font-size: 13px;
  line-height: 1.5;
}

.cash-calculator-trigger {
  flex: 0 0 auto;
  min-height: 42px;
  padding: 0 18px;
  border: 1px solid #16a34a;
  border-radius: 8px;
  background: #16a34a;
  box-shadow: 0 10px 18px rgba(22, 163, 74, 0.18);
  color: #fff;
  cursor: pointer;
  font-family: inherit;
  font-size: 14px;
  font-weight: 700;
  white-space: nowrap;
  transition: background 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
}

.cash-calculator-trigger:hover {
  background: #15803d;
  box-shadow: 0 12px 22px rgba(22, 163, 74, 0.24);
  transform: translateY(-1px);
}

.active-strategy-setup-button {
  margin-left: auto;
}

.position-guide {
  display: flex;
  gap: 12px;
  margin-bottom: 18px;
  padding: 16px;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  background: #eff6ff;
  color: #1e40af;
}

.position-guide > i {
  margin-top: 2px;
  color: #2563eb;
  font-size: 20px;
}

.position-guide h3 {
  margin: 0 0 6px;
  color: #1e3a8a;
  font-size: 15px;
}

.formula-box {
  margin-top: 10px;
  padding: 12px;
  border: 1px solid #bfdbfe;
  border-radius: 6px;
  background: #fff;
  color: #1e3a8a;
  font-family: Consolas, "Courier New", monospace;
  font-size: 12px;
  line-height: 1.6;
}

.action-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.action-column {
  padding: 20px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
}

.action-heading {
  gap: 10px;
  margin-bottom: 14px;
}

.action-heading h3 {
  margin: 0;
  color: #111827;
  font-size: 16px;
}

.action-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 40px;
  min-height: 32px;
  padding: 4px 8px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 800;
}

.action-pill.buy {
  background: #dcfce7;
  color: #059669;
}

.action-pill.sell {
  background: #ffe4e6;
  color: #e11d48;
}

.action-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.action-item {
  padding: 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f8fafc;
}

.sell-item {
  border-left: 4px solid #f59e0b;
  background: #fffbeb;
}

.action-topline {
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.action-topline strong {
  color: #111827;
  font-size: 18px;
}

.cash-badge {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}

.cash-badge.buy {
  background: #dcfce7;
  color: #047857;
}

.cash-badge.sell {
  background: #fef3c7;
  color: #92400e;
}

.action-fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px 16px;
  margin: 0 0 12px;
}

.action-fields div {
  min-width: 0;
}

.action-fields dt,
.position-reference span {
  color: #64748b;
  font-size: 12px;
}

.action-fields dd {
  margin: 2px 0 0;
  color: #111827;
  font-size: 13px;
  font-weight: 700;
}

.position-reference {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-top: 12px;
  border-top: 1px solid #e5e7eb;
  font-size: 12px;
}

.position-reference strong {
  color: #334155;
  font-family: Consolas, "Courier New", monospace;
}

.position-reference em {
  color: #2563eb;
  font-family: Consolas, "Courier New", monospace;
  font-style: normal;
}

.empty-state {
  padding: 24px;
  border: 1px dashed #cbd5e1;
  border-radius: 8px;
  color: #64748b;
  text-align: center;
}

.tabs-nav {
  display: flex;
  border-bottom: 1px solid #e5e7eb;
  background: #f8fafc;
}

.tab-button {
  display: inline-flex;
  min-height: 54px;
  flex: 1;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 18px;
  border-bottom: 2px solid transparent;
  background: transparent;
  color: #64748b;
  font-size: 14px;
  font-weight: 700;
}

.tab-button:hover {
  color: #111827;
}

.tab-button.active {
  border-bottom-color: #2563eb;
  background: #fff;
  color: #2563eb;
}

.tab-content {
  padding: 24px;
}

.signal-with-help {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.signal-tooltip {
  color: #64748b;
}

.status-chip {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 4px 10px;
  border-radius: 999px;
  background: #dcfce7;
  color: #047857;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}

.status-chip.warning {
  background: #fef3c7;
  color: #92400e;
}

.performance-stat-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 14px;
  margin-bottom: 24px;
}

.performance-stat {
  min-height: 86px;
  padding: 16px;
  border-radius: 8px;
  background: #f8fafc;
  text-align: center;
}

.performance-stat span {
  display: block;
  margin-bottom: 8px;
  color: #374151;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
}

.performance-stat strong {
  color: #111827;
  font-size: 18px;
}

.performance-stat strong.positive-cell {
  color: #059669;
}

.performance-stat strong.negative-cell {
  color: #e11d48;
}

.charts-stack {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.chart-header {
  order: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
  margin: 0 0 14px;
}

.chart-range-presets {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-left: var(--chart-plot-left);
}

.chart-range-preset-button {
  min-width: 34px;
  height: 24px;
  padding: 0 8px;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  background: #fff;
  color: #475569;
  font-size: 11px;
  font-weight: 600;
  line-height: 1;
  cursor: pointer;
}

.chart-range-preset-button:hover {
  border-color: #94a3b8;
  background: #f8fafc;
}

.chart-range-preset-button.active {
  border-color: #2563eb;
  background: #eff6ff;
  color: #1d4ed8;
}

.chart-range-preset-button:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.14);
}

.chart-range-control {
  order: 2;
  width: var(--chart-plot-width);
  max-width: var(--chart-plot-width);
  margin: 14px var(--chart-plot-right) 8px var(--chart-plot-left);
}

.chart-range-window {
  display: block;
  margin-bottom: 5px;
  color: #64748b;
  font-size: 10px;
  font-weight: 800;
  line-height: 1.2;
  white-space: nowrap;
}

.chart-range-slider {
  position: relative;
  height: 56px;
  overflow: hidden;
  border: 1px solid #d1d5db;
  border-radius: 3px;
  background: #f8fafc;
}

.chart-range-preview {
  position: absolute;
  inset: 0;
  z-index: 1;
  width: 100%;
  height: 100%;
}

.chart-range-preview-bg {
  fill: #f8fafc;
}

.chart-range-preview-tick {
  stroke: #d1d5db;
  stroke-width: 1;
  vector-effect: non-scaling-stroke;
}

.chart-range-preview-label {
  position: absolute;
  top: 35px;
  z-index: 3;
  color: #64748b;
  font-size: 8px;
  font-weight: 400;
  line-height: 1;
  pointer-events: none;
  transform: translateX(-50%);
}

.chart-range-preview-label-start {
  transform: none;
}

.chart-range-preview-label-end {
  transform: translateX(-100%);
}

.chart-range-preview-line {
  fill: none;
  stroke: #0f4abf;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 0.8;
  vector-effect: non-scaling-stroke;
}

.chart-range-track {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 5px;
  z-index: 2;
  border-top: 1px solid #cbd5e1;
  background: #e5e7eb;
  pointer-events: none;
}

.chart-range-selection {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 5px;
  left: 0;
  z-index: 2;
  border-right: 1px solid rgba(37, 99, 235, 0.35);
  border-left: 1px solid rgba(37, 99, 235, 0.35);
  background: rgba(37, 99, 235, 0.18);
  pointer-events: none;
}

.chart-range-handle {
  position: absolute;
  top: 10px;
  width: 10px;
  height: 34px;
  margin-left: -5px;
  z-index: 4;
  border: 1px solid #94a3b8;
  border-radius: 2px;
  background: #fff;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.18);
  pointer-events: none;
}

.chart-range-handle::before,
.chart-range-handle::after {
  content: '';
  position: absolute;
  top: 8px;
  bottom: 8px;
  width: 1px;
  background: #64748b;
}

.chart-range-handle::before {
  left: 3px;
}

.chart-range-handle::after {
  right: 3px;
}

.chart-range-input {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 56px;
  margin: 0;
  background: transparent;
  cursor: pointer;
  opacity: 0;
  pointer-events: none;
  z-index: 5;
  -webkit-appearance: none;
  appearance: none;
}

.chart-range-input::-webkit-slider-runnable-track {
  height: 56px;
  background: transparent;
}

.chart-range-input::-webkit-slider-thumb {
  width: 20px;
  height: 56px;
  border: 0;
  border-radius: 0;
  background: transparent;
  pointer-events: auto;
  -webkit-appearance: none;
  appearance: none;
}

.chart-range-input::-moz-range-track {
  height: 56px;
  background: transparent;
}

.chart-range-input::-moz-range-thumb {
  width: 20px;
  height: 56px;
  border: 0;
  border-radius: 0;
  background: transparent;
  pointer-events: auto;
}

.chart-range-slider:focus-within {
  border-color: #60a5fa;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
}

.chart-range-input:focus-visible {
  outline: none;
}

.chart-block {
  --chart-plot-left: 5.8%;
  --chart-plot-right: 2%;
  --chart-plot-width: 92.2%;

  display: flex;
  flex-direction: column;
  padding: 22px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
}

.chart-block h3 {
  order: 0;
  margin: 0 0 18px;
  color: #111827;
  font-size: 16px;
  font-weight: 700;
  text-align: center;
}

.chart-block .chart-header h3 {
  width: 100%;
  margin: 0;
}

.line-chart,
.chart-image {
  order: 1;
  display: block;
  width: 100%;
  height: 280px;
}

.line-chart.cumulative-return-chart,
.line-chart.drawdown-chart {
  height: 480px;
}

.chart-image {
  object-fit: contain;
}

.axis-line {
  stroke: #d1d5db;
  stroke-width: 1;
}

.grid-line {
  stroke: #e5e7eb;
  stroke-width: 1;
}

.axis-label {
  fill: #64748b;
  font-size: 8px;
}

.y-label {
  text-anchor: end;
}

.x-label {
  text-anchor: middle;
}

.x-label-start {
  text-anchor: start;
}

.x-label-end {
  text-anchor: end;
}

.x-label-middle {
  text-anchor: middle;
}

.x-grid-line {
  stroke: #edf2f7;
}

.chart-hover-layer {
  pointer-events: none;
}

.chart-hover-line {
  stroke: #94a3b8;
  stroke-dasharray: 5 5;
  stroke-width: 1.5;
}

.chart-hover-dot {
  fill: #fff;
  stroke-width: 3;
}

.benchmark-dot {
  stroke: #9ca3af;
}

.strategy-dot {
  stroke: #2563eb;
}

.drawdown-dot {
  stroke: #ef4444;
}

.chart-tooltip-box {
  fill: rgba(15, 23, 42, 0.92);
  stroke: rgba(255, 255, 255, 0.22);
  stroke-width: 1;
}

.chart-tooltip-date {
  fill: #fff;
  font-size: 12px;
  font-weight: 700;
}

.chart-tooltip-label {
  font-size: 11px;
  font-weight: 700;
}

.benchmark-tooltip-label {
  fill: #d1d5db;
}

.strategy-tooltip-label {
  fill: #93c5fd;
}

.drawdown-tooltip-label {
  fill: #fca5a5;
}

.chart-hover-capture {
  fill: transparent;
  pointer-events: all;
}

.benchmark-line,
.strategy-line,
.drawdown-line {
  fill: none;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 3;
}

.benchmark-line {
  stroke: #9ca3af;
}

.strategy-line {
  stroke: #2563eb;
}

.drawdown-line {
  stroke: #ef4444;
}

.chart-legend {
  order: 3;
  justify-content: center;
  gap: 18px;
  margin-top: 12px;
  color: #64748b;
  font-size: 12px;
}

.legend-swatch {
  display: inline-block;
  width: 10px;
  height: 10px;
  margin-right: 6px;
  border-radius: 2px;
}

.legend-swatch.benchmark {
  background: #9ca3af;
}

.legend-swatch.strategy {
  background: #2563eb;
}

.legend-swatch.drawdown {
  background: #ef4444;
}

.monthly-chart {
  overflow-x: hidden;
  padding: 8px 0 4px;
}

.monthly-return-table {
  width: 100%;
  height: auto;
  /* min-width: 1280px; */
  border-collapse: collapse;
  table-layout: fixed;
}

.monthly-return-table th,
.monthly-return-table td {
  height: 56px;
  border: 2px solid #fff;
  text-align: center;
  vertical-align: middle;
}

.monthly-return-table thead th {
  height: 34px;
  background: #f8fafc;
  color: #334155;
  font-size: 12px;
  font-weight: 700;
}

.monthly-year-heading,
.monthly-year-cell {
  position: sticky;
  left: 0;
  z-index: 2;
  width: 72px;
  background: #fff;
}

.monthly-year-cell {
  color: #334155;
  font-size: 12px;
  font-weight: 700;
}

.monthly-return-cell {
  position: relative;
  overflow: hidden;
  padding: 0;
  min-width: 72px;
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
  white-space: nowrap;
  transition: transform 0.12s ease, box-shadow 0.12s ease;
}

.monthly-return-cell-split::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 1;
  background:
    linear-gradient(
      to bottom right,
      transparent calc(50% - 0.75px),
      rgba(15, 23, 42, 0.32) calc(50% - 0.75px),
      rgba(15, 23, 42, 0.32) calc(50% + 0.75px),
      transparent calc(50% + 0.75px)
    );
  pointer-events: none;
}

.monthly-return-split,
.monthly-return-single {
  position: relative;
  z-index: 2;
  box-sizing: border-box;
  width: 100%;
  min-height: 54px;
}

.monthly-return-single {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
}

.monthly-return-value {
  position: absolute;
  display: block;
  max-width: calc(100% - 16px);
  overflow: hidden;
  text-overflow: ellipsis;
}

.monthly-return-strategy {
  top: 8px;
  left: 8px;
  text-align: left;
}

.monthly-return-benchmark {
  right: 8px;
  bottom: 8px;
  text-align: right;
}

.monthly-return-cell:hover {
  position: relative;
  z-index: 3;
  border-radius: 8px;
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.3);
  transform: scale(1.04);
}

.pagination-row {
  display: grid;
  grid-template-columns: minmax(180px, 1fr) auto minmax(180px, 1fr);
  align-items: center;
  gap: 12px;
  margin-top: 16px;
  color: #64748b;
  font-size: 13px;
}

.pagination-controls,
.history-page-jump {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.history-page-jump {
  justify-self: start;
}

.history-page-shortcuts {
  justify-self: center;
}

.pagination-controls {
  justify-self: end;
}

.history-page-shortcuts {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
  justify-content: center;
}

.pagination-status {
  padding: 0 4px;
  white-space: nowrap;
}

.pagination-row button {
  min-height: 30px;
  padding: 0 12px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: #fff;
  color: #334155;
  font-weight: 700;
}

.history-toolbar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 12px;
}

.history-download-button {
  display: inline-flex;
  min-height: 34px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 14px;
  border: 1px solid #2563eb;
  border-radius: 6px;
  background: #2563eb;
  color: #fff;
  cursor: pointer;
  font-family: inherit;
  font-size: 13px;
  font-weight: 700;
  transition: background 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease, color 0.2s ease, transform 0.2s ease;
}

.history-download-button:hover:not(:disabled) {
  background: #1d4ed8;
  border-color: #1d4ed8;
  box-shadow: 0 8px 18px rgba(37, 99, 235, 0.22);
  transform: translateY(-1px);
}

.history-download-button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.pagination-row button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.pagination-row .page-shortcut {
  min-width: 30px;
  padding: 0 8px;
}

.pagination-row .page-shortcut.active {
  border-color: #5b9bd1;
  background: #eff6ff;
  color: #2563eb;
}

.page-ellipsis {
  padding: 0 6px;
  color: #64748b;
  font-weight: 700;
}

.history-page-jump label {
  color: #475569;
  font-weight: 700;
  white-space: nowrap;
}

.history-page-jump input {
  width: 76px;
  min-height: 30px;
  padding: 0 8px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  color: #0f172a;
  font: inherit;
  font-weight: 700;
}

.history-page-jump input:focus {
  border-color: #5b9bd1;
  box-shadow: 0 0 0 2px rgba(91, 155, 209, 0.18);
  outline: none;
}

.parameter-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 24px;
}

.parameter-section {
  padding: 20px;
  border-radius: 8px;
  background: #f8fafc;
}

.parameter-section h3 {
  margin: 0 0 16px;
  color: #111827;
  font-size: 16px;
  font-weight: 700;
}

.parameter-section dl {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 0;
}

.parameter-section dl div {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.parameter-section dt {
  color: #64748b;
  font-size: 13px;
}

.parameter-section dd {
  margin: 0;
  color: #111827;
  font-size: 13px;
  font-weight: 700;
  text-align: right;
}

.follower-note {
  margin-top: 24px;
  padding: 16px;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  background: #eff6ff;
  color: #1e40af;
}

.follower-note h4 {
  margin: 0 0 8px;
  color: #1e3a8a;
  font-size: 15px;
}

.follower-note ul {
  margin: 0;
  padding-left: 18px;
  font-size: 13px;
  line-height: 1.7;
}

.dashboard-footer {
  color: #64748b;
  font-size: 13px;
  text-align: center;
}

.dashboard-footer p {
  margin: 0 0 5px;
}

.guide-modal {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(15, 23, 42, 0.56);
}

.guide-panel {
  width: min(640px, 100%);
  max-height: 90vh;
  overflow-y: auto;
  padding: 28px;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 24px 70px rgba(15, 23, 42, 0.28);
}

.share-calculator-panel {
  width: min(760px, 100%);
}

.share-calculator-panel .guide-header {
  align-items: flex-start;
  margin-bottom: 20px;
}

.share-calculator-panel .guide-header p {
  margin: 6px 0 0;
  color: #64748b;
  font-size: 14px;
  font-weight: 700;
}

.share-calculator-form {
  margin-bottom: 18px;
  padding: 16px;
  border: 1px solid #dbeafe;
  border-radius: 8px;
  background: #f8fafc;
}

.share-calculator-form label {
  display: block;
  margin-bottom: 8px;
  color: #334155;
  font-size: 13px;
  font-weight: 700;
}

.share-calculator-input-row {
  display: flex;
  gap: 10px;
}

.share-calculator-input-row input {
  flex: 1 1 auto;
  min-height: 42px;
  padding: 0 12px;
  border: 1px solid #bfdbfe;
  border-radius: 6px;
  background: #fff;
  color: #111827;
  font-size: 15px;
}

.share-calculator-input-row input:focus {
  border-color: #5b9bd1;
  outline: none;
  box-shadow: 0 0 0 3px rgba(91, 155, 209, 0.16);
}

.share-calculator-input-row button {
  flex: 0 0 auto;
  min-height: 42px;
  padding: 0 16px;
  border: 0;
  border-radius: 6px;
  background: #16a34a;
  color: #fff;
  cursor: pointer;
  font-family: inherit;
  font-size: 14px;
  font-weight: 700;
}

.share-calculator-input-row button:disabled {
  cursor: not-allowed;
  background: #94a3b8;
}

.share-calculator-result {
  margin: 0 0 12px;
  color: #334155;
  font-size: 14px;
  font-weight: 700;
}

.share-calculator-empty {
  margin: 0;
  padding: 18px;
  border: 1px dashed #cbd5e1;
  border-radius: 8px;
  background: #f8fafc;
  color: #64748b;
  font-size: 14px;
  font-weight: 700;
  text-align: center;
}

.share-calculator-table-wrap {
  overflow-x: auto;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.share-calculator-table {
  width: 100%;
  min-width: 520px;
}

.share-calculator-table th:last-child,
.share-calculator-table td:last-child {
  text-align: right;
}

.share-calculator-total-row {
  display: flex;
  justify-content: flex-end;
  gap: 24px;
  padding: 12px 16px;
  background: var(--app-surface-muted);
  border: 1px solid var(--app-border);
  border-top: 0;
  font-weight: 800;
}

.share-calculator-total-row strong {
  min-width: 120px;
  text-align: right;
}

.guide-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 28px;
}

.guide-header h2 {
  display: flex;
  align-items: center;
  gap: 8px;
}

.icon-button {
  display: inline-flex;
  width: 34px;
  height: 34px;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  background: transparent;
  color: #64748b;
  font-size: 16px;
}

.icon-button:hover {
  background: #f1f5f9;
  color: #111827;
}

.guide-steps {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.guide-step {
  display: flex;
  gap: 16px;
}

.guide-step > span {
  display: inline-flex;
  width: 40px;
  height: 40px;
  flex: 0 0 40px;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: #dbeafe;
  color: #2563eb;
  font-size: 17px;
  font-weight: 800;
}

.guide-step h3 {
  margin: 0 0 6px;
  color: #111827;
  font-size: 17px;
  font-weight: 700;
}

.guide-step p {
  margin: 0;
  color: #64748b;
  font-size: 14px;
  line-height: 1.6;
}

.guide-confirm {
  width: 100%;
  min-height: 46px;
  margin-top: 28px;
  border-radius: 8px;
  background: #2563eb;
  color: #fff;
  font-size: 15px;
  font-weight: 700;
}

.guide-confirm:hover {
  background: #1d4ed8;
}

.faq-section {
  margin-top: 28px;
  padding-top: 20px;
  border-top: 1px solid #e5e7eb;
}

.faq-title {
  margin: 0 0 16px;
  color: #111827;
  font-size: 17px;
  font-weight: 700;
}

.faq-item {
  border-bottom: 1px solid #f1f5f9;
  padding: 0;
}

.faq-item:last-of-type {
  border-bottom: none;
}

.faq-question {
  display: flex;
  align-items: center;
  padding: 12px 0;
  color: #1e3a8a;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  list-style: none;
  line-height: 1.4;
}

.faq-question::-webkit-details-marker {
  display: none;
}

.faq-question::before {
  content: '+';
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  margin-right: 10px;
  border-radius: 50%;
  background: #eff6ff;
  color: #2563eb;
  font-size: 14px;
  font-weight: 700;
  flex-shrink: 0;
  transition: transform 0.2s ease;
}

details[open] .faq-question::before {
  content: '-';
  background: #dbeafe;
}

.faq-answer {
  padding: 0 0 14px 30px;
  color: #475569;
  font-size: 13px;
  line-height: 1.65;
}

/* Visual parity with swing_trading_strategy_dashboard (7).html */
.swing-strategy-dashboard {
  box-sizing: border-box;
  width: auto;
  max-width: 1400px;
  margin: 0 auto;
  padding: 32px 24px;
  background: linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%);
  color: #1f2937;
  font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.swing-strategy-dashboard > section,
.swing-strategy-dashboard > footer {
  width: 100%;
  max-width: none;
  margin-right: 0;
  margin-left: 0;
}

.emoji-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.hero-panel {
  gap: 24px;
  margin-bottom: 32px;
  padding: 32px;
  border-radius: 16px;
  background: linear-gradient(90deg, #2563eb 0%, #4f46e5 100%);
  box-shadow: 0 20px 25px -5px rgba(15, 23, 42, 0.18), 0 8px 10px -6px rgba(15, 23, 42, 0.16);
}

.hero-badges {
  gap: 8px;
  margin-bottom: 12px;
}

.status-badge {
  min-height: 28px;
  padding: 4px 12px;
  border-radius: 9999px;
  font-size: 14px;
  font-weight: 600;
}

.status-badge.muted {
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(4px);
}

.status-badge.active {
  background: rgba(52, 211, 153, 0.9);
}

.hero-panel h1 {
  margin: 0;
  font-size: 36px;
  font-weight: 700;
  line-height: 1.25;
}

.hero-panel p {
  margin-bottom: 8px;
  color: #dbeafe;
  font-size: 18px;
  line-height: 1.625;
}

.hero-note {
  gap: 6px;
  color: #bfdbfe;
  font-size: 14px;
}

.hero-copy > p {
  max-width: none;
}

.hero-text-link {
  color: #fff;
  font-weight: 700;
  text-decoration: none;
}

.hero-text-link span {
  font-weight: 400;
}

.hero-text-link:hover {
  text-decoration: underline;
}

.hero-note strong,
.hero-disclaimer strong {
  color: #fff;
  font-weight: 800;
}

.hero-schedule {
  flex-wrap: wrap;
  row-gap: 4px;
  margin-top: 2px;
}

.hero-separator {
  margin: 0 8px;
  color: rgba(219, 234, 254, 0.66);
}

.hero-disclaimer {
  margin-top: 24px;
  padding: 18px 26px;
  border-left: 4px solid #facc15;
  border-radius: 8px;
  background: rgba(30, 58, 138, 0.42);
  color: #dbeafe;
}

.hero-disclaimer p {
  max-width: none;
  margin: 0;
  color: #dbeafe;
  font-size: 14px;
  line-height: 1.6;
}

.hero-disclaimer p + p {
  margin-top: 4px;
}

.hero-actions {
  flex: 0 0 auto;
  gap: 12px;
}

.hero-button {
  min-height: 48px;
  padding: 0 24px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
}

.hero-button.primary {
  box-shadow: 0 10px 15px -3px rgba(15, 23, 42, 0.18), 0 4px 6px -4px rgba(15, 23, 42, 0.16);
}

.hero-button.primary:hover {
  box-shadow: 0 20px 25px -5px rgba(15, 23, 42, 0.18), 0 8px 10px -6px rgba(15, 23, 42, 0.14);
  transform: scale(1.05);
}

.hero-button.secondary {
  border-color: transparent;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(4px);
}

.hero-button.secondary:hover {
  background: rgba(255, 255, 255, 0.3);
}

.dashboard-panel,
.data-tabs-panel {
  margin-bottom: 24px;
  border-color: #e5e7eb;
  border-radius: 12px;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.05);
}

.strategy-selection {
  padding: 24px;
}

.panel-heading {
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 20px;
}

.panel-heading h2,
.tomorrow-panel h2,
.guide-header h2 {
  font-size: 20px;
  line-height: 1.4;
}

.panel-heading p {
  margin-top: 4px;
  color: #6b7280;
  font-size: 14px;
}

.panel-actions {
  align-items: center;
  gap: 12px;
}

.utility-button {
  min-height: 40px;
  padding: 0 16px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
}

.utility-button:first-child {
  border-color: #dbeafe;
  background: #eff6ff;
  color: #1d4ed8;
}

.utility-button:first-child:not(:disabled):hover {
  background: #dbeafe;
}

.strategy-grid {
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.strategy-card {
  min-height: 0;
  padding: 16px;
  border-color: #e5e7eb;
  border-radius: 12px;
  box-shadow: none;
  transition: background-color 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
}

.strategy-card:hover {
  border-color: #d1d5db;
  background: #f9fafb;
  box-shadow: none;
}

.strategy-card.selected {
  border-color: #16a34a;
  background: #f0fdf4;
  box-shadow: 0 1px 2px rgba(22, 163, 74, 0.12);
}

.floating-badge {
  top: -8px;
  right: -8px;
  min-height: 22px;
  padding: 4px 8px;
  font-size: 12px;
  font-weight: 700;
}

.strategy-prefix {
  margin-bottom: 4px;
  padding: 4px 9px;
  font-size: 12px;
  font-weight: 800;
  line-height: 1.35;
}

.strategy-card strong {
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 700;
  line-height: 1.25;
}

.strategy-card > span:last-child {
  color: #4b5563;
  font-size: 12px;
}

.compare-table-wrap {
  margin-top: 24px;
}

.data-table th {
  padding: 12px 16px;
  color: #374151;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.35;
}

.data-table td {
  padding: 12px 16px;
  color: #374151;
  font-size: 14px;
  line-height: 1.45;
}

.history-table {
  width: 100%;
  min-width: 0;
  table-layout: fixed;
}

.history-table th,
.history-table td {
  padding-right: 10px;
  padding-left: 10px;
  white-space: normal;
}

.history-table th {
  line-height: 1.25;
  overflow-wrap: anywhere;
}

.history-table td {
  overflow-wrap: anywhere;
  word-break: normal;
}

.history-table .signal-with-help {
  display: inline;
  white-space: normal;
}

.history-table .signal-tooltip {
  display: inline-flex;
  margin-left: 4px;
  vertical-align: middle;
}

.history-table th:nth-child(1),
.history-table td:nth-child(1) {
  width: 5%;
  text-align: center;
}

.history-table th:nth-child(2),
.history-table td:nth-child(2) {
  width: 10%;
}

.history-table th:nth-child(3),
.history-table td:nth-child(3),
.history-table th:nth-child(5),
.history-table td:nth-child(5) {
  width: 10%;
}

.history-table th:nth-child(4),
.history-table td:nth-child(4),
.history-table th:nth-child(6),
.history-table td:nth-child(6) {
  width: 10%;
}

.history-table th:nth-child(7),
.history-table td:nth-child(7) {
  width: 9%;
}

.history-table th:nth-child(8),
.history-table td:nth-child(8) {
  width: 15%;
}

.history-table th:nth-child(9),
.history-table td:nth-child(9) {
}

.history-table th:nth-child(10),
.history-table td:nth-child(10) {
  width: 10%;
  min-width: 120px;
  text-align: right;
  white-space: nowrap;
}

.holdings-table {
  width: 100%;
  min-width: 0;
  table-layout: fixed;
}

.holdings-table th,
.holdings-table td {
  padding: 10px 8px;
  font-size: 12px;
  line-height: 1.3;
  overflow-wrap: anywhere;
}

.holdings-table th {
  white-space: normal;
}

.holdings-table .table-sort-button {
  align-items: flex-start;
  gap: 4px;
  line-height: 1.2;
}

.holdings-table .table-sort-button i {
  flex: 0 0 auto;
  margin-top: 1px;
}

.holdings-table .holding-status-cell {
  padding-left: 6px;
  white-space: nowrap;
}

.holdings-table .expand-row-button {
  width: 22px;
  height: 22px;
  margin-right: 3px;
}

.holdings-table .status-chip {
  max-width: calc(100% - 28px);
  padding: 3px 7px;
  font-size: 11px;
  line-height: 1.15;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.holdings-table .signal-with-help {
  gap: 4px;
}

.holdings-table th:nth-child(1),
.holdings-table td:nth-child(1) {
  width: 16%;
}

.holdings-table th:nth-child(2),
.holdings-table td:nth-child(2) {
  width: 8%;
}

.holdings-table th:nth-child(3),
.holdings-table td:nth-child(3) {
  width: 9%;
}

.holdings-table th:nth-child(4),
.holdings-table td:nth-child(4),
.holdings-table th:nth-child(5),
.holdings-table td:nth-child(5) {
  width: 7.5%;
}

.holdings-table th:nth-child(6),
.holdings-table td:nth-child(6),
.holdings-table th:nth-child(7),
.holdings-table td:nth-child(7) {
  width: 9.5%;
}

.holdings-table th:nth-child(8),
.holdings-table td:nth-child(8),
.holdings-table th:nth-child(9),
.holdings-table td:nth-child(9) {
  width: 6.5%;
}

.holdings-table th:nth-child(10),
.holdings-table td:nth-child(10) {
  width: 7%;
}

.holdings-table th:nth-child(11),
.holdings-table td:nth-child(11) {
  width: 13%;
}

.compare-table tr.highlighted {
  background: #eff6ff;
  font-weight: 500;
}

.holdings-table tr.action-required {
  background: #fffbeb;
}

.holdings-table tr.action-required:hover {
  background: #fef3c7;
}

.data-table tbody tr:hover {
  background: #f9fafb;
}

.active-strategy-bar {
  gap: 12px;
  margin-bottom: 24px;
  padding: 12px;
  border-color: #bbf7d0;
  border-radius: 8px;
  background: rgba(240, 253, 244, 0.86);
  box-shadow: 0 1px 2px rgba(22, 163, 74, 0.1);
}

.active-strategy-title {
  gap: 12px;
}

.bar-label {
  color: #15803d;
  font-size: 12px;
  letter-spacing: 0.05em;
}

.active-strategy-bar h2 {
  font-size: 18px;
  line-height: 1.4;
}

.capital-note {
  flex: 0 0 auto;
  max-width: 360px;
  padding: 8px 12px;
  border-color: #e2e8f0;
  border-radius: 6px;
  background: #f8fafc;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.05);
}

.capital-note strong {
  letter-spacing: 0.05em;
}

.metric-grid {
  gap: 16px;
  margin-bottom: 32px;
}

.metric-grid.has-note-card {
  grid-template-columns: minmax(0, 1fr) minmax(360px, 1.55fr) repeat(3, minmax(0, 1fr));
}

.metric-card {
  min-height: 0;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.05);
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.metric-card:hover,
.metric-card.clickable:hover {
  border-color: #86efac;
  box-shadow: 0 4px 6px -1px rgba(15, 23, 42, 0.1), 0 2px 4px -2px rgba(15, 23, 42, 0.1);
}

.metric-card.clickable:focus {
  outline: 2px solid #16a34a;
  outline-offset: 2px;
}

.metric-heading {
  gap: 8px;
  margin-bottom: 8px;
}

.metric-heading > span:last-child:not(.metric-heading-daily-return) {
  color: #6b7280;
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 0.025em;
}

.metric-emoji,
.section-emoji {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  line-height: 1;
}

.metric-card strong {
  font-size: 24px;
  line-height: 1.25;
}

.metric-change,
.metric-subtle,
.metric-warning {
  margin-top: 4px;
  font-size: 14px;
}

.metric-content {
  align-items: flex-end;
}

.sparkline {
  width: 64px;
  height: 50px;
  flex-basis: 64px;
  margin-left: 8px;
}

.sparkline polyline {
  stroke-width: 3;
}Top Picks

.trade-count {
  min-height: 20px;
  padding: 2px 8px;
  border-radius: 4px;
}

.tomorrow-panel {
  margin-bottom: 32px;
  padding: 24px;
  border-color: #fde68a;
  border-radius: 12px;
  background: linear-gradient(90deg, #fffbeb 0%, #fff7ed 100%);
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.05);
}

.tomorrow-heading {
  margin-bottom: 20px;
}

.cash-calculator-trigger {
  border-radius: 8px;
}

.section-title-line {
  gap: 8px;
  margin-bottom: 8px;
}

.tomorrow-panel h2 {
  color: #78350f;
}

.tomorrow-panel p {
  margin: 0;
  color: #b45309;
  font-size: 14px;
}

.position-guide {
  gap: 12px;
  margin-top: 20px;
  padding: 16px;
  border-color: #bfdbfe;
  border-radius: 8px;
  background: #eff6ff;
  color: #1e40af;
}

.guide-emoji {
  flex: 0 0 auto;
  font-size: 20px;
  line-height: 1;
}

.position-guide > div {
  flex: 1;
  min-width: 0;
}

.position-guide h3 {
  margin-bottom: 8px;
  color: #1e3a8a;
  font-size: 16px;
}

.position-guide p {
  margin-bottom: 12px;
  color: #1e40af;
  font-size: 14px;
  line-height: 1.5;
}

.formula-box {
  margin-top: 0;
  padding: 12px;
  border-color: #bfdbfe;
  border-radius: 4px;
  color: #1e3a8a;
  font-size: 14px;
  line-height: 1.5;
}

.action-grid {
  gap: 16px;
}

.action-column {
  padding: 20px;
  border-radius: 8px;
}

.action-heading {
  gap: 8px;
  margin-bottom: 16px;
}

.action-heading h3 {
  font-size: 16px;
}

.action-pill {
  width: 32px;
  min-width: 32px;
  height: 32px;
  min-height: 32px;
  padding: 0;
  font-size: 12px;
}

.action-item {
  padding: 16px;
  border-radius: 8px;
  background: #f9fafb;
}

.sell-item {
  border: 0;
  border-left: 4px solid #f59e0b;
  background: #fffbeb;
}

.action-topline {
  margin-bottom: 12px;
}

.action-topline strong {
  font-size: 18px;
}

.cash-badge {
  padding: 4px 12px;
}

.action-fields {
  gap: 12px;
}

.action-fields dt,
.position-reference span {
  color: #6b7280;
  font-size: 14px;
}

.action-fields dt {
  display: inline;
}

.action-fields dd {
  display: inline;
  margin-left: 4px;
  font-size: 14px;
}

.position-reference {
  padding-top: 12px;
}

.position-reference strong {
  color: #374151;
  font-size: 14px;
}

.position-reference em {
  margin-top: 4px;
  color: #2563eb;
  font-size: 12px;
}

.data-tabs-panel {
  overflow: visible;
}

.tabs-nav {
  overflow: hidden;
  border-radius: 8px 8px 0 0;
}

.data-tabs-panel .tooltip-text {
  z-index: 30;
}

.tab-button {
  min-height: 58px;
  padding: 0 24px;
  font-size: 16px;
  font-weight: 500;
}

.tab-button.active {
  font-weight: 600;
}

.tab-content {
  padding: 24px;
}

.status-chip {
  padding: 4px 12px;
  font-size: 12px;
}

.performance-stat-grid {
  gap: 16px;
  margin-bottom: 32px;
}

.performance-stat {
  min-height: 0;
  padding: 16px;
  border-radius: 8px;
}

.performance-stat span {
  margin-bottom: 4px;
}

.performance-stat strong {
  font-size: 18px;
}

.charts-stack {
  gap: 32px;
}

.chart-block {
  padding: 24px;
  border-radius: 8px;
}

.chart-block h3 {
  margin-bottom: 16px;
  font-weight: 600;
}

.line-chart,
.chart-image {
  height: 320px;
}

.monthly-chart {
  min-height: 0;
}

.history-placeholder {
  margin: 0;
  padding: 32px 0;
  color: #6b7280;
  font-size: 16px;
  text-align: center;
}

.parameter-grid {
  gap: 24px;
}

.parameter-section {
  padding: 20px;
  border-radius: 8px;
  background: #f9fafb;
}

.parameter-section h3 {
  margin-bottom: 16px;
}

.parameter-section dl {
  gap: 12px;
}

.parameter-section dt,
.parameter-section dd {
  font-size: 14px;
}

.follower-note {
  margin-top: 24px;
  padding: 16px;
  border-color: #bfdbfe;
  border-radius: 8px;
  background: #eff6ff;
}

.follower-note h4 {
  color: #1e3a8a;
  font-size: 16px;
}

.follower-note ul {
  color: #1e40af;
  font-size: 14px;
}

.dashboard-footer {
  margin-top: 32px;
  color: #6b7280;
  font-size: 14px;
}

.dashboard-footer p + p {
  margin-top: 4px;
}

.guide-modal {
  z-index: 100;
  background: rgba(17, 24, 39, 0.5);
  backdrop-filter: blur(4px);
}

.guide-panel {
  width: min(640px, calc(100% - 32px));
  padding: 32px;
  border-radius: 16px;
  box-shadow: 0 25px 50px -12px rgba(15, 23, 42, 0.35);
}

.share-calculator-panel {
  width: min(760px, calc(100% - 32px));
}

.guide-header {
  margin-bottom: 32px;
}

.guide-header h2 {
  font-size: 24px;
}

.guide-steps {
  gap: 32px;
}

.guide-step h3 {
  margin-bottom: 6px;
  font-size: 18px;
}

.guide-step p {
  color: #4b5563;
  font-size: 15px;
  line-height: 1.625;
}

.guide-confirm {
  min-height: 52px;
  margin-top: 40px;
  border-radius: 12px;
  font-size: 16px;
}
/* Signal Tag 容器布局 */
.signal-tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: flex-end; /* 右对齐以匹配你的 DD 布局，若在左侧可改为 flex-start */
  max-width: 320px; /* 控制最大宽度，避免过于分散 */
}

/* 胶囊标签基础样式 */
.signal-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border-radius: 6px;
  font-size: 12px;
  line-height: 1.3;
  transition: all 0.15s ease;
}
/* 标签内的 Tooltip 问号图标调整 */
.signal-tag .signal-tooltip {
  color: #3b82f6;
  font-size: 11px;
}
.swing-strategy-dashboard {
  font-weight: 600;
}
.share-calculator-subtitle {
  margin: 10px 0;
}
.share-calculator-subtitle span {
  color: #1e3a8a;
}
.share-calculator-actions {
    margin-top: 18px;
    text-align: center;
}
.save-email-button {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    min-height: 44px;
    padding: 0 24px;
    border: none;
    border-radius: 8px;
    background: #2563eb;
    color: #fff;
    cursor: pointer;
    font-family: inherit;
    font-size: 14px;
    font-weight: 700;
    transition: background 0.2s ease, transform 0.15s ease;
}
.save-email-button:disabled {
    cursor: not-allowed;
    background: #94a3b8;
    transform: none;
}
.save-email-note {
    margin: 18px 18px;
    color: #64748b;
    font-size: 12px;
}

.email-setup-confirm-modal {
  z-index: 1010;
}

.email-setup-confirm-panel {
  width: min(860px, calc(100% - 32px));
}

.email-setup-confirm-panel .guide-header {
  margin-bottom: 20px;
}

.email-setup-confirm-panel .guide-header p {
  margin: 6px 0 0;
  color: #64748b;
  font-size: 14px;
  font-weight: 700;
}

.email-setup-summary {
  display: grid;
  gap: 10px;
  margin: 0 0 18px;
}

.email-setup-summary div {
  display: grid;
  grid-template-columns: 150px minmax(0, 1fr);
  gap: 14px;
  align-items: center;
  padding: 12px 14px;
  border: 1px solid #dbeafe;
  border-radius: 8px;
  background: #f8fafc;
}

.email-setup-summary dt {
  color: #475569;
  font-size: 12px;
  text-transform: uppercase;
}

.email-setup-summary dd {
  min-width: 0;
  margin: 0;
  color: #0f172a;
  font-size: 14px;
  overflow-wrap: anywhere;
}

.email-setup-email-input {
  width: 100%;
  min-height: 38px;
  padding: 0 10px;
  border: 1px solid #bfdbfe;
  border-radius: 6px;
  background: #fff;
  color: #0f172a;
  font-family: inherit;
  font-size: 14px;
}

.email-setup-email-input:focus {
  border-color: #2563eb;
  outline: none;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.14);
}

.email-setup-confirm-check {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 14px;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  background: #eff6ff;
  color: #1e3a8a;
  cursor: pointer;
  font-size: 13px;
  line-height: 1.5;
}

.email-setup-confirm-check input {
  width: 18px;
  height: 18px;
  flex: 0 0 auto;
  margin-top: 2px;
  cursor: pointer;
}

.email-setup-confirm-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 22px;
}

.email-setup-cancel-button {
  min-height: 44px;
  padding: 0 20px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: #fff;
  color: #334155;
  cursor: pointer;
  font-family: inherit;
  font-size: 14px;
  font-weight: 700;
}

.email-setup-cancel-button:disabled,
.email-setup-confirm-primary:disabled {
  cursor: not-allowed;
}

.swing-strategy-dashboard p,
.swing-strategy-dashboard li,
.swing-strategy-dashboard td,
.swing-strategy-dashboard dt,
.swing-strategy-dashboard dd,
.swing-strategy-dashboard button,
.swing-strategy-dashboard .hero-note,
.swing-strategy-dashboard .panel-heading p,
.swing-strategy-dashboard .strategy-card span:last-child,
.swing-strategy-dashboard .capital-note,
.swing-strategy-dashboard .capital-note span,
.swing-strategy-dashboard .metric-heading > span:last-child:not(.metric-heading-daily-return),
.swing-strategy-dashboard .metric-change,
.swing-strategy-dashboard .metric-subtle,
.swing-strategy-dashboard .tooltip,
.swing-strategy-dashboard .metric-row,
.swing-strategy-dashboard .tomorrow-panel p,
.swing-strategy-dashboard .position-guide p,
.swing-strategy-dashboard .formula-box,
.swing-strategy-dashboard .action-fields dt,
.swing-strategy-dashboard .action-fields dd,
.swing-strategy-dashboard .position-reference span,
.swing-strategy-dashboard .position-reference em,
.swing-strategy-dashboard .performance-stat span,
.swing-strategy-dashboard .chart-block h3,
.swing-strategy-dashboard .chart-legend span,
.swing-strategy-dashboard .axis-label,
.swing-strategy-dashboard .history-placeholder,
.swing-strategy-dashboard .parameter-section dt,
.swing-strategy-dashboard .follower-note ul,
.swing-strategy-dashboard .follower-note li,
.swing-strategy-dashboard .dashboard-footer,
.swing-strategy-dashboard .guide-step p,
.swing-strategy-dashboard .empty-state,
.swing-strategy-dashboard .empty-cell {
  font-weight: 600;
}

.swing-strategy-dashboard .hero-button,
.swing-strategy-dashboard .utility-button,
.swing-strategy-dashboard .tab-button,
.swing-strategy-dashboard .tab-button.active,
.swing-strategy-dashboard .status-chip,
.swing-strategy-dashboard .cash-badge {
  font-weight: 700;
}

.hero-panel h1,
.panel-heading h2,
.tomorrow-panel h2,
.active-strategy-bar h2,
.strategy-card strong,
.metric-card strong,
.action-topline strong,
.action-heading h3,
.position-guide h3,
.data-table th,
.strong-cell,
.positive-cell,
.negative-cell,
.performance-stat strong,
.parameter-section h3,
.parameter-section dd,
.follower-note h4,
.guide-header h2,
.guide-step h3 {
  font-weight: 800;
}

.status-badge,
.floating-badge,
.strategy-prefix,
.metric-warning,
.trade-count,
.action-pill,
.cash-badge,
.status-chip,
.bar-label,
.guide-step > span {
  font-weight: 800;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: 0.72;
  }
}

@media (max-width: 1180px) {
  .strategy-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .metric-grid,
  .performance-stat-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .metric-grid.has-note-card {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 900px) {
  .hero-panel,
  .panel-heading,
  .active-strategy-bar,
  .tomorrow-heading {
    flex-direction: column;
  }

  .hero-actions {
    width: 100%;
    flex-basis: auto;
  }

  .capital-note {
    flex-basis: auto;
    width: 100%;
  }

  .action-grid,
  .parameter-grid {
    grid-template-columns: 1fr;
  }

  .data-table .holding-details-row td {
    padding-left: 16px;
  }

  .tabs-nav {
    overflow-x: auto;
  }

  .tab-button {
    min-width: 190px;
  }

  .cash-calculator-trigger {
    width: 100%;
  }

  .active-strategy-setup-button {
    margin-left: 0;
  }

  .share-calculator-input-row {
    flex-direction: column;
  }

  .share-calculator-input-row button {
    width: 100%;
  }

  .email-setup-summary div {
    grid-template-columns: 1fr;
    gap: 6px;
  }

  .email-setup-confirm-actions {
    flex-direction: column-reverse;
  }

  .email-setup-cancel-button,
  .email-setup-confirm-primary {
    width: 100%;
    justify-content: center;
  }
}

@media (max-width: 640px) {
  .swing-strategy-dashboard {
    padding: 20px 14px 64px;
  }

  .hero-panel {
    padding: 24px 18px;
  }

  .hero-panel h1 {
    font-size: 28px;
  }

  .hero-panel p {
    font-size: 15px;
  }

  .strategy-selection,
  .tomorrow-panel,
  .tab-content {
    padding: 16px;
  }

  .strategy-grid,
  .metric-grid,
  .performance-stat-grid {
    grid-template-columns: 1fr;
  }

  .metric-grid.has-note-card {
    grid-template-columns: 1fr;
  }

  .action-fields {
    grid-template-columns: 1fr;
  }

  .monthly-chart {
    overflow-x: auto;
  }

  .monthly-return-table {
    /* min-width: 1280px; */
  }

  .monthly-return-table th,
  .monthly-return-table td {
    height: 50px;
  }

  .monthly-return-cell {
    font-size: 11px;
  }

  .monthly-return-split,
  .monthly-return-single {
    min-height: 48px;
  }
}

/* Keep dashboard tables aligned with the current shared table system. */
.compare-table-wrap,
.table-wrap {
  overflow-x: auto;
  border: 1px solid var(--app-border-muted);
  border-radius: 6px;
  background: var(--app-surface);
}

.share-calculator-table-wrap {
  border: 0;
  border-radius: 6px;
  background: var(--app-surface);
}

.data-table {
  border-collapse: collapse;
  color: var(--app-text);
  font-size: 0.8125rem;
}

.data-table thead tr {
  border-top: 0;
  border-bottom: 1px solid var(--app-border);
  background: var(--app-surface-muted);
}

.data-table th {
  box-sizing: border-box;
  padding: 10px 12px;
  color: var(--app-text);
  font-size: 0.6875rem;
  font-weight: 600;
  line-height: 1.35;
}

.data-table td {
  box-sizing: border-box;
  padding: 10px 12px;
  border-bottom: 1px solid var(--app-border-muted);
  color: var(--app-text);
  font-size: 0.8125rem;
  font-weight: 600;
  line-height: 1.45;
}

.data-table tbody tr:nth-child(odd) {
  background: var(--app-surface);
}

.data-table tbody tr:nth-child(even) {
  background: var(--app-row-even);
}

.data-table tbody tr:last-child td {
  border-bottom: 0;
}

.data-table tbody tr:hover,
.data-table tbody tr:nth-child(odd):hover,
.data-table tbody tr:nth-child(even):hover {
  background: var(--app-surface-hover);
}

.table-sort-button {
  width: 100%;
  gap: 4px;
  color: var(--app-text);
  font-size: 0.6875rem;
  font-weight: 600;
  transition: color 0.15s ease;
}

.table-sort-button i,
.table-sort-button svg {
  color: var(--app-text-muted);
  font-size: 11px;
}

.table-sort-button:hover,
.table-sort-button.active,
.table-sort-button.active i,
.table-sort-button.active svg {
  color: var(--app-primary);
}

.data-table tr.highlighted {
  background: var(--app-primary-soft);
}

.data-table .holding-details-row td {
  background: var(--app-surface-muted);
}

.positive-cell,
.data-table td.positive-cell {
  color: var(--app-positive);
}

.negative-cell,
.data-table td.negative-cell {
  color: var(--app-negative);
}
</style>
