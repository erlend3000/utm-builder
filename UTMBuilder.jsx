import React, { useEffect, useMemo, useState, useRef } from "react";
// Utils duplicated in utils.js for tests; keep local for now but could import.
import { buildUTM, normalizeDomain, normalizePage, normalizeToken } from "./src/utils.js";

const STORAGE_KEY = "utm_builder_presets_v2"; // bumped for domain-specific pages
const HISTORY_KEY = "utm_builder_history_v1";
const MAX_HISTORY = 25;

const defaultDomainPages = {
  "https://portal.wewillwrite.com": [
    "/",
    "/search",
    "/content",
    "/history",
    "/classes",
    "/settings/account",
    "/settings/billing",
    "/settings/security",
    "/settings/privacy",
    "/settings/billing?upgrade"
  ].map(p => p.replace(/\/$/, "") || "/"),
  "https://wewillwrite.com": [
    "/",
    "/pricing",
    "/learning",
    "/about",
    "/blog",
    "/faq",
    "/privacy"
  ].map(p => p.replace(/\/$/, "") || "/")
};

const defaultPresets = {
  domains: Object.keys(defaultDomainPages),
  domainPages: defaultDomainPages, // map domain -> pages
  campaigns: [
    "back_to_school",
    "fall_promo",
    "holiday_promo",
    "new_year_kickoff",
    "spring_promo",
    "year_end_review",
    "summer_learning"
  ],
  sources: [
    "wewillwrite",
    "facebook",
    "x",
    "bluesky",
    "linkedin",
    "instagram",
    "tiktok",
    "youtube"
  ],
  mediums: [
    "social",
    "email",
    "blog",
    "webinar",
    "video"
  ],
};

// Parse a user-entered string that might be a full URL; return { domain, page }
function parseDomainAndPage(raw) {
  if (!raw) return { domain: "", page: "/" };
  let input = raw.trim();
  if (!/^https?:\/\//i.test(input)) input = "https://" + input;
  try {
    const u = new URL(input);
    const origin = u.origin; // strip any path from domain
    const pathWithQuery = (u.pathname || "/") + (u.search || "");
    return { domain: normalizeDomain(origin), page: normalizePage(pathWithQuery) };
  } catch {
    return { domain: normalizeDomain(raw), page: "/" };
  }
}

// normalizeToken now imported

function loadPresets() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultPresets;
    const parsed = JSON.parse(raw);
    // Migration support: if old schema without domainPages but pages exists
    if (!parsed.domainPages && parsed.pages) {
      const domainPages = {};
      (parsed.domains || defaultPresets.domains).forEach(d => {
        domainPages[d] = [...parsed.pages];
      });
      parsed.domainPages = domainPages;
    }
    const mergedDomainPages = { ...parsed.domainPages };
    Object.entries(defaultDomainPages).forEach(([dom, pages]) => {
      mergedDomainPages[dom] = uniq([...(mergedDomainPages[dom] || []), ...pages].map(normalizePage));
    });
    return {
      domains: uniq([...(parsed.domains || []), ...defaultPresets.domains]),
      domainPages: mergedDomainPages,
      campaigns: uniq([...(parsed.campaigns || []), ...defaultPresets.campaigns].map(normalizeToken)),
      sources: uniq([...(parsed.sources || []), ...defaultPresets.sources].map(normalizeToken)),
      mediums: uniq([...(parsed.mediums || []), ...defaultPresets.mediums].map(normalizeToken)),
    };
  } catch {
    return defaultPresets;
  }
}

function savePresets(presets) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
}

function loadHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function saveHistory(items) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(items.slice(0, MAX_HISTORY)));
}

function uniq(arr) {
  return Array.from(new Set(arr.filter(Boolean)));
}

function classNames(...xs) {
  return xs.filter(Boolean).join(" ");
}

// normalizeDomain imported

// normalizePage imported

// joinUrl handled inside buildUTM util

// buildUTM imported

