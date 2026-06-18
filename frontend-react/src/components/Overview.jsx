import React, { useRef, useEffect } from 'react';
import { Chart as ChartJS, registerables } from 'chart.js';
import { Chart } from 'react-chartjs-2';

ChartJS.register(...registerables);

/* ─── Animated Counter ──────────────────────────────────────────── */
function AnimatedNumber({ value, suffix = '', prefix = '', lang = 'FR' }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const target = parseFloat(value) || 0;
    const duration = 900;
    const start = performance.now();
    const step = (now) => {
      const t = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      const locale = lang === 'FR' ? 'fr-FR' : 'en-US';
      el.textContent = prefix + new Intl.NumberFormat(locale).format(Math.floor(target * ease)) + suffix;
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [value, lang]);
  return <span ref={ref}>{prefix}0{suffix}</span>;
}

/* ─── KPI Card ──────────────────────────────────────────────────── */
function KpiCard({ icon, label, value, suffix = '', sub, accent, dm, lang = 'FR' }) {
  const bg   = dm ? `${accent}18` : `${accent}10`;
  const card = dm ? '#161b22'     : '#ffffff';
  const brd  = dm ? `${accent}30` : `${accent}25`;
  const sub_ = dm ? '#6b7280'     : '#9ca3af';
  return (
    <div style={{
      background: card, borderRadius: '16px',
      border: `1px solid ${brd}`,
      padding: '20px 18px',
      display: 'flex', alignItems: 'center', gap: '16px',
      boxShadow: dm ? `0 0 0 1px ${accent}15, 0 4px 20px rgba(0,0,0,0.25)` : `0 2px 12px ${accent}15`,
      transition: 'transform 0.2s, box-shadow 0.2s',
      cursor: 'default',
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = dm ? `0 0 0 1px ${accent}30, 0 8px 30px rgba(0,0,0,0.35)` : `0 6px 20px ${accent}25`; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = dm ? `0 0 0 1px ${accent}15, 0 4px 20px rgba(0,0,0,0.25)` : `0 2px 12px ${accent}15`; }}
    >
      <div style={{ background: bg, width: 52, height: 52, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem', flexShrink: 0, border: `1px solid ${accent}30` }}>
        {icon}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: '11px', fontWeight: 600, color: sub_, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 4 }}>{label}</div>
        <div style={{ fontSize: '1.35rem', fontWeight: 800, color: dm ? '#f1f5f9' : '#0f172a', lineHeight: 1.1, letterSpacing: '-0.5px' }}>
          <AnimatedNumber value={value} suffix={suffix} lang={lang} />
        </div>
        {sub && <div style={{ fontSize: '11px', color: sub_, marginTop: 4 }}>{sub}</div>}
      </div>
    </div>
  );
}

