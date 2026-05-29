'use client'
import { useState, useMemo } from 'react'

// ── TYPES ────────────────────────────────────────────────────────────
interface ServiceData {
  forecast: number[]
  budget: number
  couverts: number[]
  ticketMoyen: number
}
interface HebergData { forecast: number[]; budget: number }
interface AppData {
  hebergement: { chambres: HebergData; pm: HebergData }
  restauration: Record<string, ServiceData>
  privatisation: { forecast: number[]; budget: number }
  cumul: { hebergement: number; restauration: number; budget_heberg: number; budget_resto: number }
}

// ── CONSTANTES ───────────────────────────────────────────────────────
const WEEK_DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const WEEK_DATES = ['26/05', '27/05', '28/05', '29/05', '30/05', '31/05', '01/06']
const TODAY_IDX = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1

const SERVICES = [
  { id: 'pdj',          label: 'Petit Déjeuner',   icon: '🌅', color: '#C9A84C', hasCouverts: true  },
  { id: 'restaurant',   label: 'Restaurant',         icon: '🍽️', color: '#5B8FD4', hasCouverts: true  },
  { id: 'banquets',     label: 'Banquets',           icon: '🎉', color: '#9B7FD4', hasCouverts: true  },
  { id: 'roomservice',  label: 'Room Service',       icon: '🛎️', color: '#4CAF7D', hasCouverts: true  },
  { id: 'bar',          label: 'Bar',                icon: '🍸', color: '#D4875B', hasCouverts: false },
  { id: 'minibar',      label: 'Minibar',            icon: '🧊', color: '#5BC4D4', hasCouverts: false },
  { id: 'locationsalle',label: 'Location de Salle',  icon: '🏛️', color: '#D45B8F', hasCouverts: false },
]

const initDays = (vals: number[]) => WEEK_DAYS.map((_, i) => vals[i] ?? 0)

const DEFAULT_DATA: AppData = {
  hebergement: {
    chambres: { forecast: initDays([52, 54, 37, 49, 50, 50, 48]), budget: 1372 },
    pm:       { forecast: initDays([657, 620, 0, 0, 0, 0, 0]),    budget: 704  },
  },
  restauration: {
    pdj:          { forecast: initDays([1487,1544,1058,1401,1430,1458,1430]), budget: 36839, couverts: initDays([42,45,30,40,45,48,42]), ticketMoyen: 35  },
    restaurant:   { forecast: initDays([2200,0,0,3823,4757,2200,2500]),       budget: 45040, couverts: initDays([0,0,0,28,35,20,22]),    ticketMoyen: 120 },
    banquets:     { forecast: initDays([0,0,0,2003,2724,0,0]),                budget: 18608, couverts: initDays([0,0,0,15,20,0,0]),      ticketMoyen: 130 },
    roomservice:  { forecast: initDays([381,395,271,359,366,373,337]),         budget: 8530,  couverts: initDays([8,9,6,8,8,8,7]),        ticketMoyen: 48  },
    bar:          { forecast: initDays([1500,1400,1300,1800,1300,1400,1300]), budget: 41181, couverts: initDays([0,0,0,0,0,0,0]),         ticketMoyen: 0   },
    minibar:      { forecast: initDays([279,290,199,263,268,274,247]),         budget: 3481,  couverts: initDays([0,0,0,0,0,0,0]),         ticketMoyen: 0   },
    locationsalle:{ forecast: initDays([454,0,0,1818,3719,554,0]),             budget: 8500,  couverts: initDays([0,0,0,0,0,0,0]),         ticketMoyen: 0   },
  },
  privatisation: { forecast: initDays([0,0,2623,3357,0,0,0]), budget: 8670 },
  cumul: { hebergement: 586754, restauration: 166083, budget_heberg: 965900, budget_resto: 164173 },
}

// ── HELPERS ──────────────────────────────────────────────────────────
const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0)
const fmt = (n: number) => n === 0 ? '–' : new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
const fmtBig = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
const varPct = (val: number, budget: number) => budget ? ((val - budget) / budget) * 100 : 0