function PresetChips({ items, selected, onSelect, label, renderLabel }) {
  // Keyboard roving focus state (index of selected or first)
  const currentIndex = Math.max(0, items.findIndex(i => i === selected));
  function onKey(e) {
    if (!['ArrowRight','ArrowLeft','ArrowDown','ArrowUp','Home','End',' '].includes(e.key)) return;
    e.preventDefault();
    if (e.key === ' '){ onSelect(items[currentIndex]); return; }
    let nextIndex = currentIndex;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') nextIndex = (currentIndex + 1) % items.length;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') nextIndex = (currentIndex - 1 + items.length) % items.length;
    if (e.key === 'Home') nextIndex = 0;
    if (e.key === 'End') nextIndex = items.length - 1;
    onSelect(items[nextIndex]);
  }
  return (
    <div
      role="radiogroup"
      aria-label={label || 'Presets'}
      className="flex flex-wrap gap-2"
      onKeyDown={onKey}
    >
      {items.map((v, i) => {
        const checked = v === selected;
        return (
          <button
            key={v}
            role="radio"
            aria-checked={checked}
            tabIndex={checked ? 0 : -1}
            type="button"
            onClick={() => onSelect(v)}
            className={classNames(
              "px-3 py-1.5 rounded-2xl text-sm border transition focus:outline-none focus-visible:ring-2 focus-visible:ring-black/40",
              checked
                ? "border-[#CA297D] bg-[#CA297D] text-white shadow"
                : "border-black/10 bg-black/5 text-black/70 hover:bg-black/10"
            )}
          >
            {renderLabel ? renderLabel(v) : v}
          </button>
        );
      })}
    </div>
  );
}

function AddPreset({ placeholder, onAdd, validator, buttonLabel = "Add" }) {
  const [value, setValue] = useState("");
  const cleanValue = (value || "").trim();
  const disabled = !cleanValue;
  function handle() {
    if (disabled) return;
    const clean = validator ? validator(cleanValue) : cleanValue;
    onAdd(clean);
    setValue("");
  }
  return (
    <div className="flex gap-2 mt-3">
      <input
        className="flex-1 rounded-xl border border-black/10 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black/20 bg-white"
        placeholder={placeholder}
  aria-label={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handle()}
      />
      <button
        type="button"
        onClick={handle}
        disabled={disabled}
        className={classNames(
          "rounded-xl px-4 py-2 border text-sm font-medium transition",
          disabled
            ? "border-black/10 bg-black/5 text-black/30 cursor-not-allowed"
            : "border-black bg-black text-white hover:opacity-90"
        )}
      >
        {buttonLabel}
      </button>
    </div>
  );
}

function StepCard({ step, title, children, complete, id, refObj }) {
  const headingId = id ? `${id}-heading` : undefined;
  return (
    <section
      aria-labelledby={headingId}
  className="rounded-3xl border border-black/10 bg-white p-5 shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-black/40"
      data-step={step}
  tabIndex={-1}
  ref={refObj}
    >
      <div className="flex items-center gap-3 mb-3">
        <div
          className={classNames(
            "h-8 w-8 shrink-0 grid place-items-center rounded-full text-sm font-semibold",
            complete ? "bg-black text-white" : "bg-black/5 text-black"
          )}
          aria-hidden="true"
        >
          {step}
        </div>
        <h2 id={headingId} className="text-lg font-semibold">
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

function isLikelyValidDomainFormat(domain) {
  if (!domain) return false;
  try {
    const u = new URL(normalizeDomain(domain));
    if (!/\./.test(u.hostname)) return false;
    if (/localhost|\.local$/.test(u.hostname)) return false;
    return true;
  } catch {
    return false;
  }
}

// Debounced & cached domain check
const domainCheckCache = new Map();
let domainCheckTimer = null;
function checkDomainReachableOnce(domain) {
  const norm = normalizeDomain(domain);
  if (domainCheckCache.has(norm)) return domainCheckCache.get(norm);
  const p = new Promise(resolve => {
    clearTimeout(domainCheckTimer);
    domainCheckTimer = setTimeout(async () => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000);
        await fetch(norm, { method: 'HEAD', mode: 'no-cors', signal: controller.signal });
        clearTimeout(timeout);
        domainCheckCache.set(norm, Promise.resolve(true));
        resolve(true);
      } catch {
        domainCheckCache.set(norm, Promise.resolve(false));
        resolve(false);
      }
    }, 300); // debounce
  });
  domainCheckCache.set(norm, p);
  return p;
}