/* ─── Main Overview Component ───────────────────────────────────── */
export default function Overview({ stats, revenueYear, revenueMonth, onResolveAlert, darkMode: dm, lang = 'FR' }) {
  const chartRef = useRef(null);

  const translations = {
    FR: {
      caMensuel: "CA Mensuel",
      ventesDe: "Ventes de ",
      encoursClients: "En-cours Clients",
      facturesImpayees: "Factures clients impayées",
      clientsActifs: "Clients Actifs",
      profilsActifs: "Profils B2B & B2C actifs",
      fournisseursSrm: "Fournisseurs SRM",
      partenairesActifs: "Partenaires SRM actifs",
      dailyRevTitle: "📊 Chiffre d'Affaires Journalier",
      legendLine: "Ligne CA",
      legendVolume: "Volume",
      noDataMonth: "Aucune donnée pour ce mois",
      totalMois: "Total du mois",
      moyenneJour: "Moyenne/jour",
      picJour: "Pic (Jour ",
      criticalAlerts: "Alertes Critiques",
      allClear: "Tout est en ordre !",
      resolve: "RÉSOUDRE",
      topClients: "Top Clients",
      topSuppliers: "Top Fournisseurs",
      topProducts: "Top Articles Vendus",
      noData: "Aucune donnée",
      caLabel: "  CA: "
    },
    EN: {
      caMensuel: "Monthly Revenue",
      ventesDe: "Sales of ",
      encoursClients: "Client Outstanding Balance",
      facturesImpayees: "Unpaid client invoices",
      clientsActifs: "Active Clients",
      profilsActifs: "Active B2B & B2C profiles",
      fournisseursSrm: "SRM Suppliers",
      partenairesActifs: "Active SRM partners",
      dailyRevTitle: "📊 Daily Revenue",
      legendLine: "Revenue Line",
      legendVolume: "Volume",
      noDataMonth: "No data for this month",
      totalMois: "Monthly total",
      moyenneJour: "Daily average",
      picJour: "Peak (Day ",
      criticalAlerts: "Critical Alerts",
      allClear: "All clear!",
      resolve: "RESOLVE",
      topClients: "Top Clients",
      topSuppliers: "Top Suppliers",
      topProducts: "Top Selling Items",
      noData: "No data",
      caLabel: "  Rev: "
    }
  };

  const t = (key) => (translations[lang] || translations['FR'])[key] || key;
  const locale = lang === 'FR' ? 'fr-FR' : 'en-US';

  const monthNames = lang === 'FR' ? {
    '1':'Janvier','2':'Février','3':'Mars','4':'Avril',
    '5':'Mai','6':'Juin','7':'Juillet','8':'Août',
    '9':'Septembre','10':'Octobre','11':'Novembre','12':'Décembre',
  } : {
    '1':'January','2':'February','3':'March','4':'April',
    '5':'May','6':'June','7':'July','8':'August',
    '9':'September','10':'October','11':'November','12':'December',
  };
  const monthLabel = monthNames[String(revenueMonth)] || 'Mai';

  /* ── Theme tokens ── */
  const accent   = dm ? '#3b82f6' : '#2563eb';
  const accent2  = dm ? '#8b5cf6' : '#7c3aed';
  const gridClr  = dm ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
  const tickClr  = dm ? '#6b7280' : '#94a3b8';
  const cardBg   = dm ? '#161b22' : '#ffffff';
  const textMain = dm ? '#f1f5f9' : '#0f172a';
  const textDim  = dm ? '#6b7280' : '#94a3b8';
  const brd      = dm ? 'rgba(255,255,255,0.07)' : '#e2e8f0';
  const inputBg  = dm ? '#0d1117' : '#f8fafc';

  const days   = (stats.dailyRevenue || []).map(d => String(d.day).padStart(2, '0'));
  const values = (stats.dailyRevenue || []).map(d => d.value);

  /* ── Build gradient fill inside the chart plugin ── */
  const buildGradient = (ctx, area, color, alpha1 = 0.35, alpha2 = 0.0) => {
    const g = ctx.createLinearGradient(0, area.top, 0, area.bottom);
    g.addColorStop(0, color.replace(')', `, ${alpha1})`).replace('rgb', 'rgba'));
    g.addColorStop(1, color.replace(')', `, ${alpha2})`).replace('rgb', 'rgba'));
    return g;
  };

  /* ── Chart.js data ── */
  const chartData = {
    labels: days,
    datasets: [
      {
        type: 'line',
        label: 'CA (DZD)',
        data: values,
        borderColor: accent,
        borderWidth: 2.5,
        pointRadius: 4,
        pointHoverRadius: 7,
        pointBackgroundColor: accent,
        pointBorderColor: dm ? '#161b22' : '#ffffff',
        pointBorderWidth: 2,
        tension: 0.42,
        fill: true,
        backgroundColor: (ctx) => {
          const chart = ctx.chart;
          const { chartArea, ctx: c } = chart;
          if (!chartArea) return `${accent}22`;
          return buildGradient(c, chartArea,
            dm ? 'rgb(59,130,246)' : 'rgb(37,99,235)', 0.28, 0.0);
        },
        order: 1,
      },
      {
        type: 'bar',
        label: 'Volume',
        data: values,
        backgroundColor: (ctx) => {
          const chart = ctx.chart;
          const { chartArea, ctx: c } = chart;
          if (!chartArea) return `${accent2}22`;
          const g = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          g.addColorStop(0, dm ? 'rgba(139,92,246,0.45)' : 'rgba(124,58,237,0.30)');
          g.addColorStop(1, dm ? 'rgba(139,92,246,0.05)' : 'rgba(124,58,237,0.03)');
          return g;
        },
        borderColor: 'transparent',
        borderRadius: { topLeft: 6, topRight: 6 },
        borderSkipped: false,
        maxBarThickness: 22,
        order: 2,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    animation: { duration: 1000, easing: 'easeOutQuart' },
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: true,
        backgroundColor: dm ? 'rgba(15,23,42,0.95)' : 'rgba(255,255,255,0.97)',
        borderColor: dm ? 'rgba(59,130,246,0.4)' : 'rgba(37,99,235,0.25)',
        borderWidth: 1,
        titleColor: dm ? '#93c5fd' : '#1d4ed8',
        bodyColor: dm ? '#e2e8f0' : '#1e293b',
        padding: 12,
        cornerRadius: 10,
        titleFont: { size: 12, weight: '700' },
        bodyFont: { size: 12, weight: '600' },
        boxPadding: 4,
        callbacks: {
          title: (items) => (lang === 'FR' ? 'Jour ' : 'Day ') + items[0]?.label,
          label: (item) => {
            if (item.datasetIndex === 0)
              return t('caLabel') + new Intl.NumberFormat(locale).format(item.raw) + ' DA';
            return null;
          },
          afterLabel: () => null,
        },
        filter: (item) => item.datasetIndex === 0,
      },
    },
    scales: {
      y: {
        grid: { color: gridClr, drawBorder: false },
        border: { display: false },
        ticks: {
          color: tickClr,
          font: { family: 'Inter', size: 10 },
          padding: 8,
          callback: (v) => {
            if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + 'M DA';
            if (v >= 1_000) return (v / 1_000).toFixed(0) + 'k DA';
            return v + ' DA';
          },
        },
      },
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: {
          color: tickClr,
          font: { family: 'Inter', size: 10 },
          maxRotation: 0,
        },
      },
    },
  };

  /* ── Rank medal colors ── */
  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div className="view-section active" id="overview" style={{ paddingBottom: 30 }}>

      {/* ── KPI Cards ── */}
      <div className="kpi-grid" style={{ marginBottom: 24 }}>
        <KpiCard dm={dm} lang={lang} icon="💰" accent="#f59e0b" label={t('caMensuel')}
          value={stats.totalRevenue || 0} suffix=" DA"
          sub={`${t('ventesDe')}${monthLabel} ${revenueYear}`} />
        <KpiCard dm={dm} lang={lang} icon="⏳" accent="#3b82f6" label={t('encoursClients')}
          value={stats.encoursClients || 0} suffix=" DA"
          sub={t('facturesImpayees')} />
        <KpiCard dm={dm} lang={lang} icon="👥" accent="#10b981" label={t('clientsActifs')}
          value={stats.activeClients || 0}
          sub={t('profilsActifs')} />
        <KpiCard dm={dm} lang={lang} icon="🚚" accent="#8b5cf6" label={t('fournisseursSrm')}
          value={stats.suppliersCount || 0}
          sub={t('partenairesActifs')} />
      </div>

      {/* ── Chart + Alerts ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '2.3fr 1fr', gap: 20, marginBottom: 24 }}>

        {/* Chart Card */}
        <div style={{
          background: cardBg, borderRadius: 18, border: `1px solid ${brd}`,
          padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 16,
          boxShadow: dm ? '0 4px 30px rgba(0,0,0,0.3)' : '0 2px 16px rgba(0,0,0,0.06)',
        }}>
          {/* Chart header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: textDim, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 4 }}>
                {t('dailyRevTitle')}
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: textMain, letterSpacing: '-0.5px' }}>
                {monthLabel} {revenueYear}
              </div>
            </div>
            {/* Legend pills */}
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: textDim, fontWeight: 600 }}>
                <span style={{ width: 12, height: 3, borderRadius: 2, background: accent, display: 'inline-block' }} /> {t('legendLine')}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: textDim, fontWeight: 600 }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: accent2 + '60', border: `1px solid ${accent2}`, display: 'inline-block' }} /> {t('legendVolume')}
              </span>
            </div>
          </div>

          {/* Chart body */}
          <div style={{ flex: 1, position: 'relative', height: 280 }}>
            {days.length === 0 ? (
              <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: textDim }}>
                <span style={{ fontSize: 36, opacity: 0.35 }}>📈</span>
                <span style={{ fontSize: 13, fontWeight: 600, opacity: 0.6 }}>{t('noDataMonth')}</span>
              </div>
            ) : (
              <Chart ref={chartRef} type="bar" data={chartData} options={chartOptions} />
            )}
          </div>

          {/* Bottom stats strip */}
          {values.length > 0 && (() => {
            const total  = values.reduce((a, b) => a + b, 0);
            const avg    = total / values.length;
            const maxVal = Math.max(...values);
            const maxDay = days[values.indexOf(maxVal)];
            return (
              <div style={{ display: 'flex', gap: 0, borderTop: `1px solid ${brd}`, paddingTop: 14, marginTop: 4 }}>
                {[
                  { label: t('totalMois'), val: new Intl.NumberFormat(locale).format(total) + ' DA', color: accent },
                  { label: t('moyenneJour'),  val: new Intl.NumberFormat(locale).format(Math.round(avg)) + ' DA', color: accent2 },
                  { label: t('picJour') + maxDay + ')', val: new Intl.NumberFormat(locale).format(maxVal) + ' DA', color: '#10b981' },
                ].map((s, i) => (
                  <div key={i} style={{ flex: 1, textAlign: 'center', borderRight: i < 2 ? `1px solid ${brd}` : 'none' }}>
                    <div style={{ fontSize: 10, color: textDim, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 3 }}>{s.label}</div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: s.color }}>{s.val}</div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>

        {/* Alerts Card */}
        <div style={{ background: cardBg, borderRadius: 18, border: `1px solid ${brd}`, padding: '18px 16px', display: 'flex', flexDirection: 'column', boxShadow: dm ? '0 4px 24px rgba(0,0,0,0.25)' : '0 2px 12px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <span style={{ fontSize: 16 }}>🚨</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.8px' }}>{t('criticalAlerts')}</span>
            {stats.alerts && stats.alerts.length > 0 && (
              <span style={{ background: '#ef4444', color: '#fff', borderRadius: 20, padding: '1px 8px', fontSize: 10, fontWeight: 700, marginLeft: 'auto' }}>
                {stats.alerts.length}
              </span>
            )}
          </div>
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {!stats.alerts || stats.alerts.length === 0 ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: textDim }}>
                <span style={{ fontSize: 32 }}>✅</span>
                <span style={{ fontSize: 12, fontWeight: 600, textAlign: 'center' }}>{t('allClear')}</span>
              </div>
            ) : (
              stats.alerts.map((alert, idx) => (
                <div key={idx} style={{
                  background: inputBg,
                  borderLeft: `3px solid ${alert.color || accent}`,
                  borderRadius: 10, padding: '10px 12px',
                  display: 'flex', flexDirection: 'column', gap: 6,
                  border: `1px solid ${brd}`,
                  borderLeftColor: alert.color || accent,
                  borderLeftWidth: 3,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                    <div style={{ fontWeight: 700, fontSize: 11, color: alert.color || accent, display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: alert.color || accent, display: 'inline-block', flexShrink: 0 }} />
                      {alert.title}
                    </div>
                    <button className="btn-resolve"
                      style={{ background: alert.color, color: '#fff', fontSize: 9, padding: '3px 8px', borderRadius: 6, fontWeight: 700, border: 'none', cursor: 'pointer', flexShrink: 0 }}
                      onClick={() => onResolveAlert(alert.tab, alert.type, alert.id)}>
                      {t('resolve')}
                    </button>
                  </div>
                  <div style={{ fontSize: 11, color: textMain, fontWeight: 500 }} dangerouslySetInnerHTML={{ __html: alert.message }} />
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── Top Lists ── */}
      <div className="top-lists-grid">
        {[
          { title: t('topClients'),        icon: '🏆', items: stats.topClients   || [], color: '#f59e0b' },
          { title: t('topSuppliers'),   icon: '🤝', items: stats.topSuppliers || [], color: '#10b981' },
          { title: t('topProducts'),icon: '📦', items: stats.topProducts  || [], color: '#3b82f6' },
        ].map(({ title, icon, items, color }) => (
          <div key={title} style={{
            background: cardBg, borderRadius: 16, border: `1px solid ${brd}`,
            padding: '18px 16px',
            boxShadow: dm ? '0 4px 20px rgba(0,0,0,0.2)' : '0 2px 10px rgba(0,0,0,0.04)',
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: textDim, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
              {icon} {title}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {items.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '16px 0', color: textDim, fontSize: 12 }}>{t('noData')}</div>
              ) : items.map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 10, background: dm ? 'rgba(255,255,255,0.03)' : '#f8fafc', border: `1px solid ${brd}` }}>
                  <span style={{ fontSize: 16, flexShrink: 0 }}>{medals[i] || `${i + 1}.`}</span>
                  <span style={{ flex: 1, fontWeight: 600, color: textMain, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 800, color, fontSize: 12, flexShrink: 0 }}>
                    {new Intl.NumberFormat(locale).format(item.value)} DA
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