// ── SOUS-COMPOSANTS ───────────────────────────────────────────────────
function VarBadge({ val, budget }: { val: number; budget: number }) {
  if (!budget) return <span style={{ color: '#555', fontSize: 11, fontFamily: 'DM Mono, monospace' }}>—</span>
  const pct = varPct(val, budget)
  const pos = pct >= 0
  return (
    <span style={{
      fontSize: 11, fontFamily: 'DM Mono, monospace', fontWeight: 500,
      color: pos ? '#4CAF7D' : '#E05252',
      background: pos ? 'rgba(76,175,125,0.10)' : 'rgba(224,82,82,0.10)',
      border: `1px solid ${pos ? 'rgba(76,175,125,0.25)' : 'rgba(224,82,82,0.25)'}`,
      borderRadius: 3, padding: '2px 7px', whiteSpace: 'nowrap',
    }}>
      {pos ? '+' : ''}{pct.toFixed(1)}%
    </span>
  )
}

function GapCell({ val, budget }: { val: number; budget: number }) {
  if (!budget) return <span style={{ color: '#555', fontSize: 11 }}>—</span>
  const gap = val - budget
  return (
    <span style={{
      fontFamily: 'DM Mono, monospace', fontSize: 11, whiteSpace: 'nowrap',
      color: gap >= 0 ? '#4CAF7D' : '#E05252',
    }}>
      {gap >= 0 ? '+' : ''}{fmtBig(gap)}
    </span>
  )
}

function CellInput({ value, highlight, onChange }: { value: number; highlight?: boolean; onChange: (v: number) => void }) {
  const [focused, setFocused] = useState(false)
  return (
    <input
      type="number"
      value={value === 0 ? '' : value}
      placeholder="–"
      onChange={e => onChange(Number(e.target.value) || 0)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        width: '100%', background: 'transparent', border: 'none',
        borderBottom: `1px solid ${focused ? '#C9A84C' : highlight ? 'rgba(201,168,76,0.3)' : '#2A2520'}`,
        color: value === 0 ? '#444' : '#E8E4DC',
        fontFamily: 'DM Mono, monospace', fontSize: 12,
        textAlign: 'right', padding: '4px 6px', outline: 'none',
      }}
    />
  )
}

function MiniStat({ label, val }: { label: string; val: string }) {
  return (
    <div style={{ background: '#0F0F0F', border: '1px solid #1E1E1E', padding: '8px 10px', borderRadius: 2 }}>
      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: '#555', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
      <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 14, color: '#E8E4DC' }}>{val}</div>
    </div>
  )
}