export default function UTMBuilder() {
  const stepRefs = {
    1: useRef(null),
    2: useRef(null),
    3: useRef(null),
    4: useRef(null),
    5: useRef(null),
    6: useRef(null),
  };
  const [presets, setPresets] = useState(defaultPresets);
  const [domain, setDomain] = useState(presets.domains[0] || "");
  const initialDomain = normalizeDomain(presets.domains[0] || "");
  const [page, setPage] = useState((presets.domainPages[initialDomain] && presets.domainPages[initialDomain][0]) || "/");
  const [campaign, setCampaign] = useState(presets.campaigns[0] || "");
  const [source, setSource] = useState(presets.sources[0] || "");
  const [medium, setMedium] = useState(presets.mediums[0] || "");
  const [term, setTerm] = useState("");
  const [content, setContent] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [toast, setToast] = useState("");
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [domainValid, setDomainValid] = useState(true);
  const [domainChecking, setDomainChecking] = useState(false);
  const [domainReachable, setDomainReachable] = useState(null); // null=unknown, true/false
  const [domainPresetError, setDomainPresetError] = useState("");

  useEffect(() => {
    const p = loadPresets();
    setPresets(p);
  const firstDomain = normalizeDomain(p.domains[0] || "");
  setDomain(firstDomain);
  const firstPage = (p.domainPages[firstDomain] && p.domainPages[firstDomain][0]) || "/";
  setPage(firstPage);
    setCampaign(p.campaigns[0] || "");
    setSource(p.sources[0] || "");
    setMedium(p.mediums[0] || "");
    setHistory(loadHistory());
  }, []);

  function updatePresets(section, value) {
    // For domains: ensure domainPages entry exists
    if (section === 'domains') {
      const norm = normalizeDomain(value);
      const next = { ...presets };
      next.domains = uniq([norm, ...presets.domains]);
      if (!next.domainPages[norm]) next.domainPages[norm] = ["/"];
      setPresets(next);
      savePresets(next);
      return;
    }
    const next = { ...presets, [section]: uniq([value, ...(presets[section] || [])]) };
    setPresets(next);
    savePresets(next);
  }

  function addPageForCurrentDomain(newPage) {
    const d = normalizeDomain(domain);
    const normPage = normalizePage(newPage);
    setPresets(prev => {
      const domainPages = { ...prev.domainPages, [d]: uniq([normPage, ...(prev.domainPages[d] || [])]) };
      const next = { ...prev, domainPages };
      savePresets(next);
      return next;
    });
    setPage(normPage);
  }

  function addPageForDomain(d, newPage) {
    const dom = normalizeDomain(d);
    const normPage = normalizePage(newPage);
    setPresets(prev => {
      const domainPages = { ...prev.domainPages, [dom]: uniq([normPage, ...(prev.domainPages[dom] || [])]) };
      const next = { ...prev, domainPages };
      if (!next.domains.includes(dom)) next.domains = [dom, ...next.domains];
      savePresets(next);
      return next;
    });
  }

  function resetPagesForCurrentDomain() {
    const d = normalizeDomain(domain);
    setPresets(prev => {
      const domainPages = { ...prev.domainPages };
      if (defaultDomainPages[d]) {
        domainPages[d] = [...defaultDomainPages[d]];
      } else {
        domainPages[d] = ["/"];
      }
      const next = { ...prev, domainPages };
      savePresets(next);
      setPage(domainPages[d][0] || "/");
      return next;
    });
  }

  function pushHistory() {
    const entry = {
      id: Date.now(),
      url: finalURL,
      ts: new Date().toISOString(),
      domain,
      page,
      campaign,
      source,
      medium,
      term: term || null,
      content: content || null,
    };
    setHistory(prev => {
      const filtered = prev.filter(h => h.url !== entry.url);
      const next = [entry, ...filtered];
      saveHistory(next);
      return next;
    });
  }

  function reuse(entry) {
    setDomain(entry.domain);
    setPage(entry.page);
    setCampaign(entry.campaign);
    setSource(entry.source);
    setMedium(entry.medium);
    setTerm(entry.term || "");
    setContent(entry.content || "");
    window.scrollTo({ top: 0, behavior: 'smooth' });
    // Focus first step after short delay
    setTimeout(() => {
      stepRefs[1].current?.focus();
    }, 250);
  }

  function clearHistory() {
    if (history.length === 0) return;
    setHistory([]);
    try { localStorage.removeItem(HISTORY_KEY); } catch {}
    saveHistory([]);
    if (showHistory) setShowHistory(false);
    setToast('History cleared');
    setTimeout(()=>setToast(''),1500);
  }

  useEffect(() => {
    if (/^https?:\/\//i.test(page)) {
      try {
        const u = new URL(page);
        const inferredDomain = normalizeDomain(u.origin + (u.pathname !== "/" ? u.pathname : ""));
        const inferredPath = u.pathname || "/";
        setDomain(inferredDomain);
        setPage(inferredPath);
        updatePresets("domains", inferredDomain);
        addPageForCurrentDomain(inferredPath);
      } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  // Adjust page list when domain changes
  useEffect(() => {
    const d = normalizeDomain(domain);
    const pagesForDomain = presets.domainPages[d];
    if (pagesForDomain && pagesForDomain.length) {
      if (!pagesForDomain.includes(page)) {
        setPage(pagesForDomain[0]);
      }
    } else {
      // create entry with root page
      setPresets(prev => {
        if (prev.domainPages[d]) return prev;
        const domainPages = { ...prev.domainPages, [d]: ["/"] };
        const next = { ...prev, domainPages };
        savePresets(next);
        return next;
      });
      setPage("/");
    }
  }, [domain]);

  useEffect(() => {
    // Syntaktisk validering først
    const okFormat = isLikelyValidDomainFormat(domain);
    setDomainValid(okFormat);
    setDomainReachable(null);
    if (!okFormat) return;

    // Asynkron HEAD-sjekk for å sjekke at domenet svarer
    let cancelled = false;
    (async () => {
      setDomainChecking(true);
      try {
        // HEAD mot root (ignorere path for eksistens)
        const url = normalizeDomain(domain);
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const res = await fetch(url, { method: 'HEAD', mode: 'no-cors', signal: controller.signal });
        clearTimeout(timeout);
        if (!cancelled) {
          // no-cors gir opaque response – tolker det som suksess så lenge ikke exception
          setDomainReachable(true);
        }
      } catch {
        if (!cancelled) setDomainReachable(false);
      } finally {
        if (!cancelled) setDomainChecking(false);
      }
    })();
    return () => { cancelled = true; };
  }, [domain]);

  const finalURL = useMemo(
    () => buildUTM({ domain, page, campaign, source, medium, term, content }),
    [domain, page, campaign, source, medium, term, content]
  );

  function copy() {
    function success(msg){
      setToast(msg);
      pushHistory();
      setTimeout(() => setToast(""), 2000);
    }
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(finalURL)
  .then(()=>success("Copied to clipboard!"))
        .catch(()=>fallback());
    } else fallback();
    function fallback(){
      try {
        const ta = document.createElement('textarea');
        ta.value = finalURL;
        ta.style.position='fixed';
        ta.style.top='-1000px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
  success('Copied (fallback).');
      } catch {
  setToast('Could not copy. Select and copy manually.');
        pushHistory();
        setTimeout(()=>setToast(''),2500);
      }
    }
  }

  function resetDomainsToDefaults() {
    setPresets(prev => {
      const next = { ...prev, domains: [...defaultPresets.domains] };
      savePresets(next);
      setDomain(next.domains[0] || "");
      return next;
    });
  }
  // old resetPagesToDefaults removed in favor of resetPagesForCurrentDomain
  function resetCampaignsToDefaults() {
    setPresets(prev => {
      const next = { ...prev, campaigns: [...defaultPresets.campaigns] };
      savePresets(next);
      setCampaign(next.campaigns[0] || "");
      return next;
    });
  }
  function resetSourcesToDefaults() {
    setPresets(prev => {
      const next = { ...prev, sources: [...defaultPresets.sources] };
      savePresets(next);
      setSource(next.sources[0] || "");
      return next;
    });
  }
  function resetMediumsToDefaults() {
    setPresets(prev => {
      const next = { ...prev, mediums: [...defaultPresets.mediums] };
      savePresets(next);
      setMedium(next.mediums[0] || "");
      return next;
    });
  }

  const requiredComplete = domain && page && campaign && source && medium;
  const canCopy = requiredComplete && domainValid && (domainReachable !== false);

  // Global keyboard shortcuts Alt+1..6 to focus steps
  useEffect(() => {
    function handler(e) {
      if (!e.altKey) return;
      const num = parseInt(e.key, 10);
      if (num >=1 && num <=6) {
        const ref = stepRefs[num];
        if (ref?.current) {
          e.preventDefault();
            ref.current.focus();
        }
      }
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className={`min-h-screen bg-[#f5f5f5] text-black`}>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 bg-black text-white px-3 py-2 rounded">Skip to main content</a>
      <div className="mx-auto max-w-3xl p-6 md:p-10">
        <header className="mb-6" role="banner">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">UTM Builder</h1>
          <p className="text-black/60 mt-1">Build UTM tagged URLs quickly.</p>
        </header>
        <main id="main" className="grid gap-4" role="main">
          <StepCard id="step-domain" step={1} title="Choose domain" complete={!!domain && domainValid} refObj={stepRefs[1]}>
            <div className="flex items-start gap-3 flex-wrap w-full">
              <PresetChips
                label="Domains"
                items={presets.domains}
                selected={domain}
                onSelect={(v) => setDomain(v)}
                renderLabel={(v) => v.replace(/^https?:\/\//, "")}
              />
              {presets.domains.some(d => !defaultPresets.domains.includes(d)) && (
                <button
                  type="button"
                  onClick={resetDomainsToDefaults}
                  className="text-xs underline text-black/60 hover:text-black/80 ml-auto"
                >Reset domains</button>
              )}
            </div>
            <AddPreset
              placeholder="e.g. join.wewillwrite.com or full URL"
              buttonLabel="Add domain"
              validator={normalizeDomain}
              onAdd={async (v) => {
                const { domain: newDomain, page: extractedPage } = parseDomainAndPage(v);
                if (!isLikelyValidDomainFormat(newDomain)) {
                  setDomainPresetError("Invalid domain – not saved.");
                  return;
                }
                setDomainPresetError("");
                const reachable = await checkDomainReachableOnce(newDomain);
                if (!reachable) {
                  setDomainPresetError("Domain does not exist – not saved.");
                  return;
                }
                const domainExists = presets.domains.includes(newDomain);
                if (!domainExists) updatePresets("domains", newDomain);
                setDomain(newDomain);
                if (extractedPage && extractedPage !== "/") {
                  addPageForDomain(newDomain, extractedPage);
                  setPage(extractedPage);
                }
              }}
            />
            <div className="mt-2 text-xs flex flex-col gap-1 min-h-[1.25rem]" aria-live="polite" id="domain-status-region">
              <div className="flex items-center gap-2 flex-wrap">
                {!domain && <span className="text-black/50">Domain missing.</span>}
                {domain && !domainValid && <span className="text-red-700">Invalid domain format.</span>}
                {domain && domainValid && domainReachable === false && !domainChecking && (
                  <span className="text-red-700">Domain does not exist.</span>
                )}
              </div>
              {domainPresetError && <span className="text-red-700">{domainPresetError}</span>}
            </div>
          </StepCard>
          <StepCard id="step-page" step={2} title="Choose landing page" complete={!!page} refObj={stepRefs[2]}>
            <div className="flex items-start gap-3 flex-wrap w-full">
              {(() => {
                const dNorm = normalizeDomain(domain);
                const pagesFor = (presets.domainPages[dNorm] || []);
                const defaults = defaultDomainPages[dNorm] || ["/"];
                const showReset = pagesFor.some(p => !defaults.includes(p));
                return (
                  <>
                    <PresetChips label="Pages" items={pagesFor} selected={page} onSelect={(v) => setPage(v)} />
                    {showReset && (
                      <button
                        type="button"
                        onClick={resetPagesForCurrentDomain}
                        className="text-xs underline text-black/60 hover:text-black/80 ml-auto"
                      >Reset pages</button>
                    )}
                  </>
                );
              })()}
            </div>
            <AddPreset
              placeholder="e.g. /onboarding or full URL"
              buttonLabel="Add page"
              validator={normalizePage}
              onAdd={(v) => {
                addPageForCurrentDomain(v);
              }}
            />
          </StepCard>
          <StepCard id="step-campaign" step={3} title="Choose campaign" complete={!!campaign} refObj={stepRefs[3]}>
            <div className="flex items-start gap-3 flex-wrap w-full">
              <PresetChips label="Campaigns" items={presets.campaigns} selected={campaign} onSelect={(v) => setCampaign(v)} />
              {presets.campaigns.some(c => !defaultPresets.campaigns.includes(c)) && (
                <button
                  type="button"
                  onClick={resetCampaignsToDefaults}
                  className="text-xs underline text-black/60 hover:text-black/80 ml-auto"
                >Reset campaigns</button>
              )}
            </div>
            <AddPreset
              placeholder="e.g. new_animals_launch, small_classes_feature"
              buttonLabel="Add campaign"
              validator={normalizeToken}
              onAdd={(v) => {
                updatePresets("campaigns", v);
                setCampaign(v);
              }}
            />
          </StepCard>
          <StepCard id="step-source" step={4} title="Choose source" complete={!!source} refObj={stepRefs[4]}>
            <div className="flex items-start gap-3 flex-wrap w-full">
              <PresetChips label="Sources" items={presets.sources} selected={source} onSelect={(v) => setSource(v)} />
              {presets.sources.some(s => !defaultPresets.sources.includes(s)) && (
                <button
                  type="button"
                  onClick={resetSourcesToDefaults}
                  className="text-xs underline text-black/60 hover:text-black/80 ml-auto"
                >Reset sources</button>
              )}
            </div>
            <AddPreset
              placeholder="e.g. iste, reddit, edutopia, book_creator, shannon_miller"
              buttonLabel="Add source"
              validator={normalizeToken}
              onAdd={(v) => {
                updatePresets("sources", v);
                setSource(v);
              }}
            />
          </StepCard>
          <StepCard id="step-medium" step={5} title="Choose medium" complete={!!medium} refObj={stepRefs[5]}>
            <div className="flex items-start gap-3 flex-wrap w-full">
              <PresetChips label="Mediums" items={presets.mediums} selected={medium} onSelect={(v) => setMedium(v)} />
              {presets.mediums.some(m => !defaultPresets.mediums.includes(m)) && (
                <button
                  type="button"
                  onClick={resetMediumsToDefaults}
                  className="text-xs underline text-black/60 hover:text-black/80 ml-auto"
                >Reset mediums</button>
              )}
            </div>
            <AddPreset
              placeholder="e.g. chat, print, pdf, survey, presentation"
              buttonLabel="Add medium"
              validator={normalizeToken}
              onAdd={(v) => {
                updatePresets("mediums", v);
                setMedium(v);
              }}
            />
          </StepCard>
          <div className="rounded-3xl border border-black/10 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 shrink-0 grid place-items-center rounded-full text-sm font-semibold bg-black/5 text-black">A</div>
                <h3 className="text-lg font-semibold">Advanced parameters (optional)</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAdvanced(s => !s)}
                className="text-sm underline hover:opacity-80"
                aria-expanded={showAdvanced}
                aria-controls="advanced-params-section"
              >
                {showAdvanced ? "Hide" : "Show"}
              </button>
            </div>
            {showAdvanced && (
              <div id="advanced-params-section" className="space-y-4">
                <div>
                  <label className="block text-xs font-medium mb-1 uppercase tracking-wide text-black/60">
                    utm_term
                  </label>
                  <input
                    value={term}
                    onChange={e => setTerm(normalizeToken(e.target.value))}
                    placeholder="Keyword or variant (optional)"
                    className="w-full rounded-xl border border-black/10 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black/20 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1 uppercase tracking-wide text-black/60">
                    utm_content
                  </label>
                  <input
                    value={content}
                    onChange={e => setContent(normalizeToken(e.target.value))}
                    placeholder="Ad creative / variation (optional)"
                    className="w-full rounded-xl border border-black/10 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black/20 bg-white"
                  />
                </div>
                {(term || content) && (
                  <p className="text-xs text-black/50">{[term && "utm_term", content && "utm_content"].filter(Boolean).join(" and ")} will be included.</p>
                )}
              </div>
            )}
          </div>
          <StepCard id="step-finish" step={6} title="Done!" complete={true} refObj={stepRefs[6]}>
            <div className="space-y-3">
              <div className="rounded-2xl border border-black/10 bg-white p-4">
                <div className="text-xs uppercase tracking-wide text-black/50">Generated URL</div>
                <div className="mt-1 break-all font-mono text-sm">{finalURL}</div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={copy}
                  className={classNames(
                    "rounded-xl px-4 py-2 border text-sm font-medium transition",
                    canCopy
                      ? "border-[#CA297D] bg-[#CA297D] text-white hover:opacity-90"
                      : "border-black/10 bg-black/5 text-black/30 cursor-not-allowed"
                  )}
                  disabled={!canCopy}
                >
                  {canCopy ? "Copy to clipboard" : "Fill required fields"}
                </button>
                <a
                  href={finalURL}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl px-4 py-2 border border-black/10 bg-white hover:bg-black/5 text-sm"
                >
                  Open in new tab
                </a>
              </div>
              <p className="text-xs text-black/50">
                Tip: Paste a full URL in step 2 to auto split domain/path.
              </p>
            </div>
          </StepCard>
      <section className="rounded-3xl border border-black/10 bg-white p-5 shadow-sm" aria-labelledby="history-heading">
            <div className="flex items-center justify-between mb-4">
        <h2 id="history-heading" className="text-lg font-semibold flex items-center gap-2">History
                <span className="text-xs font-normal text-black/50">({history.length})</span>
        </h2>
              <div className="flex items-center gap-3">
                {history.length > 0 && (
                  <button
                    type="button"
                    onClick={clearHistory}
                    disabled={history.length===0}
                    className={classNames(
                      "text-xs underline hover:text-black/80",
                      history.length===0 ? "text-black/30 cursor-not-allowed" : "text-black/60"
                    )}
                  >Clear all</button>
                )}
                <button
                  type="button"
                  onClick={() => setShowHistory(s => !s)}
                  className="text-xs underline text-black/60 hover:text-black/80"
                  aria-expanded={showHistory}
                  aria-controls="history-list"
                >{showHistory ? 'Hide' : 'Show'}</button>
              </div>
            </div>
            {showHistory && (
              history.length === 0 ? (
                <p className="text-sm text-black/50" id="history-list">No links yet. Copy a URL to store it here.</p>
              ) : (
                <ul id="history-list" className="space-y-3 max-h-72 overflow-auto pr-1">
                  {history.map(h => (
                    <li key={h.id} className="group border border-black/10 rounded-xl p-3 bg-white/60 hover:bg-white transition">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                        <div className="text-xs font-medium text-black/60">
                          {new Date(h.ts).toLocaleString('en-US', { hour12: false })}
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => navigator.clipboard.writeText(h.url)}
                            className="text-xs underline text-black/60 hover:text-black"
                          >Copy</button>
                          <button
                            type="button"
                            onClick={() => reuse(h)}
                            className="text-xs underline text-black/60 hover:text-black"
                          >Use</button>
                          <a
                            href={h.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs underline text-black/60 hover:text-black"
                          >Open</a>
                        </div>
                      </div>
                      <div className="text-[11px] font-mono break-all leading-snug">
                        {h.url}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {[['source', h.source], ['medium', h.medium], ['campaign', h.campaign], ['term', h.term], ['content', h.content]].filter(([,v]) => v).map(([k,v]) => (
                          <span key={k} className="text-[10px] px-2 py-0.5 rounded-full bg-black/5 text-black/70 border border-black/10">{k}:{v}</span>
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
              )
            )}
          </section>
        </main>
        <div aria-live="polite" className="fixed bottom-4 left-1/2 -translate-x-1/2">
          {toast && (
            <div className="rounded-xl bg-black text-white px-4 py-2 shadow-lg" role="status">{toast}</div>
          )}
        </div>
      </div>
    </div>
  );
}
