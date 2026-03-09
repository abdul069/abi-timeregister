import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  getIntegrationSettings, saveIntegrationSettings,
  getOdooSettings, saveOdooSettings,
  getOdooSyncLog, addOdooSyncLog,
  getIncomingOrders, getPendingIncomingOrders,
  formatPrice, addAuditLog,
} from '../lib/pos-data';

export default function Integraties() {
  const router = useRouter();
  const [tab, setTab] = useState('takeaway');
  const [integrationSettings, setIntegrationSettings] = useState({});
  const [odooSettings, setOdooSettings] = useState({});
  const [syncLog, setSyncLog] = useState([]);
  const [incomingOrders, setIncomingOrders] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [testResult, setTestResult] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [intSettings, oSettings, sLog, incoming] = await Promise.all([
      getIntegrationSettings(),
      getOdooSettings(),
      getOdooSyncLog(),
      getIncomingOrders(),
    ]);
    setIntegrationSettings(intSettings);
    setOdooSettings(oSettings);
    setSyncLog(sLog);
    setIncomingOrders(incoming);
    setLoading(false);
  };

  const handleSaveIntegration = async () => {
    setSaving(true);
    await saveIntegrationSettings(integrationSettings);
    setSaveMsg('Instellingen opgeslagen!');
    setSaving(false);
    setTimeout(() => setSaveMsg(''), 3000);
  };

  const handleSaveOdoo = async () => {
    setSaving(true);
    await saveOdooSettings(odooSettings);
    setSaveMsg('Odoo instellingen opgeslagen!');
    setSaving(false);
    setTimeout(() => setSaveMsg(''), 3000);
  };

  const handleTestOdoo = async () => {
    setTestResult(null);
    if (!odooSettings.url || !odooSettings.database || !odooSettings.username || !odooSettings.apiKey) {
      setTestResult({ success: false, message: 'Vul alle velden in om de verbinding te testen.' });
      return;
    }
    // Simulate connection test (actual Odoo XML-RPC would need server-side proxy)
    setTestResult({ success: false, message: 'Odoo verbinding wordt server-side getest. Sla eerst de instellingen op en controleer de API route /api/odoo-test.' });
  };

  const handleTestWebhook = () => {
    const webhookUrl = typeof window !== 'undefined'
      ? `${window.location.origin}/api/webhook-takeaway`
      : '';
    // Copy to clipboard
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(webhookUrl);
      setSaveMsg('Webhook URL gekopieerd!');
      setTimeout(() => setSaveMsg(''), 3000);
    }
  };

  const webhookUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/webhook-takeaway`
    : '/api/webhook-takeaway';

  const tabs = [
    { id: 'takeaway', label: 'Takeaway.com', icon: '🟠' },
    { id: 'odoo', label: 'Odoo Boekhouding', icon: '📗' },
    { id: 'log', label: 'Sync Log', icon: '📋' },
  ];

  if (loading) {
    return (
      <div style={st.container}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#8b949e' }}>
          Laden...
        </div>
      </div>
    );
  }

  return (
    <div style={st.container}>
      {/* Header */}
      <div style={st.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button onClick={() => router.push('/pos')} style={st.backBtn}>← Terug</button>
          <div>
            <h1 style={st.title}>🔗 Integraties</h1>
            <p style={st.subtitle}>Takeaway.com, Thuisbezorgd & Odoo</p>
          </div>
        </div>
        {saveMsg && (
          <div style={{ padding: '8px 16px', background: '#23863620', border: '1px solid #23863640', borderRadius: '8px', color: '#3fb950', fontSize: '13px' }}>
            ✅ {saveMsg}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={st.tabs}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ ...st.tab, ...(tab === t.id ? st.tabActive : {}) }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <div style={st.content}>
        {/* ===== TAKEAWAY.COM ===== */}
        {tab === 'takeaway' && (
          <div>
            {/* Connection status */}
            <div style={st.statusCard}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ fontSize: '40px' }}>🟠</div>
                <div>
                  <h3 style={{ margin: 0, color: '#e6edf3', fontSize: '18px' }}>Takeaway.com / Thuisbezorgd</h3>
                  <p style={{ margin: '4px 0 0', color: '#8b949e', fontSize: '13px' }}>
                    Ontvang bestellingen rechtstreeks van Takeaway.com in uw kassasysteem
                  </p>
                </div>
                <span style={{
                  ...st.statusBadge,
                  background: integrationSettings.takeawayEnabled ? '#3fb95020' : '#8b949e20',
                  color: integrationSettings.takeawayEnabled ? '#3fb950' : '#8b949e',
                  border: `1px solid ${integrationSettings.takeawayEnabled ? '#3fb95040' : '#8b949e40'}`,
                  marginLeft: 'auto',
                }}>
                  {integrationSettings.takeawayEnabled ? '● Actief' : '○ Inactief'}
                </span>
              </div>
            </div>

            {/* Settings */}
            <div style={st.settingsCard}>
              <h3 style={st.cardTitle}>Instellingen</h3>

              <div style={st.formGroup}>
                <label style={st.label}>
                  <input
                    type="checkbox"
                    checked={integrationSettings.takeawayEnabled || false}
                    onChange={e => setIntegrationSettings({ ...integrationSettings, takeawayEnabled: e.target.checked })}
                    style={{ marginRight: '8px' }}
                  />
                  Takeaway.com integratie inschakelen
                </label>
              </div>

              <div style={st.formGroup}>
                <label style={st.label}>Webhook URL (stel dit in bij Takeaway.com)</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input value={webhookUrl} readOnly style={{ ...st.input, flex: 1, color: '#58a6ff' }} />
                  <button onClick={handleTestWebhook} style={st.copyBtn}>📋 Kopieer</button>
                </div>
                <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#8b949e' }}>
                  Configureer deze URL als webhook endpoint in uw Takeaway.com restaurant portaal
                </p>
              </div>

              <div style={st.formGroup}>
                <label style={st.label}>Webhook Secret (optioneel)</label>
                <input
                  value={integrationSettings.takeawayWebhookSecret || ''}
                  onChange={e => setIntegrationSettings({ ...integrationSettings, takeawayWebhookSecret: e.target.value })}
                  style={st.input}
                  placeholder="Gedeelde geheime sleutel voor verificatie"
                  type="password"
                />
                <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#8b949e' }}>
                  Stel ook de omgevingsvariabele TAKEAWAY_WEBHOOK_SECRET in op uw server
                </p>
              </div>

              <div style={st.formGroup}>
                <label style={st.label}>Automatisch accepteren</label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#8b949e', fontSize: '13px' }}>
                  <input
                    type="checkbox"
                    checked={integrationSettings.takeawayAutoAccept || false}
                    onChange={e => setIntegrationSettings({ ...integrationSettings, takeawayAutoAccept: e.target.checked })}
                  />
                  Bestellingen automatisch accepteren (niet aanbevolen)
                </label>
              </div>

              <div style={st.formGroup}>
                <label style={st.label}>Geluidssignaal</label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#8b949e', fontSize: '13px' }}>
                  <input
                    type="checkbox"
                    checked={integrationSettings.takeawaySound !== false}
                    onChange={e => setIntegrationSettings({ ...integrationSettings, takeawaySound: e.target.checked })}
                  />
                  Geluid afspelen bij nieuwe bestelling
                </label>
              </div>

              <button onClick={handleSaveIntegration} disabled={saving} style={st.saveBtn}>
                {saving ? 'Opslaan...' : 'Instellingen Opslaan'}
              </button>
            </div>

            {/* Recent incoming orders */}
            <div style={st.settingsCard}>
              <h3 style={st.cardTitle}>Recente Inkomende Bestellingen</h3>
              {incomingOrders.length === 0 ? (
                <p style={{ color: '#8b949e', fontSize: '13px' }}>Nog geen inkomende bestellingen ontvangen</p>
              ) : (
                <div style={st.tableWrap}>
                  <table style={st.table}>
                    <thead>
                      <tr>
                        <th style={st.th}>Platform</th>
                        <th style={st.th}>Order ID</th>
                        <th style={st.th}>Klant</th>
                        <th style={st.th}>Bedrag</th>
                        <th style={st.th}>Status</th>
                        <th style={st.th}>Tijd</th>
                      </tr>
                    </thead>
                    <tbody>
                      {incomingOrders.slice(0, 20).map(o => (
                        <tr key={o._docId}>
                          <td style={st.td}>
                            <span style={{ padding: '2px 8px', borderRadius: '4px', background: '#FF800020', color: '#FF8000', fontSize: '11px', fontWeight: '600' }}>
                              {o.platform}
                            </span>
                          </td>
                          <td style={st.td}>{o.platformOrderId}</td>
                          <td style={st.td}>{o.customerName || '-'}</td>
                          <td style={st.td}>{formatPrice(o.total || 0)}</td>
                          <td style={st.td}>
                            <span style={{
                              color: o.status === 'accepted' ? '#3fb950' : o.status === 'rejected' ? '#f85149' : '#d29922',
                            }}>
                              {o.status === 'accepted' ? 'Geaccepteerd' : o.status === 'rejected' ? 'Afgewezen' : 'Wachtend'}
                            </span>
                          </td>
                          <td style={st.td}>{o.time || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* How it works */}
            <div style={st.settingsCard}>
              <h3 style={st.cardTitle}>Hoe werkt het?</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[
                  { step: '1', title: 'Webhook configureren', desc: 'Stel de webhook URL in bij Takeaway.com restaurant portaal' },
                  { step: '2', title: 'Bestelling binnenkomt', desc: 'Takeaway.com stuurt een bestelling naar uw POS systeem' },
                  { step: '3', title: 'Melding in Kassa', desc: 'U ziet een melding in de kassa met de bestelling details' },
                  { step: '4', title: 'Accepteren of Weigeren', desc: 'Accepteer de bestelling om deze toe te voegen aan de keuken' },
                  { step: '5', title: 'Bezorging toewijzen', desc: 'Wijs een koerier toe via het bezorgingsscherm' },
                ].map(item => (
                  <div key={item.step} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <div style={{ minWidth: '28px', height: '28px', borderRadius: '50%', background: '#FF800020', color: '#FF8000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 'bold' }}>
                      {item.step}
                    </div>
                    <div>
                      <div style={{ fontWeight: '600', color: '#e6edf3', fontSize: '14px' }}>{item.title}</div>
                      <div style={{ color: '#8b949e', fontSize: '12px', marginTop: '2px' }}>{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ===== ODOO ===== */}
        {tab === 'odoo' && (
          <div>
            {/* Connection status */}
            <div style={st.statusCard}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ fontSize: '40px' }}>📗</div>
                <div>
                  <h3 style={{ margin: 0, color: '#e6edf3', fontSize: '18px' }}>Odoo Boekhouding</h3>
                  <p style={{ margin: '4px 0 0', color: '#8b949e', fontSize: '13px' }}>
                    Synchroniseer bestellingen en facturen automatisch naar Odoo
                  </p>
                </div>
                <span style={{
                  ...st.statusBadge,
                  background: odooSettings.enabled ? '#3fb95020' : '#8b949e20',
                  color: odooSettings.enabled ? '#3fb950' : '#8b949e',
                  border: `1px solid ${odooSettings.enabled ? '#3fb95040' : '#8b949e40'}`,
                  marginLeft: 'auto',
                }}>
                  {odooSettings.enabled ? '● Verbonden' : '○ Niet verbonden'}
                </span>
              </div>
            </div>

            {/* Odoo Settings */}
            <div style={st.settingsCard}>
              <h3 style={st.cardTitle}>Verbinding Instellingen</h3>

              <div style={st.formGroup}>
                <label style={st.label}>
                  <input
                    type="checkbox"
                    checked={odooSettings.enabled || false}
                    onChange={e => setOdooSettings({ ...odooSettings, enabled: e.target.checked })}
                    style={{ marginRight: '8px' }}
                  />
                  Odoo integratie inschakelen
                </label>
              </div>

              <div style={st.formGroup}>
                <label style={st.label}>Odoo Server URL</label>
                <input
                  value={odooSettings.url || ''}
                  onChange={e => setOdooSettings({ ...odooSettings, url: e.target.value })}
                  style={st.input}
                  placeholder="https://uwbedrijf.odoo.com"
                />
              </div>

              <div style={st.formGroup}>
                <label style={st.label}>Database Naam</label>
                <input
                  value={odooSettings.database || ''}
                  onChange={e => setOdooSettings({ ...odooSettings, database: e.target.value })}
                  style={st.input}
                  placeholder="uwbedrijf"
                />
              </div>

              <div style={st.formGroup}>
                <label style={st.label}>Gebruikersnaam / Email</label>
                <input
                  value={odooSettings.username || ''}
                  onChange={e => setOdooSettings({ ...odooSettings, username: e.target.value })}
                  style={st.input}
                  placeholder="admin@uwbedrijf.nl"
                />
              </div>

              <div style={st.formGroup}>
                <label style={st.label}>API Sleutel</label>
                <input
                  value={odooSettings.apiKey || ''}
                  onChange={e => setOdooSettings({ ...odooSettings, apiKey: e.target.value })}
                  style={st.input}
                  placeholder="Odoo API key"
                  type="password"
                />
                <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#8b949e' }}>
                  Ga naar Odoo → Instellingen → Gebruikers → API Sleutels
                </p>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={handleTestOdoo} style={{ ...st.testBtn }}>🔌 Test Verbinding</button>
                <button onClick={handleSaveOdoo} disabled={saving} style={st.saveBtn}>
                  {saving ? 'Opslaan...' : 'Opslaan'}
                </button>
              </div>

              {testResult && (
                <div style={{
                  marginTop: '12px', padding: '12px', borderRadius: '8px',
                  background: testResult.success ? '#3fb95010' : '#f8514910',
                  border: `1px solid ${testResult.success ? '#3fb95030' : '#f8514930'}`,
                  color: testResult.success ? '#3fb950' : '#f85149',
                  fontSize: '13px',
                }}>
                  {testResult.success ? '✅' : '⚠️'} {testResult.message}
                </div>
              )}
            </div>

            {/* Sync settings */}
            <div style={st.settingsCard}>
              <h3 style={st.cardTitle}>Synchronisatie Instellingen</h3>

              <div style={st.formGroup}>
                <label style={st.label}>Wat synchroniseren?</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {[
                    { key: 'syncOrders', label: 'Bestellingen als facturen', desc: 'Elke bestelling wordt een factuur in Odoo' },
                    { key: 'syncDailyReport', label: 'Dagrapport', desc: 'Dagafsluiting als dagelijks journaal' },
                    { key: 'syncExpenses', label: 'Kosten', desc: 'Kosten synchroniseren naar inkoop' },
                    { key: 'syncPayroll', label: 'Loonkosten', desc: 'Personeelsuren en loonkosten' },
                  ].map(item => (
                    <label key={item.key} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', color: '#e6edf3', fontSize: '13px' }}>
                      <input
                        type="checkbox"
                        checked={odooSettings[item.key] || false}
                        onChange={e => setOdooSettings({ ...odooSettings, [item.key]: e.target.checked })}
                        style={{ marginTop: '2px' }}
                      />
                      <div>
                        <div style={{ fontWeight: '500' }}>{item.label}</div>
                        <div style={{ fontSize: '11px', color: '#8b949e' }}>{item.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div style={st.formGroup}>
                <label style={st.label}>Synchronisatie Frequentie</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {['realtime', 'uurlijks', 'dagelijks'].map(f => (
                    <button
                      key={f}
                      onClick={() => setOdooSettings({ ...odooSettings, syncFrequency: f })}
                      style={{
                        ...st.freqBtn,
                        ...(odooSettings.syncFrequency === f ? { background: '#58a6ff20', border: '1px solid #58a6ff', color: '#58a6ff' } : {}),
                      }}
                    >
                      {f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div style={st.formGroup}>
                <label style={st.label}>Odoo Journaal Code</label>
                <input
                  value={odooSettings.journalCode || ''}
                  onChange={e => setOdooSettings({ ...odooSettings, journalCode: e.target.value })}
                  style={st.input}
                  placeholder="POS (standaard)"
                />
              </div>

              <div style={st.formGroup}>
                <label style={st.label}>BTW Rekening</label>
                <input
                  value={odooSettings.taxAccount || ''}
                  onChange={e => setOdooSettings({ ...odooSettings, taxAccount: e.target.value })}
                  style={st.input}
                  placeholder="1500 (standaard)"
                />
              </div>

              <button onClick={handleSaveOdoo} disabled={saving} style={st.saveBtn}>
                {saving ? 'Opslaan...' : 'Instellingen Opslaan'}
              </button>
            </div>

            {/* Mapping */}
            <div style={st.settingsCard}>
              <h3 style={st.cardTitle}>Hoe werkt de Odoo integratie?</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[
                  { from: 'POS Bestelling', to: 'Odoo Factuur', icon: '🧾 → 📄' },
                  { from: 'Dagafsluiting', to: 'Odoo Journaalpost', icon: '📑 → 📊' },
                  { from: 'Kosten', to: 'Odoo Inkoopfactuur', icon: '💸 → 📋' },
                  { from: 'BTW Rapportage', to: 'Odoo BTW Aangifte', icon: '🏛 → 📝' },
                  { from: 'Personeelsuren', to: 'Odoo HR/Payroll', icon: '👥 → 💰' },
                ].map(item => (
                  <div key={item.from} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                    <span style={{ fontSize: '20px', width: '50px', textAlign: 'center' }}>{item.icon}</span>
                    <span style={{ color: '#e6edf3', fontSize: '13px' }}>{item.from}</span>
                    <span style={{ color: '#8b949e', fontSize: '12px' }}>→</span>
                    <span style={{ color: '#58a6ff', fontSize: '13px' }}>{item.to}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ===== SYNC LOG ===== */}
        {tab === 'log' && (
          <div>
            <div style={st.settingsCard}>
              <h3 style={st.cardTitle}>Synchronisatie Logboek</h3>
              {syncLog.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#8b949e' }}>
                  <div style={{ fontSize: '40px', marginBottom: '8px' }}>📋</div>
                  <p>Nog geen synchronisaties uitgevoerd</p>
                </div>
              ) : (
                <div style={st.tableWrap}>
                  <table style={st.table}>
                    <thead>
                      <tr>
                        <th style={st.th}>Datum</th>
                        <th style={st.th}>Tijd</th>
                        <th style={st.th}>Type</th>
                        <th style={st.th}>Status</th>
                        <th style={st.th}>Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {syncLog.map(entry => (
                        <tr key={entry._docId}>
                          <td style={st.td}>{entry.date}</td>
                          <td style={st.td}>{entry.time}</td>
                          <td style={st.td}>
                            <span style={{ padding: '2px 8px', borderRadius: '4px', background: '#58a6ff15', color: '#58a6ff', fontSize: '11px' }}>
                              {entry.type}
                            </span>
                          </td>
                          <td style={st.td}>
                            <span style={{ color: entry.status === 'success' ? '#3fb950' : entry.status === 'error' ? '#f85149' : '#d29922' }}>
                              {entry.status === 'success' ? '✅ Geslaagd' : entry.status === 'error' ? '❌ Fout' : '⏳ Bezig'}
                            </span>
                          </td>
                          <td style={{ ...st.td, maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {entry.message || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const st = {
  container: { minHeight: '100vh', background: '#0d1117', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', color: '#e6edf3' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid #21262d', flexWrap: 'wrap', gap: '12px' },
  backBtn: { padding: '8px 14px', border: '1px solid #30363d', borderRadius: '8px', background: 'transparent', color: '#8b949e', cursor: 'pointer', fontSize: '13px' },
  title: { margin: 0, fontSize: '22px', fontWeight: 'bold', color: '#e6edf3' },
  subtitle: { margin: '2px 0 0', fontSize: '12px', color: '#8b949e' },

  tabs: { display: 'flex', gap: '4px', padding: '12px 24px', borderBottom: '1px solid #21262d', overflowX: 'auto' },
  tab: { padding: '8px 16px', border: 'none', borderRadius: '8px', background: 'transparent', color: '#8b949e', cursor: 'pointer', fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap' },
  tabActive: { background: '#21262d', color: '#e6edf3' },

  content: { padding: '20px 24px', maxWidth: '900px', margin: '0 auto', width: '100%', boxSizing: 'border-box' },

  statusCard: { background: '#161b22', border: '1px solid #21262d', borderRadius: '12px', padding: '20px', marginBottom: '16px' },
  statusBadge: { padding: '4px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap' },

  settingsCard: { background: '#161b22', border: '1px solid #21262d', borderRadius: '12px', padding: '20px', marginBottom: '16px' },
  cardTitle: { margin: '0 0 16px', color: '#e6edf3', fontSize: '16px', fontWeight: '600' },

  formGroup: { marginBottom: '16px' },
  label: { display: 'block', fontSize: '13px', color: '#8b949e', marginBottom: '6px', fontWeight: '500' },
  input: { width: '100%', padding: '8px 12px', border: '1px solid #30363d', borderRadius: '8px', background: '#0d1117', color: '#e6edf3', fontSize: '14px', boxSizing: 'border-box' },

  copyBtn: { padding: '8px 14px', border: '1px solid #30363d', borderRadius: '8px', background: '#21262d', color: '#e6edf3', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap' },
  saveBtn: { padding: '10px 20px', border: 'none', borderRadius: '8px', background: '#238636', color: '#fff', cursor: 'pointer', fontSize: '14px', fontWeight: '600' },
  testBtn: { padding: '10px 20px', border: '1px solid #58a6ff', borderRadius: '8px', background: '#58a6ff15', color: '#58a6ff', cursor: 'pointer', fontSize: '14px', fontWeight: '600' },
  freqBtn: { flex: 1, padding: '8px', border: '1px solid #30363d', borderRadius: '8px', background: 'transparent', color: '#8b949e', cursor: 'pointer', fontSize: '13px', textAlign: 'center' },

  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '13px' },
  th: { padding: '8px 12px', textAlign: 'left', color: '#8b949e', borderBottom: '1px solid #21262d', fontWeight: '600', fontSize: '11px', textTransform: 'uppercase' },
  td: { padding: '8px 12px', borderBottom: '1px solid #161b22', color: '#e6edf3' },
};