// ── APP PRINCIPALE ────────────────────────────────────────────────────
export default function ForecastHR() {
  const [data, setData] = useState<AppData>(DEFAULT_DATA)
  const [tab, setTab] = useState<'semaine' | 'services' | 'cumul'>('semaine')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [editBudget, setEditBudget] = useState(false)

  // ── CALCULS ──
  const totals = useMemo(() => {
    const restoTotal = SERVICES.reduce((acc, s) => acc + sum(data.restauration[s.id].forecast), 0)
    const restoBudget = SERVICES.reduce((acc, s) => acc + data.restauration[s.id].budget, 0)
    const privTotal = sum(data.privatisation.forecast)
    return { restoTotal, restoBudget, privTotal }
  }, [data])

  const gapResto = totals.restoTotal - totals.restoBudget

  // ── MUTATIONS ──
  const setForecast = (section: string, id: string, i: number, val: number) => {
    setData(prev => {
      const next = JSON.parse(JSON.stringify(prev)) as AppData
      if (section === 'restauration') next.restauration[id].forecast[i] = val
      else if (section === 'hebergement') (next.hebergement as Record<string, HebergData>)[id].forecast[i] = val
      else if (section === 'privatisation') next.privatisation.forecast[i] = val
      return next
    })
  }
  const setCouverts = (id: string, i: number, val: number) => {
    setData(prev => { const n = JSON.parse(JSON.stringify(prev)) as AppData; n.restauration[id].couverts[i] = val; return n })
  }
  const setBudget = (section: string, id: string, val: number) => {
    setData(prev => {
      const n = JSON.parse(JSON.stringify(prev)) as AppData
      if (section === 'restauration') n.restauration[id].budget = val
      else if (section === 'hebergement') (n.hebergement as Record<string, HebergData>)[id].budget = val
      else if (section === 'privatisation') n.privatisation.budget = val
      return n
    })
  }

  // ── STYLES PARTAGÉS ──
  const th = (align: 'left' | 'right' = 'right', minW?: number) => ({
    padding: '8px 12px', textAlign: align as 'left' | 'right',
    fontFamily: 'DM Mono, monospace', fontSize: 9, letterSpacing: 2,
    color: '#555', fontWeight: 400, whiteSpace: 'nowrap' as const,
    minWidth: minW, borderBottom: '1px solid #2A2520',
  })
  const td = (align: 'left' | 'right' = 'right', hl = false) => ({
    padding: '5px 12px', textAlign: align as 'left' | 'right',
    borderBottom: '1px solid #141414',
    background: hl ? 'rgba(201,168,76,0.03)' : 'transparent',
    verticalAlign: 'middle' as const,
  })

  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif', background: '#0D0D0D', minHeight: '100vh', color: '#E8E4DC' }}>

      {/* ── HEADER ── */}
      <header style={{
        padding: '18px 32px', borderBottom: '1px solid #1E1E1E',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: '#0D0D0D', position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
          <span style={{ fontFamily: 'Playfair Display, serif', fontSize: 22, fontWeight: 900, color: '#C9A84C', letterSpacing: -0.5 }}>
            Forecast<span style={{ color: '#E8E4DC' }}>HR</span>
          </span>
          <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#444', letterSpacing: 2 }}>
            S.22 · MAI 2026 · HÔTEL LANCASTER
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={() => setEditBudget(e => !e)} style={{
            background: editBudget ? 'rgba(201,168,76,0.12)' : 'transparent',
            border: `1px solid ${editBudget ? '#C9A84C' : '#2A2520'}`,
            color: editBudget ? '#C9A84C' : '#555',
            fontFamily: 'DM Mono, monospace', fontSize: 10, letterSpacing: 1.5,
            padding: '6px 14px', cursor: 'pointer', borderRadius: 2,
          }}>
            {editBudget ? '✓ BUDGETS ON' : 'ÉDITER BUDGETS'}
          </button>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#444', padding: '6px 14px', border: '1px solid #1E1E1E' }}>
            {new Date().toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }).toUpperCase()}
          </div>
        </div>
      </header>

      {/* ── TABS ── */}
      <div style={{ padding: '0 32px', borderBottom: '1px solid #1E1E1E', display: 'flex' }}>
        {(['semaine', 'services', 'cumul'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            background: 'transparent', border: 'none',
            borderBottom: `2px solid ${tab === t ? '#C9A84C' : 'transparent'}`,
            color: tab === t ? '#C9A84C' : '#555',
            fontFamily: 'DM Mono, monospace', fontSize: 11, letterSpacing: 2,
            padding: '14px 20px', cursor: 'pointer', textTransform: 'uppercase',
          }}>{t}</button>
        ))}
      </div>

      <div style={{ padding: '24px 32px', maxWidth: 1600, margin: '0 auto' }}>

        {/* ══ VUE SEMAINE ══ */}
        {tab === 'semaine' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* KPI strip */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 2 }}>
              {[
                { label: 'CA Resto Semaine',  val: fmtBig(totals.restoTotal),  sub: <VarBadge val={totals.restoTotal} budget={totals.restoBudget} /> },
                { label: 'Budget Semaine',     val: fmtBig(totals.restoBudget), sub: <span style={{ fontSize: 11, color: '#555', fontFamily: 'DM Mono,monospace' }}>objectif</span> },
                { label: 'Gap Budget',         val: fmtBig(Math.abs(gapResto)), sub: <span style={{ fontSize: 11, color: gapResto >= 0 ? '#4CAF7D' : '#E05252', fontFamily: 'DM Mono,monospace' }}>{gapResto >= 0 ? '✓ excédent' : '⚠ manque'}</span> },
                { label: 'Privatisation',      val: fmt(totals.privTotal),      sub: <VarBadge val={totals.privTotal} budget={data.privatisation.budget} /> },
              ].map((k, i) => (
                <div key={i} style={{ background: '#141414', border: '1px solid #1E1E1E', padding: '16px 20px' }}>
                  <div style={{ fontFamily: 'DM Mono,monospace', fontSize: 9, color: '#555', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>{k.label}</div>
                  <div style={{ fontFamily: 'Playfair Display,serif', fontSize: 24, fontWeight: 700, color: '#C9A84C', marginBottom: 6 }}>{k.val}</div>
                  {k.sub}
                </div>
              ))}
            </div>

            {/* Tableau principal */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr>
                    <th style={th('left', 160)}>SERVICE</th>
                    {WEEK_DAYS.map((d, i) => (
                      <th key={i} style={{ ...th('right', 86), color: i === TODAY_IDX ? '#C9A84C' : '#555' }}>
                        <div>{d}</div>
                        <div style={{ fontSize: 10, color: '#3A3A3A' }}>{WEEK_DATES[i]}</div>
                      </th>
                    ))}
                    <th style={th('right', 100)}>TOTAL</th>
                    <th style={th('right', 90)}>BUDGET</th>
                    <th style={th('right', 72)}>VAR %</th>
                    <th style={th('right', 88)}>GAP €</th>
                  </tr>
                </thead>
                <tbody>

                  {/* HÉBERGEMENT */}
                  <tr style={{ background: '#0A0A0A' }}>
                    <td colSpan={13} style={{ padding: '10px 12px 6px', fontFamily: 'DM Mono,monospace', fontSize: 9, letterSpacing: 3, color: '#5B8FD4', borderTop: '1px solid #1E1E1E' }}>
                      HÉBERGEMENT
                    </td>
                  </tr>

                  {(['chambres', 'pm'] as const).map(field => {
                    const hd = data.hebergement[field]
                    const total = field === 'chambres' ? sum(hd.forecast) : 0
                    return (
                      <tr key={field} style={{ background: '#111' }}>
                        <td style={td('left')}>
                          <span style={{ color: '#7A7470', fontSize: 11 }}>{field === 'chambres' ? 'Chambres' : 'Prix Moyen (PM)'}</span>
                        </td>
                        {hd.forecast.map((v, i) => (
                          <td key={i} style={td('right', i === TODAY_IDX)}>
                            <CellInput value={v} highlight={i === TODAY_IDX} onChange={val => setForecast('hebergement', field, i, val)} />
                          </td>
                        ))}
                        <td style={{ ...td('right'), fontFamily: 'DM Mono,monospace', color: field === 'chambres' ? '#E8E4DC' : '#555' }}>
                          {field === 'chambres' ? total : '—'}
                        </td>
                        <td style={td('right')}>
                          {editBudget
                            ? <CellInput value={hd.budget} onChange={v => setBudget('hebergement', field, v)} />
                            : <span style={{ fontFamily: 'DM Mono,monospace', color: '#555', fontSize: 11 }}>{field === 'chambres' ? hd.budget : `${hd.budget}€`}</span>}
                        </td>
                        <td style={td('right')}>{field === 'chambres' ? <VarBadge val={total} budget={hd.budget} /> : <span style={{ color: '#555' }}>—</span>}</td>
                        <td style={td('right')}>{field === 'chambres' ? <GapCell val={total} budget={hd.budget} /> : <span style={{ color: '#555' }}>—</span>}</td>
                      </tr>
                    )
                  })}

                  {/* RESTAURATION */}
                  <tr style={{ background: '#0A0A0A' }}>
                    <td colSpan={13} style={{ padding: '10px 12px 6px', fontFamily: 'DM Mono,monospace', fontSize: 9, letterSpacing: 3, color: '#C9A84C', borderTop: '1px solid #1E1E1E' }}>
                      RESTAURATION
                    </td>
                  </tr>

                  {SERVICES.map(svc => {
                    const sd = data.restauration[svc.id]
                    const svcTotal = sum(sd.forecast)
                    const isExp = expanded === svc.id
                    return [
                      <tr key={svc.id} style={{ background: '#111', cursor: svc.hasCouverts ? 'pointer' : 'default' }}
                        onClick={() => svc.hasCouverts && setExpanded(isExp ? null : svc.id)}>
                        <td style={td('left')}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 14 }}>{svc.icon}</span>
                            <span style={{ color: '#E8E4DC' }}>{svc.label}</span>
                            {svc.hasCouverts && <span style={{ fontSize: 9, color: '#444', fontFamily: 'DM Mono,monospace' }}>{isExp ? '▲' : '▼'}</span>}
                          </div>
                        </td>
                        {sd.forecast.map((v, i) => (
                          <td key={i} style={td('right', i === TODAY_IDX)} onClick={e => e.stopPropagation()}>
                            <CellInput value={v} highlight={i === TODAY_IDX} onChange={val => setForecast('restauration', svc.id, i, val)} />
                          </td>
                        ))}
                        <td style={{ ...td('right'), fontFamily: 'DM Mono,monospace', fontWeight: 500, color: '#E8E4DC' }}>{fmt(svcTotal)}</td>
                        <td style={td('right')} onClick={e => e.stopPropagation()}>
                          {editBudget
                            ? <CellInput value={sd.budget} onChange={v => setBudget('restauration', svc.id, v)} />
                            : <span style={{ fontFamily: 'DM Mono,monospace', color: '#555', fontSize: 11 }}>{fmt(sd.budget)}</span>}
                        </td>
                        <td style={td('right')}><VarBadge val={svcTotal} budget={sd.budget} /></td>
                        <td style={td('right')}><GapCell val={svcTotal} budget={sd.budget} /></td>
                      </tr>,
                      isExp && svc.hasCouverts && (
                        <tr key={`${svc.id}-cov`} style={{ background: '#0C0C0C' }}>
                          <td style={{ ...td('left'), paddingLeft: 36 }}>
                            <span style={{ fontFamily: 'DM Mono,monospace', fontSize: 9, color: svc.color, letterSpacing: 1 }}>COUVERTS</span>
                          </td>
                          {sd.couverts.map((v, i) => (
                            <td key={i} style={td('right', i === TODAY_IDX)}>
                              <CellInput value={v} highlight={i === TODAY_IDX} onChange={val => setCouverts(svc.id, i, val)} />
                            </td>
                          ))}
                          <td style={{ ...td('right'), fontFamily: 'DM Mono,monospace', color: svc.color }}>{sum(sd.couverts)}</td>
                          <td style={td('right')}><span style={{ fontFamily: 'DM Mono,monospace', fontSize: 10, color: '#555' }}>moy. {sd.ticketMoyen}€</span></td>
                          <td colSpan={2} />
                        </tr>
                      ),
                    ]
                  })}

                  {/* TOTAL RESTAURATION */}
                  <tr style={{ background: '#1A1508', borderTop: '1px solid rgba(201,168,76,0.15)' }}>
                    <td style={{ ...td('left'), fontFamily: 'DM Mono,monospace', fontSize: 10, color: '#C9A84C', letterSpacing: 1 }}>TOTAL RESTAURATION</td>
                    {WEEK_DAYS.map((_, i) => {
                      const dayTotal = SERVICES.reduce((acc, s) => acc + data.restauration[s.id].forecast[i], 0)
                      return <td key={i} style={{ ...td('right'), fontFamily: 'DM Mono,monospace', color: i === TODAY_IDX ? '#C9A84C' : '#E8E4DC' }}>{fmt(dayTotal)}</td>
                    })}
                    <td style={{ ...td('right'), fontFamily: 'Playfair Display,serif', fontSize: 15, color: '#C9A84C' }}>{fmtBig(totals.restoTotal)}</td>
                    <td style={{ ...td('right'), fontFamily: 'DM Mono,monospace', color: '#555', fontSize: 11 }}>{fmtBig(totals.restoBudget)}</td>
                    <td style={td('right')}><VarBadge val={totals.restoTotal} budget={totals.restoBudget} /></td>
                    <td style={td('right')}><GapCell val={totals.restoTotal} budget={totals.restoBudget} /></td>
                  </tr>

                  {/* PRIVATISATION */}
                  <tr style={{ background: '#0A0A0A' }}>
                    <td colSpan={13} style={{ padding: '10px 12px 6px', fontFamily: 'DM Mono,monospace', fontSize: 9, letterSpacing: 3, color: '#9B7FD4', borderTop: '1px solid #1E1E1E' }}>
                      POUR GAUTIER
                    </td>
                  </tr>
                  <tr style={{ background: '#111' }}>
                    <td style={td('left')}><span style={{ color: '#9B7FD4', fontSize: 11 }}>Privatisation Restaurant</span></td>
                    {data.privatisation.forecast.map((v, i) => (
                      <td key={i} style={td('right', i === TODAY_IDX)}>
                        <CellInput value={v} highlight={i === TODAY_IDX} onChange={val => setForecast('privatisation', '', i, val)} />
                      </td>
                    ))}
                    <td style={{ ...td('right'), fontFamily: 'DM Mono,monospace', color: '#9B7FD4' }}>{fmt(totals.privTotal)}</td>
                    <td style={td('right')}>
                      {editBudget
                        ? <CellInput value={data.privatisation.budget} onChange={v => setBudget('privatisation', '', v)} />
                        : <span style={{ fontFamily: 'DM Mono,monospace', color: '#555', fontSize: 11 }}>{fmt(data.privatisation.budget)}</span>}
                    </td>
                    <td style={td('right')}><VarBadge val={totals.privTotal} budget={data.privatisation.budget} /></td>
                    <td style={td('right')}><GapCell val={totals.privTotal} budget={data.privatisation.budget} /></td>
                  </tr>

                </tbody>
              </table>
            </div>

            {/* Alerte gap */}
            <div style={{
              background: gapResto < 0 ? 'rgba(224,82,82,0.05)' : 'rgba(76,175,125,0.05)',
              border: `1px solid ${gapResto < 0 ? 'rgba(224,82,82,0.2)' : 'rgba(76,175,125,0.2)'}`,
              borderLeft: `3px solid ${gapResto < 0 ? '#E05252' : '#4CAF7D'}`,
              padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 14,
            }}>
              <span style={{ fontSize: 18 }}>{gapResto < 0 ? '⚠️' : '✅'}</span>
              <div>
                <div style={{ fontFamily: 'DM Mono,monospace', fontSize: 10, color: gapResto < 0 ? '#E05252' : '#4CAF7D', letterSpacing: 1, marginBottom: 3 }}>
                  {gapResto < 0 ? 'GAP BUDGET — ACTION REQUISE' : 'BUDGET ATTEINT'}
                </div>
                <div style={{ fontSize: 12, color: '#E8E4DC' }}>
                  {gapResto < 0
                    ? <>Il manque <strong style={{ color: '#E05252' }}>{fmtBig(Math.abs(gapResto))}</strong> pour atteindre le budget semaine. Action commerciale recommandée : offres déjeuner, privatisation, événement.</>
                    : <>Excédent de <strong style={{ color: '#4CAF7D' }}>{fmtBig(gapResto)}</strong> sur le budget semaine.</>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══ VUE SERVICES ══ */}
        {tab === 'services' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(340px,1fr))', gap: 2 }}>
            {SERVICES.map(svc => {
              const sd = data.restauration[svc.id]
              const svcTotal = sum(sd.forecast)
              const covTotal = sum(sd.couverts)
              const ticket = covTotal > 0 ? Math.round(svcTotal / covTotal) : sd.ticketMoyen
              const maxV = Math.max(...sd.forecast.filter(v => v > 0), 1)
              return (
                <div key={svc.id} style={{ background: '#141414', border: '1px solid #1E1E1E', borderTop: `2px solid ${svc.color}`, padding: '20px 24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 22 }}>{svc.icon}</span>
                      <div>
                        <div style={{ fontFamily: 'DM Mono,monospace', fontSize: 9, color: svc.color, letterSpacing: 2, textTransform: 'uppercase' }}>{svc.label}</div>
                        <div style={{ fontFamily: 'Playfair Display,serif', fontSize: 22, color: '#E8E4DC' }}>{fmtBig(svcTotal)}</div>
                      </div>
                    </div>
                    <VarBadge val={svcTotal} budget={sd.budget} />
                  </div>
                  {/* Mini chart */}
                  <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 44, marginBottom: 10 }}>
                    {sd.forecast.map((v, i) => (
                      <div key={i} style={{
                        flex: 1, height: v > 0 ? Math.max(3, (v / maxV) * 44) : 3,
                        background: v === 0 ? '#1E1E1E' : i === TODAY_IDX ? svc.color : `${svc.color}55`,
                        borderRadius: 1, transition: 'height 0.3s',
                      }} title={`${WEEK_DAYS[i]}: ${fmt(v)}`} />
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 3, marginBottom: 14 }}>
                    {WEEK_DATES.map((d, i) => (
                      <div key={i} style={{ flex: 1, fontFamily: 'DM Mono,monospace', fontSize: 8, color: i === TODAY_IDX ? svc.color : '#333', textAlign: 'center' }}>{d.slice(0,2)}</div>
                    ))}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                    <MiniStat label="Budget" val={fmtBig(sd.budget)} />
                    <MiniStat label="Couverts" val={covTotal > 0 ? String(covTotal) : '—'} />
                    <MiniStat label="Ticket moy." val={ticket > 0 ? `${ticket}€` : '—'} />
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ══ VUE CUMUL ══ */}
        {tab === 'cumul' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              {[
                { label: 'Hébergement', cumul: data.cumul.hebergement, budget: data.cumul.budget_heberg, color: '#5B8FD4', icon: '🏨' },
                { label: 'Restauration', cumul: data.cumul.restauration, budget: data.cumul.budget_resto, color: '#C9A84C', icon: '🍽️' },
              ].map(card => {
                const pct = ((card.cumul / card.budget) * 100).toFixed(1)
                const gap = card.cumul - card.budget
                return (
                  <div key={card.label} style={{ background: '#141414', border: '1px solid #1E1E1E', borderTop: `2px solid ${card.color}`, padding: '28px 32px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                      <span style={{ fontSize: 26 }}>{card.icon}</span>
                      <div>
                        <div style={{ fontFamily: 'DM Mono,monospace', fontSize: 9, color: card.color, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 }}>{card.label} · cumul mois</div>
                        <div style={{ fontFamily: 'Playfair Display,serif', fontSize: 30, fontWeight: 700, color: '#E8E4DC', lineHeight: 1 }}>{fmtBig(card.cumul)}</div>
                      </div>
                    </div>
                    <div style={{ background: '#0D0D0D', height: 4, borderRadius: 2, marginBottom: 16, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.min(parseFloat(pct), 100)}%`, background: card.color, borderRadius: 2, transition: 'width 0.6s ease' }} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                      <MiniStat label="Budget Mois" val={fmtBig(card.budget)} />
                      <MiniStat label="Réalisé" val={`${pct}%`} />
                      <MiniStat label="Gap" val={`${gap >= 0 ? '+' : ''}${fmtBig(gap)}`} />
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Détail par service */}
            <div style={{ background: '#141414', border: '1px solid #1E1E1E', padding: 24 }}>
              <div style={{ fontFamily: 'DM Mono,monospace', fontSize: 10, color: '#555', letterSpacing: 2, marginBottom: 16, textTransform: 'uppercase' }}>
                Détail cumul · Restauration par service
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr>
                    {['Service', 'Cumul MTD', 'Budget Mois', 'Réalisé %', 'Gap €'].map(h => (
                      <th key={h} style={th(h === 'Service' ? 'left' : 'right')}>{h.toUpperCase()}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {SERVICES.map(svc => {
                    const svcBudget = data.restauration[svc.id].budget * 4.3
                    const svcCumul = data.cumul.restauration * (data.restauration[svc.id].budget / totals.restoBudget)
                    return (
                      <tr key={svc.id} style={{ borderBottom: '1px solid #1A1A1A' }}>
                        <td style={td('left')}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span>{svc.icon}</span>
                            <span style={{ fontSize: 12 }}>{svc.label}</span>
                          </div>
                        </td>
                        <td style={{ ...td('right'), fontFamily: 'DM Mono,monospace' }}>{fmtBig(svcCumul)}</td>
                        <td style={{ ...td('right'), fontFamily: 'DM Mono,monospace', color: '#555' }}>{fmtBig(svcBudget)}</td>
                        <td style={td('right')}><VarBadge val={svcCumul} budget={svcBudget} /></td>
                        <td style={td('right')}><GapCell val={svcCumul} budget={svcBudget} /></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              <div style={{ marginTop: 10, fontFamily: 'DM Mono,monospace', fontSize: 9, color: '#444', letterSpacing: 1 }}>
                * Cumul estimé proportionnellement — à remplacer par données réelles MTD
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
